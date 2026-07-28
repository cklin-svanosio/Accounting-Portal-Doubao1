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
  sql,
} from 'drizzle-orm';
import {
  payment,
  swopBreakdown,
  loanSchedule,
  auditLog,
  document,
  project,
} from '@server/database/schema';
import type {
  Payment,
  PaymentStatus,
  PaymentListParams,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  PaginatedResponse,
  SwopBreakdown,
  CreateSwopBreakdownRequest,
  LoanSchedule,
  LoanScheduleStatus,
  CreateLoanScheduleRequest,
  UpdateLoanScheduleRequest,
} from '@shared/api.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ─── Helpers ───────────────────────────────────────────────────────

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
      status: row.status as PaymentStatus,
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

  private mapSwopBreakdown(row: Record<string, unknown>): SwopBreakdown {
    return {
      id: row.id as string,
      paymentId: (row.paymentId as string) ?? undefined,
      projectId: (row.projectId as string) ?? undefined,
      fromCurrency: row.fromCurrency as string,
      toCurrency: row.toCurrency as string,
      fromAmount: Number(row.fromAmount),
      toAmount: Number(row.toAmount),
      exchangeRate: Number(row.exchangeRate),
      tradeDate: row.tradeDate ? String(row.tradeDate) : undefined,
      referenceNumber: (row.referenceNumber as string) ?? undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private mapLoanSchedule(row: Record<string, unknown>): LoanSchedule {
    return {
      id: row.id as string,
      projectId: (row.projectId as string) ?? undefined,
      lender: row.lender as string,
      principalAmount: Number(row.principalAmount),
      currency: row.currency as string,
      interestRate: Number(row.interestRate),
      totalInstallments: Number(row.totalInstallments),
      startDate: row.startDate ? String(row.startDate) : undefined,
      nextPaymentDate: row.nextPaymentDate ? String(row.nextPaymentDate) : undefined,
      nextPaymentAmount: row.nextPaymentAmount != null ? Number(row.nextPaymentAmount) : undefined,
      status: row.status as LoanScheduleStatus,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
      updatedAt: new Date(row.updatedAt as string).toISOString(),
      updatedBy: (row.updatedBy as string) ?? undefined,
    };
  }

  private buildPaymentFilterConditions(params: PaymentListParams) {
    const conditions = [];
    if (params.status) conditions.push(eq(payment.status, params.status));
    if (params.projectId) conditions.push(eq(payment.projectId, params.projectId));
    if (params.vendor) conditions.push(like(payment.vendor, `%${params.vendor}%`));
    if (params.minAmount != null)
      conditions.push(gte(payment.amount, String(params.minAmount)));
    if (params.maxAmount != null)
      conditions.push(lte(payment.amount, String(params.maxAmount)));
    if (params.startDate) conditions.push(gte(payment.dueDate, params.startDate));
    if (params.endDate) conditions.push(lte(payment.dueDate, params.endDate));
    if (params.search) {
      const searchPattern = `%${params.search}%`;
      conditions.push(
        or(like(payment.paymentNumber, searchPattern), like(payment.vendor, searchPattern)),
      );
    }
    return conditions;
  }

  private async generatePaymentNumber(): Promise<string> {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const datePart = `${yyyy}${mm}${dd}`;
    const prefix = `PAY-${datePart}-`;

    const result = await this.db
      .select({ count: count() })
      .from(payment)
      .where(like(payment.paymentNumber, `${prefix}%`));

    const seq = Number(result[0]?.count ?? 0) + 1;
    const seqStr = String(seq).padStart(4, '0');
    return `${prefix}${seqStr}`;
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

  // ─── Payments ──────────────────────────────────────────────────────

  async getPayments(
    params: PaymentListParams,
  ): Promise<PaginatedResponse<Payment>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = this.buildPaymentFilterConditions(params);

    const baseQuery =
      conditions.length > 0
        ? this.db.select().from(payment).where(and(...conditions))
        : this.db.select().from(payment);

    const [rows, countResult] = await Promise.all([
      baseQuery.orderBy(desc(payment.createdAt)).limit(pageSize).offset(offset),
      this.db
        .select({ count: count() })
        .from(payment)
        .where(conditions.length > 0 ? and(...conditions) : undefined),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const items: Payment[] = rows.map((row) => this.mapPayment(row));

    return { items, total, page, pageSize };
  }

  async getPaymentById(id: string): Promise<Payment> {
    const rows = await this.db
      .select()
      .from(payment)
      .where(eq(payment.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return this.mapPayment(rows[0]);
  }

  async createPayment(data: CreatePaymentRequest, userId: string): Promise<Payment> {
    let vendor = data.vendor;
    let amount = data.amount;
    let currency = data.currency;
    let exchangeRate = data.exchangeRate;
    let projectId = data.projectId;

    // If documentId is provided, auto-populate fields from the document
    if (data.documentId) {
      const docRows = await this.db
        .select()
        .from(document)
        .where(eq(document.id, data.documentId))
        .limit(1);

      if (docRows.length === 0) {
        throw new BadRequestException(`Document ${data.documentId} not found`);
      }

      const doc = docRows[0];
      if (doc.vendor) vendor = doc.vendor;
      if (doc.amount != null) amount = Number(doc.amount);
      if (doc.currency) currency = doc.currency;
      if (doc.exchangeRate != null) exchangeRate = Number(doc.exchangeRate);
      if (doc.projectId && !projectId) projectId = doc.projectId;
    }

    if (!vendor || amount == null || !currency) {
      throw new BadRequestException(
        'vendor, amount, and currency are required (either provided directly or via document)',
      );
    }

    const hkdEquivalent =
      amount != null && exchangeRate != null ? amount * exchangeRate : undefined;

    const paymentNumber = await this.generatePaymentNumber();

    return this.db.transaction(async (tx) => {
      const inserted = await tx
        .insert(payment)
        .values({
          paymentNumber,
          projectId: projectId ?? null,
          documentId: data.documentId ?? null,
          vendor,
          amount: String(amount),
          currency,
          exchangeRate: exchangeRate != null ? String(exchangeRate) : null,
          hkdEquivalent: hkdEquivalent != null ? String(hkdEquivalent) : null,
          status: 'draft',
          paymentMethod: data.paymentMethod ?? null,
          dueDate: data.dueDate ?? null,
          approvalComments: data.approvalComments ?? null,
        })
        .returning();

      const row = inserted[0];
      if (!row) throw new Error('Failed to create payment');

      await this.writeAuditLog(tx, 'payment', row.id, 'create', {
        payment: { before: null, after: this.mapPayment(row) },
      });

      this.logger.log(`Payment created: ${row.id} (${paymentNumber})`);
      return this.mapPayment(row);
    });
  }

  async updatePayment(
    id: string,
    data: UpdatePaymentRequest,
    userId: string,
  ): Promise<Payment> {
    const existing = await this.getPaymentById(id);

    const updates: Record<string, unknown> = {};
    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};

    if (data.projectId !== undefined) {
      updates.projectId = data.projectId ?? null;
      fieldChanges.projectId = { before: existing.projectId ?? null, after: data.projectId ?? null };
    }
    if (data.documentId !== undefined) {
      updates.documentId = data.documentId ?? null;
      fieldChanges.documentId = { before: existing.documentId ?? null, after: data.documentId ?? null };
    }
    if (data.vendor !== undefined) {
      updates.vendor = data.vendor;
      fieldChanges.vendor = { before: existing.vendor, after: data.vendor };
    }
    if (data.amount !== undefined) {
      updates.amount = String(data.amount);
      fieldChanges.amount = { before: existing.amount, after: data.amount };
    }
    if (data.currency !== undefined) {
      updates.currency = data.currency;
      fieldChanges.currency = { before: existing.currency, after: data.currency };
    }
    if (data.exchangeRate !== undefined) {
      updates.exchangeRate = data.exchangeRate != null ? String(data.exchangeRate) : null;
      fieldChanges.exchangeRate = {
        before: existing.exchangeRate ?? null,
        after: data.exchangeRate ?? null,
      };
    }
    if (data.paymentMethod !== undefined) {
      updates.paymentMethod = data.paymentMethod ?? null;
      fieldChanges.paymentMethod = {
        before: existing.paymentMethod ?? null,
        after: data.paymentMethod ?? null,
      };
    }
    if (data.dueDate !== undefined) {
      updates.dueDate = data.dueDate ?? null;
      fieldChanges.dueDate = { before: existing.dueDate ?? null, after: data.dueDate ?? null };
    }

    // Recalculate hkdEquivalent if amount or exchangeRate changes
    if (data.amount !== undefined || data.exchangeRate !== undefined) {
      const newAmount = data.amount ?? existing.amount;
      const newRate = data.exchangeRate ?? existing.exchangeRate;
      const newHkd = newAmount != null && newRate != null ? newAmount * newRate : undefined;
      updates.hkdEquivalent = newHkd != null ? String(newHkd) : null;
      fieldChanges.hkdEquivalent = {
        before: existing.hkdEquivalent ?? null,
        after: newHkd ?? null,
      };
    }

    if (Object.keys(updates).length === 0) {
      return existing;
    }

    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(payment)
        .set(updates)
        .where(eq(payment.id, id))
        .returning();

      const row = updated[0];
      if (!row) throw new NotFoundException(`Payment ${id} not found`);

      await this.writeAuditLog(tx, 'payment', id, 'update', fieldChanges);

      this.logger.log(`Payment updated: ${id}`);
      return this.mapPayment(row);
    });
  }

  async deletePayment(id: string, userId: string): Promise<void> {
    await this.getPaymentById(id);

    await this.db.transaction(async (tx) => {
      await this.writeAuditLog(tx, 'payment', id, 'delete');
      const deleted = await tx.delete(payment).where(eq(payment.id, id)).returning({ id: payment.id });
      if (deleted.length === 0) throw new NotFoundException(`Payment ${id} not found`);
    });

    this.logger.log(`Payment deleted: ${id}`);
  }

  private async updateStatus(
    id: string,
    newStatus: PaymentStatus,
    comments: string | undefined,
    userId: string,
    extraUpdates: Record<string, unknown> = {},
  ): Promise<Payment> {
    const existing = await this.getPaymentById(id);

    const updates: Record<string, unknown> = {
      status: newStatus,
      ...extraUpdates,
    };

    if (comments !== undefined) {
      updates.approvalComments = comments;
    }

    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {
      status: { before: existing.status, after: newStatus },
    };
    if (comments !== undefined) {
      fieldChanges.approvalComments = {
        before: existing.approvalComments ?? null,
        after: comments,
      };
    }

    return this.db.transaction(async (tx) => {
      const updated = await tx
        .update(payment)
        .set(updates)
        .where(eq(payment.id, id))
        .returning();

      const row = updated[0];
      if (!row) throw new NotFoundException(`Payment ${id} not found`);

      await this.writeAuditLog(tx, 'payment', id, 'update', fieldChanges);

      this.logger.log(`Payment ${id} status changed to ${newStatus}`);
      return this.mapPayment(row);
    });
  }

  async approvePayment(id: string, comments: string | undefined, userId: string): Promise<Payment> {
    return this.updateStatus(id, 'approved', comments, userId, {
      approvedBy: userId,
      approvedAt: new Date(),
    });
  }

  async rejectPayment(id: string, comments: string, userId: string): Promise<Payment> {
    return this.updateStatus(id, 'rejected', comments, userId);
  }

  async requestRevision(id: string, comments: string, userId: string): Promise<Payment> {
    return this.updateStatus(id, 'draft', comments, userId);
  }

  async markProcessed(id: string, userId: string): Promise<Payment> {
    return this.updateStatus(id, 'processed', undefined, userId);
  }

  // ─── SWOP Breakdown ────────────────────────────────────────────────

  async getSwopBreakdown(paymentId: string): Promise<{ items: SwopBreakdown[] }> {
    const rows = await this.db
      .select()
      .from(swopBreakdown)
      .where(eq(swopBreakdown.paymentId, paymentId))
      .orderBy(desc(swopBreakdown.createdAt));

    return { items: rows.map((row) => this.mapSwopBreakdown(row)) };
  }

  async createSwopBreakdown(
    paymentId: string,
    data: CreateSwopBreakdownRequest,
    userId: string,
  ): Promise<SwopBreakdown> {
    // Verify payment exists
    await this.getPaymentById(paymentId);

    const inserted = await this.db
      .insert(swopBreakdown)
      .values({
        paymentId,
        projectId: data.projectId ?? null,
        fromCurrency: data.fromCurrency,
        toCurrency: data.toCurrency,
        fromAmount: String(data.fromAmount),
        toAmount: String(data.toAmount),
        exchangeRate: String(data.exchangeRate),
        tradeDate: data.tradeDate ?? null,
        referenceNumber: data.referenceNumber ?? null,
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error('Failed to create SWOP breakdown');

    this.logger.log(`SWOP breakdown created for payment ${paymentId}`);
    return this.mapSwopBreakdown(row);
  }

  // ─── Loan Schedules ────────────────────────────────────────────────

  async getLoanSchedules(
    projectId?: string,
    status?: LoanScheduleStatus,
  ): Promise<{ items: LoanSchedule[] }> {
    const conditions = [];
    if (projectId) conditions.push(eq(loanSchedule.projectId, projectId));
    if (status) conditions.push(eq(loanSchedule.status, status));

    const baseQuery =
      conditions.length > 0
        ? this.db.select().from(loanSchedule).where(and(...conditions))
        : this.db.select().from(loanSchedule);

    const rows = await baseQuery.orderBy(desc(loanSchedule.createdAt));
    return { items: rows.map((row) => this.mapLoanSchedule(row)) };
  }

  async createLoanSchedule(
    data: CreateLoanScheduleRequest,
    userId: string,
  ): Promise<LoanSchedule> {
    const inserted = await this.db
      .insert(loanSchedule)
      .values({
        projectId: data.projectId ?? null,
        lender: data.lender,
        principalAmount: String(data.principalAmount),
        currency: data.currency,
        interestRate: String(data.interestRate),
        totalInstallments: data.totalInstallments,
        startDate: data.startDate ?? null,
        nextPaymentDate: data.nextPaymentDate ?? null,
        nextPaymentAmount:
          data.nextPaymentAmount != null ? String(data.nextPaymentAmount) : null,
        status: data.status ?? 'active',
      })
      .returning();

    const row = inserted[0];
    if (!row) throw new Error('Failed to create loan schedule');

    this.logger.log(`Loan schedule created: ${row.id}`);
    return this.mapLoanSchedule(row);
  }

  async updateLoanSchedule(
    id: string,
    data: UpdateLoanScheduleRequest,
    userId: string,
  ): Promise<LoanSchedule> {
    const existingRows = await this.db
      .select()
      .from(loanSchedule)
      .where(eq(loanSchedule.id, id))
      .limit(1);

    if (existingRows.length === 0) {
      throw new NotFoundException(`Loan schedule ${id} not found`);
    }

    const updates: Record<string, unknown> = {};
    if (data.projectId !== undefined) updates.projectId = data.projectId ?? null;
    if (data.lender !== undefined) updates.lender = data.lender;
    if (data.principalAmount !== undefined)
      updates.principalAmount = String(data.principalAmount);
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.interestRate !== undefined)
      updates.interestRate = String(data.interestRate);
    if (data.totalInstallments !== undefined)
      updates.totalInstallments = data.totalInstallments;
    if (data.startDate !== undefined) updates.startDate = data.startDate ?? null;
    if (data.nextPaymentDate !== undefined)
      updates.nextPaymentDate = data.nextPaymentDate ?? null;
    if (data.nextPaymentAmount !== undefined)
      updates.nextPaymentAmount =
        data.nextPaymentAmount != null ? String(data.nextPaymentAmount) : null;
    if (data.status !== undefined) updates.status = data.status;

    if (Object.keys(updates).length === 0) {
      return this.mapLoanSchedule(existingRows[0]);
    }

    const updated = await this.db
      .update(loanSchedule)
      .set(updates)
      .where(eq(loanSchedule.id, id))
      .returning();

    const row = updated[0];
    if (!row) throw new NotFoundException(`Loan schedule ${id} not found`);

    this.logger.log(`Loan schedule updated: ${id}`);
    return this.mapLoanSchedule(row);
  }
}
