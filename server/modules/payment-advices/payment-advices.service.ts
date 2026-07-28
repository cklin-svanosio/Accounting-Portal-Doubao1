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
  gte,
  lte,
  like,
  or,
  desc,
} from 'drizzle-orm';
import {
  paymentAdvice,
  payment,
  document,
  project,
  template,
  auditLog,
} from '@server/database/schema';
import type {
  PaymentAdvice,
  PaymentAdviceStatus,
  PaymentAdviceListParams,
  PaymentAdviceDetail,
  GenerateAdviceRequest,
  UpdatePaymentAdviceRequest,
  PaginatedResponse,
  Payment,
  Document,
  Project,
  Template,
} from '@shared/api.interface';

@Injectable()
export class PaymentAdvicesService {
  private readonly logger = new Logger(PaymentAdvicesService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ─── Mappers ────────────────────────────────────────────────────────

  private mapAdvice(row: Record<string, unknown>): PaymentAdvice {
    return {
      id: row.id as string,
      adviceNumber: row.adviceNumber as string,
      paymentId: row.paymentId as string,
      templateId: (row.templateId as string) ?? undefined,
      content: (row.content as Record<string, unknown>) ?? undefined,
      status: row.status as PaymentAdviceStatus,
      fileUrl: (row.fileUrl as string) ?? undefined,
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
      approvalComments: (row.approvalComments as string) ?? undefined,
      approvedBy: (row.approvedBy as string) ?? undefined,
      approvedAt: row.approvedAt ? new Date(row.approvedAt as string).toISOString() : undefined,
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

  private mapProject(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string) ?? undefined,
      budget: Number(row.budget),
      currency: row.currency as string,
      status: row.status as Project['status'],
      startDate: row.startDate ? String(row.startDate) : undefined,
      endDate: row.endDate ? String(row.endDate) : undefined,
      responsiblePerson: (row.responsiblePerson as string) ?? undefined,
      contractDocumentId: (row.contractDocumentId as string) ?? undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private mapTemplate(row: Record<string, unknown>): Template {
    return {
      id: row.id as string,
      name: row.name as string,
      type: row.type as Template['type'],
      fieldMapping: (row.fieldMapping as Record<string, unknown>) ?? {},
      isDefault: Boolean(row.isDefault),
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private async generateAdviceNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const prefix = `ADV-${datePart}-`;

    const result = await this.db
      .select({ count: count() })
      .from(paymentAdvice)
      .where(like(paymentAdvice.adviceNumber, `${prefix}%`));

    const seq = Number(result[0]?.count ?? 0) + 1;
    const seqStr = String(seq).padStart(4, '0');
    return `${prefix}${seqStr}`;
  }

  private buildAdviceContent(
    pay: Payment,
    doc?: Document,
    proj?: Project,
    tmpl?: Template,
  ): Record<string, unknown> {
    const content: Record<string, unknown> = {
      adviceNumber: '',
      paymentNumber: pay.paymentNumber,
      vendor: pay.vendor,
      amount: pay.amount,
      currency: pay.currency,
      exchangeRate: pay.exchangeRate ?? null,
      hkdEquivalent: pay.hkdEquivalent ?? null,
      paymentMethod: pay.paymentMethod ?? null,
      dueDate: pay.dueDate ?? null,
      paymentStatus: pay.status,
    };

    if (doc) {
      content.invoiceNumber = doc.invoiceNumber ?? null;
      content.invoiceDate = doc.invoiceDate ?? null;
      content.documentName = doc.name;
    }

    if (proj) {
      content.projectCode = proj.code;
      content.projectName = proj.name;
      content.projectBudget = proj.budget;
      content.projectCurrency = proj.currency;
    }

    if (tmpl) {
      content.templateName = tmpl.name;
      content.templateType = tmpl.type;
      content.fieldMapping = tmpl.fieldMapping;
    }

    return content;
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

  private buildFilterConditions(params: PaymentAdviceListParams) {
    const conditions = [];
    if (params.status) conditions.push(eq(paymentAdvice.status, params.status));
    if (params.projectId) {
      conditions.push(eq(payment.projectId, params.projectId));
    }
    if (params.startDate) {
      conditions.push(gte(paymentAdvice.createdAt, new Date(params.startDate)));
    }
    if (params.endDate) {
      conditions.push(lte(paymentAdvice.createdAt, new Date(params.endDate)));
    }
    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(
          like(paymentAdvice.adviceNumber, searchPattern),
          like(payment.paymentNumber, searchPattern),
          like(payment.vendor, searchPattern),
        ),
      );
    }
    return conditions;
  }

  // ─── List & Detail ──────────────────────────────────────────────────

  async getPaymentAdvices(
    params: PaymentAdviceListParams,
  ): Promise<PaginatedResponse<PaymentAdvice>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = this.buildFilterConditions(params);
    const hasJoin = params.projectId != null || params.search != null;

    const baseQuery = hasJoin
      ? this.db
          .select()
          .from(paymentAdvice)
          .leftJoin(payment, eq(paymentAdvice.paymentId, payment.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
      : this.db
          .select()
          .from(paymentAdvice)
          .where(conditions.length > 0 ? and(...conditions) : undefined);

    const [rows, countResult] = await Promise.all([
      baseQuery.orderBy(desc(paymentAdvice.createdAt)).limit(pageSize).offset(offset),
      hasJoin
        ? this.db
            .select({ count: count() })
            .from(paymentAdvice)
            .leftJoin(payment, eq(paymentAdvice.paymentId, payment.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
        : this.db
            .select({ count: count() })
            .from(paymentAdvice)
            .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: PaymentAdvice[] = rows.map((row) => {
      const adviceRow = hasJoin
        ? (row as Record<string, unknown>).payment_advice
        : row;
      return this.mapAdvice(adviceRow as Record<string, unknown>);
    });

    return { items, total, page, pageSize };
  }

  async getPaymentAdviceById(id: string): Promise<PaymentAdviceDetail> {
    const rows = await this.db
      .select()
      .from(paymentAdvice)
      .leftJoin(payment, eq(paymentAdvice.paymentId, payment.id))
      .leftJoin(document, eq(payment.documentId, document.id))
      .leftJoin(project, eq(payment.projectId, project.id))
      .leftJoin(template, eq(paymentAdvice.templateId, template.id))
      .where(eq(paymentAdvice.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Payment advice ${id} not found`);
    }

    const row = rows[0] as Record<string, unknown>;
    const advice = this.mapAdvice(row.payment_advice as Record<string, unknown>);
    const detail: PaymentAdviceDetail = { ...advice };

    if (row.payment) {
      detail.payment = this.mapPayment(row.payment as Record<string, unknown>);
    }
    if (row.document) {
      detail.document = this.mapDocument(row.document as Record<string, unknown>);
    }
    if (row.project) {
      detail.project = this.mapProject(row.project as Record<string, unknown>);
    }
    if (row.template) {
      detail.template = this.mapTemplate(row.template as Record<string, unknown>);
    }

    return detail;
  }

  // ─── Generate ───────────────────────────────────────────────────────

  async generateAdvice(
    data: GenerateAdviceRequest,
    userId: string,
  ): Promise<PaymentAdvice> {
    if (!data.paymentId) {
      throw new BadRequestException('paymentId is required');
    }

    // Fetch payment
    const payRows = await this.db
      .select()
      .from(payment)
      .where(eq(payment.id, data.paymentId))
      .limit(1);
    if (payRows.length === 0) {
      throw new BadRequestException(`Payment ${data.paymentId} not found`);
    }
    const pay = this.mapPayment(payRows[0]);

    // Fetch related document
    let doc: Document | undefined;
    if (pay.documentId) {
      const docRows = await this.db
        .select()
        .from(document)
        .where(eq(document.id, pay.documentId))
        .limit(1);
      if (docRows.length > 0) {
        doc = this.mapDocument(docRows[0]);
      }
    }

    // Fetch related project
    let proj: Project | undefined;
    if (pay.projectId) {
      const projRows = await this.db
        .select()
        .from(project)
        .where(eq(project.id, pay.projectId))
        .limit(1);
      if (projRows.length > 0) {
        proj = this.mapProject(projRows[0]);
      }
    }

    // Fetch template
    let tmpl: Template | undefined;
    if (data.templateId) {
      const tmplRows = await this.db
        .select()
        .from(template)
        .where(eq(template.id, data.templateId))
        .limit(1);
      if (tmplRows.length === 0) {
        throw new BadRequestException(`Template ${data.templateId} not found`);
      }
      tmpl = this.mapTemplate(tmplRows[0]);
    } else {
      // Use default template for payment-advice type
      const defaultRows = await this.db
        .select()
        .from(template)
        .where(and(eq(template.type, 'payment-advice'), eq(template.isDefault, true)))
        .limit(1);
      if (defaultRows.length > 0) {
        tmpl = this.mapTemplate(defaultRows[0]);
      }
    }

    const adviceNumber = await this.generateAdviceNumber();
    const content = this.buildAdviceContent(pay, doc, proj, tmpl);
    content.adviceNumber = adviceNumber;

    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(paymentAdvice)
        .values({
          adviceNumber,
          paymentId: data.paymentId,
          templateId: tmpl?.id ?? null,
          content,
          status: 'draft',
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error('Failed to generate payment advice');

      const created = this.mapAdvice(row);

      await this.writeAuditLog(tx, 'payment_advice', created.id, 'create', {
        advice: { before: null, after: created },
      });

      this.logger.log(`Payment advice generated: ${created.id} (${adviceNumber})`);
      return created;
    });
  }

  // ─── Update ─────────────────────────────────────────────────────────

  async updatePaymentAdvice(
    id: string,
    data: UpdatePaymentAdviceRequest,
    userId: string,
  ): Promise<PaymentAdvice> {
    const existing = await this.getPaymentAdviceById(id);

    const updates: Record<string, unknown> = {};
    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};

    if (data.content !== undefined) {
      updates.content = data.content;
      fieldChanges.content = {
        before: existing.content ?? null,
        after: data.content,
      };
    }
    if (data.status !== undefined) {
      updates.status = data.status;
      fieldChanges.status = { before: existing.status, after: data.status };
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(paymentAdvice)
        .set(updates)
        .where(eq(paymentAdvice.id, id))
        .returning();

      const row = updated[0];
      if (!row) throw new NotFoundException(`Payment advice ${id} not found`);

      await this.writeAuditLog(tx, 'payment_advice', id, 'update', fieldChanges);

      this.logger.log(`Payment advice updated: ${id}`);
      return this.mapAdvice(row);
    });
  }

  // ─── Finalize ───────────────────────────────────────────────────────

  async finalizeAdvice(id: string, userId: string): Promise<PaymentAdvice> {
    const existing = await this.getPaymentAdviceById(id);

    if (existing.status === 'finalized') {
      return existing;
    }

    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(paymentAdvice)
        .set({ status: 'finalized' })
        .where(eq(paymentAdvice.id, id))
        .returning();

      const row = updated[0];
      if (!row) throw new NotFoundException(`Payment advice ${id} not found`);

      await this.writeAuditLog(tx, 'payment_advice', id, 'update', {
        status: { before: existing.status, after: 'finalized' },
      });

      this.logger.log(`Payment advice finalized: ${id}`);
      return this.mapAdvice(row);
    });
  }

  // ─── Delete ─────────────────────────────────────────────────────────

  async deletePaymentAdvice(id: string, userId: string): Promise<void> {
    await this.getPaymentAdviceById(id);

    await this.db.transaction(async (tx) => {
      await this.writeAuditLog(tx, 'payment_advice', id, 'delete');
      const deleted = await tx
        .delete(paymentAdvice)
        .where(eq(paymentAdvice.id, id))
        .returning({ id: paymentAdvice.id });
      if (deleted.length === 0) {
        throw new NotFoundException(`Payment advice ${id} not found`);
      }
    });

    this.logger.log(`Payment advice deleted: ${id}`);
  }

  // ─── List helpers for frontend dropdowns ────────────────────────────

  async getPaymentsForDropdown(): Promise<Array<{ id: string; paymentNumber: string; vendor: string; amount: number; currency: string }>> {
    const rows = await this.db
      .select({
        id: payment.id,
        paymentNumber: payment.paymentNumber,
        vendor: payment.vendor,
        amount: payment.amount,
        currency: payment.currency,
      })
      .from(payment)
      .orderBy(desc(payment.createdAt))
      .limit(50);

    return rows.map((r) => ({
      id: r.id as string,
      paymentNumber: r.paymentNumber as string,
      vendor: r.vendor as string,
      amount: Number(r.amount),
      currency: r.currency as string,
    }));
  }

  async getTemplatesForDropdown(): Promise<Array<{ id: string; name: string; isDefault: boolean }>> {
    const rows = await this.db
      .select({
        id: template.id,
        name: template.name,
        isDefault: template.isDefault,
      })
      .from(template)
      .where(eq(template.type, 'payment-advice'))
      .orderBy(template.name);

    return rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      isDefault: Boolean(r.isDefault),
    }));
  }
}
