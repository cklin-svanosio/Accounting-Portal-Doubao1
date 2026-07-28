import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import {
  eq,
  and,
  count,
  gte,
  lte,
  desc,
  sql,
  inArray,
} from 'drizzle-orm';
import {
  document,
  payment,
  project,
  exceptionRecord,
  auditLog,
} from '@server/database/schema';
import type {
  DashboardKpis,
  InvoiceVolumePoint,
  PaymentStatusBreakdown,
  ActivityItem,
  ProjectFinancialRow,
  ProjectFinancialSummaryResponse,
  PaymentStatusDashboardResponse,
  PaymentAgingBucket,
  ExceptionReportResponse,
  ExceptionRecord,
  ExceptionStatus,
  ExceptionCategory,
  ExceptionSeverity,
  PaginatedResponse,
  AuditLog,
  ExceptionListParams,
  AuditLogListParams,
  UpdateExceptionRequest,
} from '@shared/api.interface';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ─── Dashboard KPIs ─────────────────────────────────────────────────

  async getDashboardKpis(): Promise<DashboardKpis> {
    const [
      pendingInvoicesResult,
      pendingApprovalsResult,
      monthlyVolumeResult,
      exceptionAlertsResult,
      budgetRiskResult,
    ] = await Promise.all([
      this.db.select({ count: count() }).from(document)
        .where(eq(document.status, 'pending-review')),
      this.db.select({ count: count() }).from(payment)
        .where(eq(payment.status, 'review')),
      this.db
        .select({ total: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)` })
        .from(payment)
        .where(and(
          inArray(payment.status, ['approved', 'processed']),
          sql`DATE_TRUNC('month', ${payment.createdAt}) = DATE_TRUNC('month', CURRENT_TIMESTAMP)`,
        )),
      this.db.select({ count: count() }).from(exceptionRecord)
        .where(eq(exceptionRecord.status, 'open')),
      this.db
        .select({ count: count() })
        .from(sql`(
          SELECT p.id
          FROM ${project} p
          LEFT JOIN (
            SELECT project_id, COALESCE(SUM(hkd_equivalent), 0) AS actual
            FROM ${payment}
            WHERE status IN ('approved', 'processed')
            GROUP BY project_id
          ) pay ON pay.project_id = p.id
          WHERE p.budget > 0
            AND COALESCE(pay.actual, 0) / p.budget > 0.8
        ) sub`),
    ]);

    return {
      pendingInvoices: Number(pendingInvoicesResult[0]?.count ?? 0),
      pendingApprovals: Number(pendingApprovalsResult[0]?.count ?? 0),
      monthlyPaymentVolume: Number(monthlyVolumeResult[0]?.total ?? 0),
      monthlyPaymentCurrency: 'HKD',
      exceptionAlerts: Number(exceptionAlertsResult[0]?.count ?? 0),
      budgetRiskProjects: Number(budgetRiskResult[0]?.count ?? 0),
    };
  }

  // ─── Invoice Volume ─────────────────────────────────────────────────

  async getInvoiceVolume(months: number = 6): Promise<{ items: InvoiceVolumePoint[] }> {
    const startDate = new Date();
    startDate.setDate(1);
    startDate.setMonth(startDate.getMonth() - (months - 1));

    const rows = await this.db
      .select({
        month: sql<string>`TO_CHAR(${document.invoiceDate}, 'YYYY-MM')`,
        count: sql<number>`COUNT(*)`,
        totalAmount: sql<number>`COALESCE(SUM(
          CASE
            WHEN ${document.currency} = 'HKD' THEN ${document.amount}
            WHEN ${document.exchangeRate} IS NOT NULL THEN ${document.amount} * ${document.exchangeRate}
            ELSE ${document.amount}
          END
        ), 0)`,
      })
      .from(document)
      .where(and(
        sql`${document.invoiceDate} IS NOT NULL`,
        gte(document.invoiceDate, startDate.toISOString().split('T')[0]),
      ))
      .groupBy(sql`TO_CHAR(${document.invoiceDate}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${document.invoiceDate}, 'YYYY-MM')`);

    // Fill missing months with zero
    const resultMap = new Map<string, InvoiceVolumePoint>();
    for (const row of rows) {
      resultMap.set(row.month, {
        month: row.month,
        count: Number(row.count),
        totalAmount: Number(row.totalAmount),
        currency: 'HKD',
      });
    }

    const items: InvoiceVolumePoint[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      items.push(resultMap.get(key) ?? {
        month: key,
        count: 0,
        totalAmount: 0,
        currency: 'HKD',
      });
    }

    return { items };
  }

  // ─── Payment Status Distribution ────────────────────────────────────

  async getPaymentStatusDistribution(): Promise<{ items: PaymentStatusBreakdown[] }> {
    const rows = await this.db
      .select({
        status: payment.status,
        count: count(),
        amount: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)`,
      })
      .from(payment)
      .groupBy(payment.status);

    return {
      items: rows.map((row) => ({
        status: row.status,
        count: Number(row.count),
        amount: Number(row.amount),
      })),
    };
  }

  // ─── Recent Activity ────────────────────────────────────────────────

  async getRecentActivity(limit: number = 10): Promise<{ items: ActivityItem[] }> {
    const [docRows, payRows, auditRows] = await Promise.all([
      this.db
        .select({
          id: document.id,
          title: document.name,
          vendor: document.vendor,
          createdAt: document.createdAt,
          createdBy: document.createdBy,
        })
        .from(document)
        .orderBy(desc(document.createdAt))
        .limit(limit),
      this.db
        .select({
          id: payment.id,
          title: payment.paymentNumber,
          vendor: payment.vendor,
          status: payment.status,
          createdAt: payment.createdAt,
          createdBy: payment.createdBy,
        })
        .from(payment)
        .orderBy(desc(payment.createdAt))
        .limit(limit),
      this.db
        .select({
          id: auditLog.id,
          entityType: auditLog.entityType,
          action: auditLog.action,
          createdAt: auditLog.createdAt,
          createdBy: auditLog.createdBy,
        })
        .from(auditLog)
        .orderBy(desc(auditLog.createdAt))
        .limit(limit),
    ]);

    const all: ActivityItem[] = [
      ...docRows.map((r) => ({
        id: `doc-${r.id}`,
        type: 'document',
        title: `Document uploaded: ${r.title}`,
        description: r.vendor ? `Vendor: ${r.vendor}` : 'New document',
        timestamp: (r.createdAt as Date).toISOString(),
        user: (r.createdBy as string) || undefined,
      })),
      ...payRows.map((r) => ({
        id: `pay-${r.id}`,
        type: 'payment',
        title: `Payment ${r.status}: ${r.title}`,
        description: r.vendor ? `Vendor: ${r.vendor}` : 'Payment update',
        timestamp: (r.createdAt as Date).toISOString(),
        user: (r.createdBy as string) || undefined,
      })),
      ...auditRows.map((r) => ({
        id: `audit-${r.id}`,
        type: 'audit',
        title: `${r.action} ${r.entityType}`,
        description: `Audit log entry for ${r.entityType}`,
        timestamp: (r.createdAt as Date).toISOString(),
        user: (r.createdBy as string) || undefined,
      })),
    ];

    all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return { items: all.slice(0, limit) };
  }

  // ─── Project Financial Summary ──────────────────────────────────────

  async getProjectFinancialSummary(status?: string): Promise<ProjectFinancialSummaryResponse> {
    const conditions = [];
    if (status) conditions.push(eq(project.status, status));

    const baseQuery = conditions.length > 0
      ? this.db.select().from(project).where(and(...conditions))
      : this.db.select().from(project);

    const projectRows = await baseQuery;

    const projectIds = projectRows.map((p) => p.id);
    const paymentRows = projectIds.length > 0
      ? await this.db
          .select({
            projectId: payment.projectId,
            actual: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)`,
          })
          .from(payment)
          .where(and(
            inArray(payment.status, ['approved', 'processed']),
            inArray(payment.projectId, projectIds),
          ))
          .groupBy(payment.projectId)
      : [];

    const actualByProject = new Map<string, number>();
    for (const row of paymentRows) {
      if (row.projectId) actualByProject.set(row.projectId, Number(row.actual));
    }

    const items: ProjectFinancialRow[] = projectRows.map((p) => {
      const budget = Number(p.budget);
      const actual = actualByProject.get(p.id) ?? 0;
      const variance = budget - actual;
      const variancePercent = budget > 0 ? (variance / budget) * 100 : 0;
      return {
        projectId: p.id,
        projectCode: p.code,
        projectName: p.name,
        budget,
        actual,
        variance,
        variancePercent: Number(variancePercent.toFixed(2)),
        currency: p.currency,
      };
    });

    const totalBudget = items.reduce((s, i) => s + i.budget, 0);
    const totalActual = items.reduce((s, i) => s + i.actual, 0);

    return {
      items,
      total: {
        budget: totalBudget,
        actual: totalActual,
        variance: totalBudget - totalActual,
        currency: 'HKD',
      },
    };
  }

  // ─── Payment Status Dashboard ───────────────────────────────────────

  async getPaymentStatusDashboard(
    startDate?: string,
    endDate?: string,
  ): Promise<PaymentStatusDashboardResponse> {
    const conditions = [];
    if (startDate) conditions.push(gte(payment.createdAt, startDate as unknown as Date));
    if (endDate) conditions.push(lte(payment.createdAt, `${endDate}T23:59:59` as unknown as Date));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const statusRows = where
      ? await this.db
          .select({
            status: payment.status,
            count: count(),
            amount: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)`,
          })
          .from(payment)
          .where(where)
          .groupBy(payment.status)
      : await this.db
          .select({
            status: payment.status,
            count: count(),
            amount: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)`,
          })
          .from(payment)
          .groupBy(payment.status);

    const byStatus: PaymentStatusBreakdown[] = statusRows.map((r) => ({
      status: r.status,
      count: Number(r.count),
      amount: Number(r.amount),
    }));

    // Aging buckets based on due_date (overdue payments only)
    const agingRows = await this.db
      .select({
        bucket: sql<string>`
          CASE
            WHEN ${payment.dueDate} IS NULL THEN 'No Due Date'
            WHEN CURRENT_DATE - ${payment.dueDate} <= 0 THEN 'Not Due'
            WHEN CURRENT_DATE - ${payment.dueDate} <= 30 THEN '0-30 days'
            WHEN CURRENT_DATE - ${payment.dueDate} <= 60 THEN '31-60 days'
            WHEN CURRENT_DATE - ${payment.dueDate} <= 90 THEN '61-90 days'
            ELSE '90+ days'
          END
        `,
        count: count(),
        amount: sql<number>`COALESCE(SUM(${payment.hkdEquivalent}), 0)`,
      })
      .from(payment)
      .where(and(
        inArray(payment.status, ['draft', 'review']),
        ...(conditions as typeof conditions),
      ))
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    const bucketOrder = ['0-30 days', '31-60 days', '61-90 days', '90+ days', 'Not Due', 'No Due Date'];
    const agingMap = new Map<string, PaymentAgingBucket>();
    for (const row of agingRows) {
      agingMap.set(row.bucket, {
        bucket: row.bucket,
        count: Number(row.count),
        amount: Number(row.amount),
      });
    }

    const aging: PaymentAgingBucket[] = bucketOrder
      .map((b) => agingMap.get(b) ?? { bucket: b, count: 0, amount: 0 })
      .filter((b) => b.count > 0 || b.bucket.startsWith('0') || b.bucket.startsWith('3') || b.bucket.startsWith('6') || b.bucket.startsWith('9'));

    return { byStatus, aging };
  }

  // ─── Exception Report ───────────────────────────────────────────────

  async getExceptionReport(
    category?: string,
    severity?: string,
    status?: string,
  ): Promise<ExceptionReportResponse> {
    const conditions = [];
    if (category) conditions.push(eq(exceptionRecord.category, category));
    if (severity) conditions.push(eq(exceptionRecord.severity, severity));
    if (status) conditions.push(eq(exceptionRecord.status, status));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [itemsRows, catRows, sevRows, totalRows] = await Promise.all([
      (where
        ? this.db.select().from(exceptionRecord).where(where).orderBy(desc(exceptionRecord.createdAt)).limit(100)
        : this.db.select().from(exceptionRecord).orderBy(desc(exceptionRecord.createdAt)).limit(100)
      ),
      this.db
        .select({
          category: exceptionRecord.category,
          count: count(),
        })
        .from(exceptionRecord)
        .groupBy(exceptionRecord.category),
      this.db
        .select({
          severity: exceptionRecord.severity,
          count: count(),
        })
        .from(exceptionRecord)
        .groupBy(exceptionRecord.severity),
      where
        ? this.db.select({ count: count() }).from(exceptionRecord).where(where)
        : this.db.select({ count: count() }).from(exceptionRecord),
    ]);

    return {
      items: itemsRows.map((r) => this.mapException(r)),
      byCategory: catRows.map((r) => ({ category: r.category, count: Number(r.count) })),
      bySeverity: sevRows.map((r) => ({ severity: r.severity, count: Number(r.count) })),
      total: Number(totalRows[0]?.count ?? 0),
    };
  }

  // ─── Audit Logs ─────────────────────────────────────────────────────

  async getAuditLogs(params: AuditLogListParams): Promise<PaginatedResponse<AuditLog>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.entityType) conditions.push(eq(auditLog.entityType, params.entityType));
    if (params.userId) conditions.push(eq(auditLog.createdBy, params.userId));
    if (params.startDate) conditions.push(gte(auditLog.createdAt, params.startDate as unknown as Date));
    if (params.endDate) conditions.push(lte(auditLog.createdAt, `${params.endDate}T23:59:59` as unknown as Date));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      (where
        ? this.db.select().from(auditLog).where(where)
        : this.db.select().from(auditLog)
      )
        .orderBy(desc(auditLog.createdAt))
        .limit(pageSize)
        .offset(offset),
      where
        ? this.db.select({ count: count() }).from(auditLog).where(where)
        : this.db.select({ count: count() }).from(auditLog),
    ]);

    return {
      items: rows.map((r) => this.mapAuditLog(r)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  // ─── Exceptions (Center) ────────────────────────────────────────────

  async getExceptions(params: ExceptionListParams): Promise<PaginatedResponse<ExceptionRecord>> {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const offset = (page - 1) * pageSize;

    const conditions = [];
    if (params.status) conditions.push(eq(exceptionRecord.status, params.status));
    if (params.category) conditions.push(eq(exceptionRecord.category, params.category));
    if (params.severity) conditions.push(eq(exceptionRecord.severity, params.severity));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [rows, totalRows] = await Promise.all([
      (where
        ? this.db.select().from(exceptionRecord).where(where)
        : this.db.select().from(exceptionRecord)
      )
        .orderBy(desc(exceptionRecord.createdAt))
        .limit(pageSize)
        .offset(offset),
      where
        ? this.db.select({ count: count() }).from(exceptionRecord).where(where)
        : this.db.select({ count: count() }).from(exceptionRecord),
    ]);

    return {
      items: rows.map((r) => this.mapException(r)),
      total: Number(totalRows[0]?.count ?? 0),
      page,
      pageSize,
    };
  }

  async getExceptionById(id: string): Promise<ExceptionRecord> {
    const rows = await this.db
      .select()
      .from(exceptionRecord)
      .where(eq(exceptionRecord.id, id));

    if (rows.length === 0) {
      throw new NotFoundException(`Exception ${id} not found`);
    }

    return this.mapException(rows[0]);
  }

  async updateException(
    id: string,
    data: UpdateExceptionRequest,
    userId: string,
  ): Promise<ExceptionRecord> {
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.resolutionNotes !== undefined) updateData.resolutionNotes = data.resolutionNotes;

    if (data.status && ['resolved', 'false-positive'].includes(data.status)) {
      updateData.resolvedBy = userId;
      updateData.resolvedAt = new Date();
    }

    if (Object.keys(updateData).length === 0) {
      return this.getExceptionById(id);
    }

    const updated = await this.db
      .update(exceptionRecord)
      .set(updateData)
      .where(eq(exceptionRecord.id, id))
      .returning();

    if (updated.length === 0) {
      throw new NotFoundException(`Exception ${id} not found`);
    }

    return this.mapException(updated[0]);
  }

  // ─── Mappers ────────────────────────────────────────────────────────

  private mapException(row: Record<string, unknown>): ExceptionRecord {
    return {
      id: row.id as string,
      category: row.category as ExceptionCategory,
      severity: row.severity as ExceptionSeverity,
      entityType: row.entityType as string,
      entityId: row.entityId as string,
      title: row.title as string,
      description: (row.description as string) ?? undefined,
      status: row.status as ExceptionStatus,
      resolutionNotes: (row.resolutionNotes as string) ?? undefined,
      resolvedBy: (row.resolvedBy as string) ?? undefined,
      resolvedAt: row.resolvedAt ? new Date(row.resolvedAt as string).toISOString() : undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      updatedAt: new Date(row.updatedAt as string).toISOString(),
    };
  }

  private mapAuditLog(row: Record<string, unknown>): AuditLog {
    return {
      id: row.id as string,
      entityType: row.entityType as string,
      entityId: row.entityId as string,
      action: row.action as AuditLog['action'],
      fieldChanges: (row.fieldChanges as AuditLog['fieldChanges']) ?? undefined,
      createdAt: new Date(row.createdAt as string).toISOString(),
      createdBy: (row.createdBy as string) ?? undefined,
    };
  }
}
