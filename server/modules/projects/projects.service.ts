import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { and, eq, gte, lte, ilike, or, desc, count, sql, inArray } from 'drizzle-orm';

import {
  project,
  payment,
  document,
  auditLog,
} from '../../database/schema';

import type {
  Project,
  ProjectFinancialSummary,
  Document,
  Payment,
  AuditLog,
  PaginatedResponse,
  ProjectCodeSuggestion,
} from '@shared/api.interface';

export interface ProjectListParams {
  page: number;
  pageSize: number;
  status?: string;
  responsiblePerson?: string;
  startDate?: string;
  endDate?: string;
  minBudget?: number;
  maxBudget?: number;
  search?: string;
}

export interface CreateProjectData {
  code: string;
  name: string;
  description?: string;
  budget: number;
  currency: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  responsiblePerson?: string;
}

export interface UpdateProjectData {
  code?: string;
  name?: string;
  description?: string;
  budget?: number;
  currency?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  responsiblePerson?: string;
}

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  async findAll(params: ProjectListParams): Promise<PaginatedResponse<Project>> {
    const conditions: ReturnType<typeof and>[] = [];

    if (params.status) {
      conditions.push(eq(project.status, params.status));
    }
    if (params.responsiblePerson) {
      conditions.push(eq(project.responsiblePerson, params.responsiblePerson));
    }
    if (params.startDate) {
      conditions.push(gte(project.startDate, params.startDate));
    }
    if (params.endDate) {
      conditions.push(lte(project.endDate, params.endDate));
    }
    if (params.minBudget !== undefined) {
      conditions.push(gte(project.budget, String(params.minBudget)));
    }
    if (params.maxBudget !== undefined) {
      conditions.push(lte(project.budget, String(params.maxBudget)));
    }
    if (params.search) {
      const term = `%${params.search}%`;
      conditions.push(
        or(
          ilike(project.code, term),
          ilike(project.name, term),
        ) as ReturnType<typeof and>,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const offset = (params.page - 1) * params.pageSize;

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(project)
        .where(whereClause)
        .orderBy(desc(project.createdAt))
        .limit(params.pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(project)
        .where(whereClause),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    const mapped: Project[] = items.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? undefined,
      budget: Number(p.budget),
      currency: p.currency,
      status: p.status as Project['status'],
      startDate: p.startDate ?? undefined,
      endDate: p.endDate ?? undefined,
      responsiblePerson: p.responsiblePerson ?? undefined,
      contractDocumentId: p.contractDocumentId ?? undefined,
      createdAt: p.createdAt.toISOString(),
      createdBy: p.createdBy ?? undefined,
      updatedAt: p.updatedAt.toISOString(),
      updatedBy: p.updatedBy ?? undefined,
    }));

    return { items: mapped, total, page: params.page, pageSize: params.pageSize };
  }

  async findById(id: string): Promise<Project> {
    const rows = await this.db
      .select()
      .from(project)
      .where(eq(project.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    const p = rows[0];
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description ?? undefined,
      budget: Number(p.budget),
      currency: p.currency,
      status: p.status as Project['status'],
      startDate: p.startDate ?? undefined,
      endDate: p.endDate ?? undefined,
      responsiblePerson: p.responsiblePerson ?? undefined,
      contractDocumentId: p.contractDocumentId ?? undefined,
      createdAt: p.createdAt.toISOString(),
      createdBy: p.createdBy ?? undefined,
      updatedAt: p.updatedAt.toISOString(),
      updatedBy: p.updatedBy ?? undefined,
    };
  }

  async create(
    data: CreateProjectData,
    userId: string,
  ): Promise<Project> {
    const [inserted] = await this.db
      .insert(project)
      .values({
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        budget: String(data.budget),
        currency: data.currency,
        status: data.status ?? 'active',
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        responsiblePerson: data.responsiblePerson ?? null,
      })
      .returning();

    await this.db.insert(auditLog).values({
      entityType: 'project',
      entityId: inserted.id,
      action: 'create',
      fieldChanges: {
        code: { before: null, after: data.code },
        name: { before: null, after: data.name },
        budget: { before: null, after: data.budget },
        currency: { before: null, after: data.currency },
        status: { before: null, after: data.status ?? 'active' },
      },
    });

    this.logger.log(`Project created: ${inserted.id} by ${userId}`);

    return {
      id: inserted.id,
      code: inserted.code,
      name: inserted.name,
      description: inserted.description ?? undefined,
      budget: Number(inserted.budget),
      currency: inserted.currency,
      status: inserted.status as Project['status'],
      startDate: inserted.startDate ?? undefined,
      endDate: inserted.endDate ?? undefined,
      responsiblePerson: inserted.responsiblePerson ?? undefined,
      contractDocumentId: inserted.contractDocumentId ?? undefined,
      createdAt: inserted.createdAt.toISOString(),
      createdBy: inserted.createdBy ?? undefined,
      updatedAt: inserted.updatedAt.toISOString(),
      updatedBy: inserted.updatedBy ?? undefined,
    };
  }

  async update(
    id: string,
    data: UpdateProjectData,
    userId: string,
  ): Promise<Project> {
    const existing = await this.findById(id);

    const updateValues: Record<string, unknown> = {};
    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};

    const fields: Array<{ key: keyof UpdateProjectData; dbKey: string }> = [
      { key: 'code', dbKey: 'code' },
      { key: 'name', dbKey: 'name' },
      { key: 'description', dbKey: 'description' },
      { key: 'budget', dbKey: 'budget' },
      { key: 'currency', dbKey: 'currency' },
      { key: 'status', dbKey: 'status' },
      { key: 'startDate', dbKey: 'startDate' },
      { key: 'endDate', dbKey: 'endDate' },
      { key: 'responsiblePerson', dbKey: 'responsiblePerson' },
    ];

    for (const { key, dbKey } of fields) {
      if (data[key] !== undefined) {
        const newVal = data[key];
        const oldVal = (existing as unknown as Record<string, unknown>)[key];
        if (String(newVal) !== String(oldVal ?? '')) {
          updateValues[dbKey] = key === 'budget' ? String(newVal) : (newVal ?? null);
          fieldChanges[key] = { before: oldVal ?? null, after: newVal ?? null };
        }
      }
    }

    if (Object.keys(updateValues).length === 0) {
      return existing;
    }

    const [updated] = await this.db
      .update(project)
      .set(updateValues)
      .where(eq(project.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundException(`Project ${id} not found after update`);
    }

    await this.db.insert(auditLog).values({
      entityType: 'project',
      entityId: id,
      action: 'update',
      fieldChanges,
    });

    this.logger.log(`Project updated: ${id} by ${userId}`);

    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      description: updated.description ?? undefined,
      budget: Number(updated.budget),
      currency: updated.currency,
      status: updated.status as Project['status'],
      startDate: updated.startDate ?? undefined,
      endDate: updated.endDate ?? undefined,
      responsiblePerson: updated.responsiblePerson ?? undefined,
      contractDocumentId: updated.contractDocumentId ?? undefined,
      createdAt: updated.createdAt.toISOString(),
      createdBy: updated.createdBy ?? undefined,
      updatedAt: updated.updatedAt.toISOString(),
      updatedBy: updated.updatedBy ?? undefined,
    };
  }

  async getFinancialSummary(id: string): Promise<ProjectFinancialSummary> {
    const proj = await this.findById(id);

    const payments = await this.db
      .select()
      .from(payment)
      .where(eq(payment.projectId, id));

    let actualSpending = 0;
    for (const p of payments) {
      if (p.hkdEquivalent) {
        actualSpending += Number(p.hkdEquivalent);
      } else if (p.currency === 'HKD') {
        actualSpending += Number(p.amount);
      }
    }

    const budget = Number(proj.budget);
    const remainingBudget = budget - actualSpending;
    const utilizationPercent = budget > 0
      ? Math.round((actualSpending / budget) * 10000) / 100
      : 0;

    let burnRate = 0;
    if (proj.startDate) {
      const start = new Date(proj.startDate);
      const now = new Date();
      const monthsDiff = Math.max(
        1,
        (now.getFullYear() - start.getFullYear()) * 12 +
          (now.getMonth() - start.getMonth()),
      );
      burnRate = Math.round((actualSpending / monthsDiff) * 100) / 100;
    }

    return {
      budget,
      actualSpending,
      remainingBudget,
      burnRate,
      utilizationPercent,
      currency: proj.currency,
    };
  }

  async getDocuments(
    id: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<Document>> {
    const offset = (page - 1) * pageSize;

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(document)
        .where(eq(document.projectId, id))
        .orderBy(desc(document.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(document)
        .where(eq(document.projectId, id)),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    const mapped: Document[] = items.map((d) => ({
      id: d.id,
      name: d.name,
      type: d.type as Document['type'],
      fileUrl: d.fileUrl,
      fileSize: d.fileSize,
      invoiceNumber: d.invoiceNumber ?? undefined,
      amount: d.amount ? Number(d.amount) : undefined,
      currency: d.currency ?? undefined,
      exchangeRate: d.exchangeRate ? Number(d.exchangeRate) : undefined,
      vendor: d.vendor ?? undefined,
      invoiceDate: d.invoiceDate ?? undefined,
      projectId: d.projectId ?? undefined,
      status: d.status as Document['status'],
      extractionConfidence: d.extractionConfidence
        ? Number(d.extractionConfidence)
        : undefined,
      version: d.version,
      createdAt: d.createdAt.toISOString(),
      createdBy: d.createdBy ?? undefined,
      updatedAt: d.updatedAt.toISOString(),
      updatedBy: d.updatedBy ?? undefined,
    }));

    return { items: mapped, total, page, pageSize };
  }

  async getPayments(
    id: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<Payment>> {
    const offset = (page - 1) * pageSize;

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(payment)
        .where(eq(payment.projectId, id))
        .orderBy(desc(payment.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(payment)
        .where(eq(payment.projectId, id)),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    const mapped: Payment[] = items.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      projectId: p.projectId ?? undefined,
      documentId: p.documentId ?? undefined,
      vendor: p.vendor,
      amount: Number(p.amount),
      currency: p.currency,
      exchangeRate: p.exchangeRate ? Number(p.exchangeRate) : undefined,
      hkdEquivalent: p.hkdEquivalent ? Number(p.hkdEquivalent) : undefined,
      status: p.status as Payment['status'],
      paymentMethod: p.paymentMethod ?? undefined,
      dueDate: p.dueDate ?? undefined,
      approvalComments: p.approvalComments ?? undefined,
      approvedBy: p.approvedBy ?? undefined,
      approvedAt: p.approvedAt ? p.approvedAt.toISOString() : undefined,
      createdAt: p.createdAt.toISOString(),
      createdBy: p.createdBy ?? undefined,
      updatedAt: p.updatedAt.toISOString(),
      updatedBy: p.updatedBy ?? undefined,
    }));

    return { items: mapped, total, page, pageSize };
  }

  async getActivityLog(
    id: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResponse<AuditLog>> {
    const offset = (page - 1) * pageSize;

    const [items, totalResult] = await Promise.all([
      this.db
        .select()
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityType, 'project'),
            eq(auditLog.entityId, id),
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(pageSize)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(auditLog)
        .where(
          and(
            eq(auditLog.entityType, 'project'),
            eq(auditLog.entityId, id),
          ),
        ),
    ]);

    const total = Number(totalResult[0]?.count ?? 0);

    const mapped: AuditLog[] = items.map((a) => ({
      id: a.id,
      entityType: a.entityType,
      entityId: a.entityId,
      action: a.action as AuditLog['action'],
      fieldChanges: a.fieldChanges as AuditLog['fieldChanges'],
      createdAt: a.createdAt.toISOString(),
      createdBy: a.createdBy ?? undefined,
    }));

    return { items: mapped, total, page, pageSize };
  }

  async suggestCode(prefix?: string): Promise<ProjectCodeSuggestion> {
    const pattern = prefix || 'PRJ';
    const escapedPattern = pattern.replace(/[%_]/g, '\\$&');

    const rows = await this.db
      .select({ code: project.code })
      .from(project)
      .where(ilike(project.code, `${escapedPattern}%`));

    let maxSeq = 0;
    for (const row of rows) {
      const match = row.code.match(new RegExp(`^${escapedPattern}-?(\\d+)$`, 'i'));
      if (match) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }

    const nextSequence = maxSeq + 1;
    const seqStr = String(nextSequence).padStart(3, '0');
    const suggestedCode = `${pattern}-${seqStr}`;

    return {
      suggestedCode,
      nextSequence,
      pattern,
    };
  }
}
