import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { CapabilityService } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, count, gte, lte, like, or, desc, sql } from 'drizzle-orm';
import {
  document,
  documentVersion,
  exceptionRecord,
  auditLog,
} from '@server/database/schema';
import type {
  Document,
  DocumentStatus,
  DocumentType,
  DocumentListParams,
  DocumentVersion,
  DuplicateCheckResult,
  ExtractedInvoiceFields,
  PaginatedResponse,
} from '@shared/api.interface';
import type {
  AiDocParserOutput,
  AiTextToJsonOutput,
} from '@shared/plugin-types';

interface CreateDocumentWithExtractionInput {
  name: string;
  type: DocumentType;
  fileUrl: string;
  fileSize: number;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
    private readonly capabilityService: CapabilityService,
  ) {}

  /**
   * Extract structured invoice data from a document file.
   * Chain: ai-doc-parser (file -> text) -> ai-text-to-json (text -> fields)
   */
  async extractDocumentData(fileUrl: string): Promise<ExtractedInvoiceFields> {
    this.logger.log(`Extracting document data from: ${fileUrl}`);

    // Step 1: Parse document file to markdown text
    const parseRaw = await this.capabilityService
      .load('ai-doc-parser')
      .call('parseDocToMarkdown', {
        invoice_file: [fileUrl],
      });
    const parseResult = parseRaw as AiDocParserOutput;

    const parsedText: string = parseResult.content;
    this.logger.log(
      `Document parsed successfully, text length: ${parsedText.length}`,
    );

    // Step 2: Extract structured fields from text
    const extractionRaw = await this.capabilityService
      .load('ai_text_to_json_invoice_extraction_1')
      .call('textToJson', {
        invoice_text: parsedText,
      });
    const extractionResult = extractionRaw as AiTextToJsonOutput;

    this.logger.log(
      `Fields extracted: invoiceNumber=${extractionResult.invoiceNumber}, ` +
        `amount=${extractionResult.amount}, vendor=${extractionResult.vendor}`,
    );

    return {
      invoiceNumber: extractionResult.invoiceNumber,
      amount: extractionResult.amount,
      currency: extractionResult.currency,
      exchangeRate: extractionResult.exchangeRate,
      vendor: extractionResult.vendor,
      invoiceDate: extractionResult.invoiceDate,
      projectCode: extractionResult.projectCode,
    };
  }

  /**
   * Check if an invoice number already exists in the document table.
   */
  async checkDuplicate(invoiceNumber: string): Promise<DuplicateCheckResult> {
    if (!invoiceNumber) {
      return { isDuplicate: false };
    }

    const existingDocs = await this.db
      .select({ id: document.id, invoiceNumber: document.invoiceNumber })
      .from(document)
      .where(eq(document.invoiceNumber, invoiceNumber))
      .limit(1);

    if (existingDocs.length > 0) {
      const existing = existingDocs[0];
      return {
        isDuplicate: true,
        duplicateDocumentId: existing.id,
        duplicateInvoiceNumber: existing.invoiceNumber ?? undefined,
      };
    }

    return { isDuplicate: false };
  }

  /**
   * Create a document with AI extraction and duplicate detection.
   * - Runs the extraction chain
   * - Checks for duplicate invoice number
   * - Saves with appropriate status (duplicate / pending-review)
   * - Creates a document_version record
   * - Creates an exception_record if duplicate
   */
  async createDocumentWithExtraction(
    fileData: CreateDocumentWithExtractionInput,
    userId: string,
  ): Promise<{ document: Document; isDuplicate: boolean }> {
    // Step 1: Extract data from the document
    const extracted = await this.extractDocumentData(fileData.fileUrl);

    // Step 2: Check for duplicate invoice number
    const duplicateCheck = await this.checkDuplicate(extracted.invoiceNumber);

    const status: DocumentStatus = duplicateCheck.isDuplicate
      ? 'duplicate'
      : 'pending-review';

    return this.db.transaction(async (tx) => {
      // Step 3: Insert the document
      const insertedDocs = await tx
        .insert(document)
        .values({
          name: fileData.name,
          type: fileData.type,
          fileUrl: fileData.fileUrl,
          fileSize: fileData.fileSize,
          invoiceNumber: extracted.invoiceNumber || null,
          amount: extracted.amount ? String(extracted.amount) : null,
          currency: extracted.currency || null,
          exchangeRate: extracted.exchangeRate
            ? String(extracted.exchangeRate)
            : null,
          vendor: extracted.vendor || null,
          invoiceDate: extracted.invoiceDate || null,
          status,
          version: 1,
        })
        .returning();

      const insertedDoc = insertedDocs[0];
      if (!insertedDoc) {
        throw new Error('Failed to insert document');
      }

      // Step 4: Create document_version record
      await tx.insert(documentVersion).values({
        documentId: insertedDoc.id,
        version: 1,
        changeSummary: 'Initial document creation with AI extraction',
        changedFields: {
          extraction: {
            before: null,
            after: extracted,
          },
        },
      });

      // Step 5: If duplicate, create exception_record
      if (duplicateCheck.isDuplicate) {
        await tx.insert(exceptionRecord).values({
          category: 'duplicate',
          severity: 'high',
          entityType: 'document',
          entityId: insertedDoc.id,
          title: `Duplicate invoice: ${extracted.invoiceNumber}`,
          description:
            `Invoice number "${extracted.invoiceNumber}" already exists ` +
            `in document ${duplicateCheck.duplicateDocumentId}. ` +
            `New document has been marked as duplicate.`,
          status: 'open',
        });
        this.logger.warn(
          `Duplicate invoice detected: ${extracted.invoiceNumber}. ` +
            `New document ID: ${insertedDoc.id}, ` +
            `Existing document ID: ${duplicateCheck.duplicateDocumentId}`,
        );
      }

      this.logger.log(
        `Document created: ${insertedDoc.id}, status: ${status}`,
      );

      return {
        document: this.mapDocument(insertedDoc),
        isDuplicate: duplicateCheck.isDuplicate,
      };
    });
  }

  /**
   * List documents with pagination and filters.
   */
  async getDocuments(
    params: DocumentListParams,
  ): Promise<PaginatedResponse<Document>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = this.buildFilterConditions(params);

    const baseQuery =
      conditions.length > 0
        ? this.db
            .select()
            .from(document)
            .where(and(...conditions))
        : this.db.select().from(document);

    const [rows, countResult] = await Promise.all([
      baseQuery
        .orderBy(desc(document.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(document)
        .where(
          conditions.length > 0
            ? and(...conditions)
            : undefined,
        ),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: Document[] = rows.map((row) => this.mapDocument(row));

    return { items, total, page, pageSize };
  }

  /**
   * Get a single document by ID.
   */
  async getDocumentById(id: string): Promise<Document> {
    const rows = await this.db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Document ${id} not found`);
    }

    return this.mapDocument(rows[0]);
  }

  /**
   * Review a document: approve, reject (needs-correction), or correct.
   * Creates a version record and audit log entry.
   */
  async reviewDocument(
    id: string,
    action: 'approve' | 'reject' | 'correct',
    fields: Partial<Document> | undefined,
    userId: string,
  ): Promise<Document> {
    const existing = await this.getDocumentById(id);

    let newStatus: DocumentStatus;
    const updates: Record<string, unknown> = {};

    if (action === 'approve') {
      newStatus = 'approved';
    } else if (action === 'reject') {
      newStatus = 'needs-correction';
    } else if (action === 'correct') {
      newStatus = 'pending-review';
      if (fields) {
        if (fields.name !== undefined) updates.name = fields.name;
        if (fields.type !== undefined) updates.type = fields.type;
        if (fields.invoiceNumber !== undefined)
          updates.invoiceNumber = fields.invoiceNumber;
        if (fields.amount !== undefined)
          updates.amount = String(fields.amount);
        if (fields.currency !== undefined) updates.currency = fields.currency;
        if (fields.exchangeRate !== undefined)
          updates.exchangeRate = String(fields.exchangeRate);
        if (fields.vendor !== undefined) updates.vendor = fields.vendor;
        if (fields.invoiceDate !== undefined)
          updates.invoiceDate = fields.invoiceDate;
        if (fields.projectId !== undefined)
          updates.projectId = fields.projectId;
      }
    } else {
      throw new BadRequestException(`Invalid action: ${action}`);
    }

    updates.status = newStatus;
    updates.version = existing.version + 1;

    const changedFields = this.computeChangedFields(
      existing,
      updates,
    );

    const result = await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(document)
        .set(updates)
        .where(eq(document.id, id))
        .returning();

      if (updatedRows.length === 0) {
        throw new NotFoundException(`Document ${id} not found`);
      }

      const changeSummary = this.buildReviewSummary(action, newStatus);

      await tx.insert(documentVersion).values({
        documentId: id,
        version: existing.version + 1,
        changeSummary,
        changedFields: changedFields as Record<string, unknown>,
      });

      await tx.insert(auditLog).values({
        entityType: 'document',
        entityId: id,
        action: 'update',
        fieldChanges: changedFields as Record<string, unknown>,
      });

      return this.mapDocument(updatedRows[0]);
    });

    this.logger.log(
      `Document ${id} reviewed: action=${action}, newStatus=${newStatus}`,
    );

    return result;
  }

  /**
   * List all versions for a document.
   */
  async getDocumentVersions(
    documentId: string,
  ): Promise<{ items: DocumentVersion[] }> {
    // Verify document exists
    await this.getDocumentById(documentId);

    const rows = await this.db
      .select()
      .from(documentVersion)
      .where(eq(documentVersion.documentId, documentId))
      .orderBy(desc(documentVersion.version));

    const items: DocumentVersion[] = rows.map((row) => ({
      id: row.id,
      documentId: row.documentId,
      version: row.version,
      changeSummary: row.changeSummary ?? undefined,
      changedFields:
        (row.changedFields as Record<string, { before: unknown; after: unknown }>) ??
        undefined,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
    }));

    return { items };
  }

  /**
   * Update document metadata. Creates a version record and audit log.
   */
  async updateDocument(
    id: string,
    updates: Partial<Document>,
    userId: string,
  ): Promise<Document> {
    const existing = await this.getDocumentById(id);

    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.invoiceNumber !== undefined)
      dbUpdates.invoiceNumber = updates.invoiceNumber;
    if (updates.amount !== undefined)
      dbUpdates.amount = String(updates.amount);
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.exchangeRate !== undefined)
      dbUpdates.exchangeRate = String(updates.exchangeRate);
    if (updates.vendor !== undefined) dbUpdates.vendor = updates.vendor;
    if (updates.invoiceDate !== undefined)
      dbUpdates.invoiceDate = updates.invoiceDate;
    if (updates.projectId !== undefined)
      dbUpdates.projectId = updates.projectId;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    if (Object.keys(dbUpdates).length === 0) {
      return existing;
    }

    dbUpdates.version = existing.version + 1;

    const changedFields = this.computeChangedFields(existing, dbUpdates);

    const result = await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(document)
        .set(dbUpdates)
        .where(eq(document.id, id))
        .returning();

      if (updatedRows.length === 0) {
        throw new NotFoundException(`Document ${id} not found`);
      }

      await tx.insert(documentVersion).values({
        documentId: id,
        version: existing.version + 1,
        changeSummary: 'Document metadata updated',
        changedFields: changedFields as Record<string, unknown>,
      });

      await tx.insert(auditLog).values({
        entityType: 'document',
        entityId: id,
        action: 'update',
        fieldChanges: changedFields as Record<string, unknown>,
      });

      return this.mapDocument(updatedRows[0]);
    });

    this.logger.log(`Document ${id} updated`);
    return result;
  }

  /**
   * Soft delete a document by setting status to 'archived'.
   */
  async deleteDocument(id: string, userId: string): Promise<void> {
    const existing = await this.getDocumentById(id);

    const changedFields = {
      status: { before: existing.status, after: 'archived' },
    };

    await this.db.transaction(async (tx) => {
      const updatedRows = await tx
        .update(document)
        .set({
          status: 'archived',
          version: existing.version + 1,
        })
        .where(eq(document.id, id))
        .returning({ id: document.id });

      if (updatedRows.length === 0) {
        throw new NotFoundException(`Document ${id} not found`);
      }

      await tx.insert(documentVersion).values({
        documentId: id,
        version: existing.version + 1,
        changeSummary: 'Document archived (soft delete)',
        changedFields: changedFields as Record<string, unknown>,
      });

      await tx.insert(auditLog).values({
        entityType: 'document',
        entityId: id,
        action: 'delete',
        fieldChanges: changedFields as Record<string, unknown>,
      });
    });

    this.logger.log(`Document ${id} archived`);
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  private buildFilterConditions(params: DocumentListParams) {
    const conditions = [];

    // Exclude archived by default unless explicitly requested
    if (params.status) {
      conditions.push(eq(document.status, params.status));
    } else {
      conditions.push(sql`${document.status} != 'archived'`);
    }

    if (params.type) {
      conditions.push(eq(document.type, params.type));
    }
    if (params.projectId) {
      conditions.push(eq(document.projectId, params.projectId));
    }
    if (params.vendor) {
      conditions.push(like(document.vendor, `%${params.vendor}%`));
    }
    if (params.minAmount !== undefined) {
      conditions.push(
        gte(document.amount, String(params.minAmount)),
      );
    }
    if (params.maxAmount !== undefined) {
      conditions.push(
        lte(document.amount, String(params.maxAmount)),
      );
    }
    if (params.startDate) {
      conditions.push(gte(document.invoiceDate, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(document.invoiceDate, params.endDate));
    }
    if (params.search) {
      const searchTerm = `%${params.search}%`;
      conditions.push(
        or(
          like(document.name, searchTerm),
          like(document.invoiceNumber, searchTerm),
          like(document.vendor, searchTerm),
        ),
      );
    }

    return conditions;
  }

  private computeChangedFields(
    existing: Document,
    updates: Record<string, unknown>,
  ): Record<string, { before: unknown; after: unknown }> {
    const changed: Record<string, { before: unknown; after: unknown }> = {};

    const fieldMap: Array<[string, keyof Document]> = [
      ['name', 'name'],
      ['type', 'type'],
      ['invoiceNumber', 'invoiceNumber'],
      ['amount', 'amount'],
      ['currency', 'currency'],
      ['exchangeRate', 'exchangeRate'],
      ['vendor', 'vendor'],
      ['invoiceDate', 'invoiceDate'],
      ['projectId', 'projectId'],
      ['status', 'status'],
    ];

    for (const [dbKey, docKey] of fieldMap) {
      if (dbKey in updates) {
        changed[dbKey] = {
          before: existing[docKey],
          after: updates[dbKey],
        };
      }
    }

    return changed;
  }

  private buildReviewSummary(
    action: 'approve' | 'reject' | 'correct',
    newStatus: DocumentStatus,
  ): string {
    if (action === 'approve') return 'Document approved';
    if (action === 'reject') return 'Document rejected - needs correction';
    if (action === 'correct')
      return `Corrections applied, status set to ${newStatus}`;
    return 'Document reviewed';
  }

  private mapDocument(row: typeof document.$inferSelect): Document {
    return {
      id: row.id,
      name: row.name,
      type: row.type as DocumentType,
      fileUrl: row.fileUrl,
      fileSize: row.fileSize,
      invoiceNumber: row.invoiceNumber ?? undefined,
      amount: row.amount ? Number(row.amount) : undefined,
      currency: row.currency ?? undefined,
      exchangeRate: row.exchangeRate
        ? Number(row.exchangeRate)
        : undefined,
      vendor: row.vendor ?? undefined,
      invoiceDate: row.invoiceDate ?? undefined,
      projectId: row.projectId ?? undefined,
      status: row.status as DocumentStatus,
      extractionConfidence: row.extractionConfidence
        ? Number(row.extractionConfidence)
        : undefined,
      version: row.version,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy ?? undefined,
    };
  }
}
