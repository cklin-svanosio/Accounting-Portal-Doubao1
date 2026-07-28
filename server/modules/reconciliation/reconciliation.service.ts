import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  and,
  count,
  isNull,
  desc,
  sql,
  sum,
} from 'drizzle-orm';
import {
  reconciliation,
  payment,
  document,
  auditLog,
} from '@server/database/schema';
import type {
  Reconciliation,
  ReconciliationStatus,
  MatchType,
  ReconciliationSummary,
  PaginatedResponse,
  Payment,
  Document,
} from '@shared/api.interface';

interface ReconciliationListParams {
  page?: number;
  pageSize?: number;
  status?: ReconciliationStatus;
  projectId?: string;
  matchType?: MatchType;
}

@Injectable()
export class ReconciliationService {
  private readonly logger = new Logger(ReconciliationService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────

  private mapReconciliation(row: Record<string, unknown>): Reconciliation {
    return {
      id: row.id as string,
      paymentId: row.paymentId as string,
      documentId: row.documentId as string,
      matchedAmount: Number(row.matchedAmount),
      matchType: row.matchType as MatchType,
      status: row.status as ReconciliationStatus,
      followUpDate: row.followUpDate ? String(row.followUpDate) : undefined,
      followUpNotes: (row.followUpNotes as string) ?? undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private mapPayment(row: Record<string, unknown>): Payment {
    return {
      id: row.id as string,
      paymentNumber: row.paymentNumber as string,
      projectId: (row.projectId as string) ?? undefined,
      documentId: (row.documentId as string) ?? undefined,
      vendor: row.vendor as string,
      amount: Number(row.amount),
      currency: row.currency as string,
      exchangeRate: row.exchangeRate != null ? Number(row.exchangeRate) : undefined,
      hkdEquivalent: row.hkdEquivalent != null ? Number(row.hkdEquivalent) : undefined,
      status: row.status as Payment['status'],
      paymentMethod: (row.paymentMethod as string) ?? undefined,
      dueDate: row.dueDate ? String(row.dueDate) : undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private mapDocument(row: Record<string, unknown>): Document {
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as Document['type'],
      fileUrl: row.fileUrl as string,
      fileSize: Number(row.fileSize ?? 0),
      invoiceNumber: (row.invoiceNumber as string) ?? undefined,
      amount: row.amount != null ? Number(row.amount) : undefined,
      currency: (row.currency as string) ?? undefined,
      exchangeRate: row.exchangeRate != null ? Number(row.exchangeRate) : undefined,
      vendor: (row.vendor as string) ?? undefined,
      invoiceDate: row.invoiceDate ? String(row.invoiceDate) : undefined,
      projectId: (row.projectId as string) ?? undefined,
      status: row.status as Document['status'],
      extractionConfidence:
        row.extractionConfidence != null ? Number(row.extractionConfidence) : undefined,
      version: Number(row.version ?? 1),
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private async writeAuditLog(
    tx: PostgresJsDatabase,
    entityType: string,
    entityId: string,
    action: 'create' | 'update' | 'delete',
    fieldChanges?: Record<string, { before: unknown; after: unknown }>,
  ) {
    await tx.insert(auditLog).values({
      entityType,
      entityId,
      action,
      fieldChanges: fieldChanges ?? undefined,
    });
  }

  // ─── Summary ───────────────────────────────────────────────────────

  async getSummary(): Promise<ReconciliationSummary> {
    const matchedResult = await this.db
      .select({ total: sum(payment.hkdEquivalent) })
      .from(reconciliation)
      .innerJoin(payment, eq(reconciliation.paymentId, payment.id))
      .where(eq(reconciliation.status, 'matched'));

    const matchedAmount = Number(matchedResult[0]?.total ?? 0);

    const [partialResult, underReviewResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(reconciliation)
        .where(eq(reconciliation.status, 'partial')),
      this.db
        .select({ count: count() })
        .from(reconciliation)
        .where(eq(reconciliation.status, 'under-review')),
    ]);

    // Unmatched = payments without reconciliation + documents without reconciliation
    const [unmatchedPaymentsResult, unmatchedDocumentsResult] = await Promise.all([
      this.db
        .select({ count: count() })
        .from(payment)
        .leftJoin(reconciliation, eq(payment.id, reconciliation.paymentId))
        .where(
          and(
            isNull(reconciliation.id),
            sql`${payment.status} IN ('approved', 'processed')`,
          ),
        ),
      this.db
        .select({ count: count() })
        .from(document)
        .leftJoin(reconciliation, eq(document.id, reconciliation.documentId))
        .where(
          and(
            isNull(reconciliation.id),
            eq(document.status, 'approved'),
            eq(document.type, 'invoice'),
          ),
        ),
    ]);

    const unmatchedCount =
      Number(unmatchedPaymentsResult[0]?.count ?? 0) +
      Number(unmatchedDocumentsResult[0]?.count ?? 0);

    return {
      matchedAmount,
      matchedCurrency: 'HKD',
      partialCount: Number(partialResult[0]?.count ?? 0),
      unmatchedCount,
      underReviewCount: Number(underReviewResult[0]?.count ?? 0),
    };
  }

  // ─── List ──────────────────────────────────────────────────────────

  async getReconciliations(
    params: ReconciliationListParams,
  ): Promise<
    PaginatedResponse<Reconciliation & { paymentNumber?: string; invoiceNumber?: string; vendor?: string }>
  > {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.status) conditions.push(eq(reconciliation.status, params.status));
    if (params.matchType) conditions.push(eq(reconciliation.matchType, params.matchType));
    if (params.projectId) {
      conditions.push(
        sql`(
          ${payment.projectId} = ${params.projectId}
          OR ${document.projectId} = ${params.projectId}
        )`,
      );
    }

    const baseQuery = this.db
      .select({
        reconciliation,
        paymentNumber: payment.paymentNumber,
        invoiceNumber: document.invoiceNumber,
        vendor: payment.vendor,
      })
      .from(reconciliation)
      .innerJoin(payment, eq(reconciliation.paymentId, payment.id))
      .innerJoin(document, eq(reconciliation.documentId, document.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [rows, countResult] = await Promise.all([
      baseQuery.orderBy(desc(reconciliation.createdAt)).limit(pageSize).offset(offset),
      this.db
        .select({ count: count() })
        .from(reconciliation)
        .innerJoin(payment, eq(reconciliation.paymentId, payment.id))
        .innerJoin(document, eq(reconciliation.documentId, document.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items = rows.map((row) => ({
      ...this.mapReconciliation(row.reconciliation as Record<string, unknown>),
      paymentNumber: row.paymentNumber ?? undefined,
      invoiceNumber: row.invoiceNumber ?? undefined,
      vendor: row.vendor ?? undefined,
    }));

    return { items, total, page, pageSize };
  }

  // ─── Match ─────────────────────────────────────────────────────────

  async matchPaymentToDocument(
    paymentId: string,
    documentId: string,
    matchedAmount: number,
    matchType: MatchType,
    userId: string,
  ): Promise<Reconciliation> {
    if (!paymentId || !documentId) {
      throw new BadRequestException('paymentId and documentId are required');
    }
    if (matchedAmount == null || matchedAmount <= 0) {
      throw new BadRequestException('matchedAmount must be a positive number');
    }

    const [paymentRows, docRows] = await Promise.all([
      this.db.select().from(payment).where(eq(payment.id, paymentId)).limit(1),
      this.db.select().from(document).where(eq(document.id, documentId)).limit(1),
    ]);

    if (paymentRows.length === 0) {
      throw new BadRequestException(`Payment ${paymentId} not found`);
    }
    if (docRows.length === 0) {
      throw new BadRequestException(`Document ${documentId} not found`);
    }

    const status: ReconciliationStatus = matchType === 'full' ? 'matched' : 'partial';

    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(reconciliation)
        .values({
          paymentId,
          documentId,
          matchedAmount: String(matchedAmount),
          matchType,
          status,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error('Failed to create reconciliation');

      const record = this.mapReconciliation(row);

      await this.writeAuditLog(tx, 'reconciliation', record.id, 'create', {
        reconciliation: { before: null, after: record },
      });

      this.logger.log(
        `Reconciliation created: ${record.id} (payment=${paymentId}, document=${documentId})`,
      );
      return record;
    });
  }

  // ─── Unmatch ───────────────────────────────────────────────────────

  async unmatch(reconciliationId: string, userId: string): Promise<{ success: boolean }> {
    const existing = await this.db
      .select()
      .from(reconciliation)
      .where(eq(reconciliation.id, reconciliationId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Reconciliation ${reconciliationId} not found`);
    }

    const record = this.mapReconciliation(existing[0]);

    await this.db.transaction(async (tx) => {
      await this.writeAuditLog(tx, 'reconciliation', reconciliationId, 'delete', {
        reconciliation: { before: record, after: null },
      });

      const deleted = await tx
        .delete(reconciliation)
        .where(eq(reconciliation.id, reconciliationId))
        .returning({ id: reconciliation.id });

      if (deleted.length === 0) {
        throw new NotFoundException(`Reconciliation ${reconciliationId} not found`);
      }
    });

    this.logger.log(`Reconciliation unmatched: ${reconciliationId}`);
    return { success: true };
  }

  // ─── Follow-up ─────────────────────────────────────────────────────

  async setFollowUp(
    id: string,
    followUpDate: string,
    followUpNotes: string | undefined,
    userId: string,
  ): Promise<Reconciliation> {
    const existing = await this.db
      .select()
      .from(reconciliation)
      .where(eq(reconciliation.id, id))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Reconciliation ${id} not found`);
    }

    const prev = this.mapReconciliation(existing[0]);

    const updated = await this.db.transaction(async (tx) => {
      const result = await tx
        .update(reconciliation)
        .set({
          followUpDate: followUpDate ?? null,
          followUpNotes: followUpNotes ?? null,
        })
        .where(eq(reconciliation.id, id))
        .returning();

      const row = result[0];
      if (!row) throw new NotFoundException(`Reconciliation ${id} not found`);

      const record = this.mapReconciliation(row);

      const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};
      if (prev.followUpDate !== record.followUpDate) {
        fieldChanges.followUpDate = {
          before: prev.followUpDate ?? null,
          after: record.followUpDate ?? null,
        };
      }
      if ((prev.followUpNotes ?? '') !== (record.followUpNotes ?? '')) {
        fieldChanges.followUpNotes = {
          before: prev.followUpNotes ?? null,
          after: record.followUpNotes ?? null,
        };
      }

      if (Object.keys(fieldChanges).length > 0) {
        await this.writeAuditLog(tx, 'reconciliation', id, 'update', fieldChanges);
      }

      return record;
    });

    this.logger.log(`Reconciliation follow-up set: ${id}`);
    return updated;
  }

  // ─── Unmatched Payments ────────────────────────────────────────────

  async getUnmatchedPayments(projectId?: string): Promise<{ items: Payment[] }> {
    const reconciledPaymentIds = this.db
      .select({ paymentId: reconciliation.paymentId })
      .from(reconciliation);

    const conditions = [
      sql`${payment.id} NOT IN (${reconciledPaymentIds})`,
      sql`${payment.status} IN ('approved', 'processed')`,
    ];

    if (projectId) {
      conditions.push(eq(payment.projectId, projectId));
    }

    const rows = await this.db
      .select()
      .from(payment)
      .where(and(...conditions))
      .orderBy(desc(payment.createdAt));

    const items: Payment[] = rows.map((row) => this.mapPayment(row));
    return { items };
  }

  // ─── Unmatched Documents ───────────────────────────────────────────

  async getUnmatchedDocuments(projectId?: string): Promise<{ items: Document[] }> {
    const reconciledDocIds = this.db
      .select({ documentId: reconciliation.documentId })
      .from(reconciliation);

    const conditions = [
      sql`${document.id} NOT IN (${reconciledDocIds})`,
      eq(document.status, 'approved'),
      eq(document.type, 'invoice'),
    ];

    if (projectId) {
      conditions.push(eq(document.projectId, projectId));
    }

    const rows = await this.db
      .select()
      .from(document)
      .where(and(...conditions))
      .orderBy(desc(document.createdAt));

    const items: Document[] = rows.map((row) => this.mapDocument(row));
    return { items };
  }
}
