import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DRIZZLE_DATABASE, type PostgresJsDatabase } from '@lark-apaas/fullstack-nestjs-core';
import { eq, and, desc, count, sql } from 'drizzle-orm';

import {
  exchangeRate,
  template,
  project,
  auditLog,
} from '@server/database/schema';
import type { ExchangeRate, Template, ProjectCodeConfig, AuditAction } from '@shared/api.interface';

interface CreateExchangeRateInput {
  currency: string;
  rateToHkd: number;
  effectiveDate: string;
}

interface UpdateExchangeRateInput {
  rateToHkd?: number;
  effectiveDate?: string;
  status?: 'active' | 'inactive';
}

interface CreateTemplateInput {
  name: string;
  type: string;
  fieldMapping: Record<string, unknown>;
  isDefault?: boolean;
}

interface UpdateTemplateInput {
  name?: string;
  type?: string;
  fieldMapping?: Record<string, unknown>;
  isDefault?: boolean;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @Inject(DRIZZLE_DATABASE) private readonly db: PostgresJsDatabase,
  ) {}

  // ─── Exchange Rates ───────────────────────────────────────────────

  async getExchangeRates(status?: 'active' | 'inactive'): Promise<ExchangeRate[]> {
    const conditions = [];
    if (status) conditions.push(eq(exchangeRate.status, status));
    const query = conditions.length > 0
      ? this.db.select().from(exchangeRate).where(and(...conditions)).orderBy(desc(exchangeRate.updatedAt))
      : this.db.select().from(exchangeRate).orderBy(desc(exchangeRate.updatedAt));
    const rows = await query;
    return rows.map((row) => this.mapExchangeRate(row));
  }

  async createExchangeRate(data: CreateExchangeRateInput, userId: string): Promise<ExchangeRate> {
    const [created] = await this.db.insert(exchangeRate).values({
      currency: data.currency,
      rateToHkd: data.rateToHkd.toString(),
      effectiveDate: data.effectiveDate,
      status: 'active',
    }).returning();
    await this.writeAuditLog('exchange_rate', created.id, 'create', userId, {
      after: data,
    });
    this.logger.log(`Exchange rate created: ${data.currency} by ${userId}`);
    return this.mapExchangeRate(created);
  }

  async updateExchangeRate(
    id: string,
    data: UpdateExchangeRateInput,
    userId: string,
  ): Promise<ExchangeRate> {
    const existing = await this.db.select().from(exchangeRate).where(eq(exchangeRate.id, id)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundException(`Exchange rate ${id} not found`);
    }
    const updateData: Record<string, unknown> = {};
    if (data.rateToHkd !== undefined) updateData.rateToHkd = data.rateToHkd.toString();
    if (data.effectiveDate !== undefined) updateData.effectiveDate = data.effectiveDate;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await this.db.update(exchangeRate)
      .set(updateData)
      .where(eq(exchangeRate.id, id))
      .returning();

    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};
    if (data.rateToHkd !== undefined) {
      fieldChanges.rateToHkd = { before: Number(existing[0].rateToHkd), after: data.rateToHkd };
    }
    if (data.effectiveDate !== undefined) {
      fieldChanges.effectiveDate = { before: existing[0].effectiveDate, after: data.effectiveDate };
    }
    if (data.status !== undefined) {
      fieldChanges.status = { before: existing[0].status, after: data.status };
    }
    await this.writeAuditLog('exchange_rate', id, 'update', userId, fieldChanges);
    this.logger.log(`Exchange rate updated: ${id} by ${userId}`);
    return this.mapExchangeRate(updated);
  }

  async deactivateExchangeRate(id: string, userId: string): Promise<ExchangeRate> {
    return this.updateExchangeRate(id, { status: 'inactive' }, userId);
  }

  // ─── Project Code Config ──────────────────────────────────────────

  async getProjectCodeConfig(): Promise<ProjectCodeConfig> {
    const [countResult] = await this.db.select({ count: count() }).from(project);
    const totalProjects = Number(countResult.count);

    const [activeResult] = await this.db
      .select({ count: count() })
      .from(project)
      .where(eq(project.status, 'active'));
    const activeProjects = Number(activeResult.count);

    // Derive prefix from existing project codes
    const sample = await this.db.select({ code: project.code }).from(project).limit(5);
    let prefix = 'HK-';
    let sequenceDigits = 3;
    const namingConvention = 'PREFIX-DEPT-SEQ';

    if (sample.length > 0) {
      const firstCode = sample[0].code;
      const dashIdx = firstCode.indexOf('-');
      if (dashIdx > 0) {
        prefix = firstCode.slice(0, dashIdx + 1);
      }
      // Estimate sequence digits from the numeric suffix
      const match = firstCode.match(/(\d+)$/);
      if (match) sequenceDigits = match[1].length;
    }

    const sampleCodes = this.generateSampleCodes(prefix, sequenceDigits, totalProjects);

    return {
      prefix,
      sequenceDigits,
      namingConvention,
      sampleCodes,
      totalProjects,
      activeProjects,
    };
  }

  async updateProjectCodeConfig(
    config: Partial<Pick<ProjectCodeConfig, 'prefix' | 'sequenceDigits' | 'namingConvention'>>,
    userId: string,
  ): Promise<ProjectCodeConfig> {
    const current = await this.getProjectCodeConfig();
    const merged: ProjectCodeConfig = {
      ...current,
      prefix: config.prefix ?? current.prefix,
      sequenceDigits: config.sequenceDigits ?? current.sequenceDigits,
      namingConvention: config.namingConvention ?? current.namingConvention,
    };
    merged.sampleCodes = this.generateSampleCodes(merged.prefix, merged.sequenceDigits, merged.totalProjects);

    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};
    if (config.prefix !== undefined) fieldChanges.prefix = { before: current.prefix, after: config.prefix };
    if (config.sequenceDigits !== undefined) {
      fieldChanges.sequenceDigits = { before: current.sequenceDigits, after: config.sequenceDigits };
    }
    if (config.namingConvention !== undefined) {
      fieldChanges.namingConvention = { before: current.namingConvention, after: config.namingConvention };
    }
    if (Object.keys(fieldChanges).length > 0) {
      await this.writeAuditLog('project_code_config', 'global', 'update', userId, fieldChanges);
      this.logger.log(`Project code config updated by ${userId}`);
    }
    return merged;
  }

  private generateSampleCodes(prefix: string, digits: number, start: number): string[] {
    const samples: string[] = [];
    const departments = ['FIN', 'OPS', 'IT', 'MKT', 'HR'];
    for (let i = 0; i < 5; i++) {
      const seq = (start + i + 1).toString().padStart(digits, '0');
      const dept = departments[i % departments.length];
      samples.push(`${prefix}${dept}-${seq}`);
    }
    return samples;
  }

  // ─── Templates ────────────────────────────────────────────────────

  async getTemplates(type?: string): Promise<Template[]> {
    const conditions = [];
    if (type) conditions.push(eq(template.type, type));
    const query = conditions.length > 0
      ? this.db.select().from(template).where(and(...conditions)).orderBy(desc(template.updatedAt))
      : this.db.select().from(template).orderBy(desc(template.updatedAt));
    const rows = await query;
    return rows.map((row) => this.mapTemplate(row));
  }

  async createTemplate(data: CreateTemplateInput, userId: string): Promise<Template> {
    return this.db.transaction(async (tx) => {
      if (data.isDefault) {
        await tx.update(template)
          .set({ isDefault: false })
          .where(eq(template.type, data.type));
      }
      const [created] = await tx.insert(template).values({
        name: data.name,
        type: data.type,
        fieldMapping: data.fieldMapping,
        isDefault: data.isDefault ?? false,
      }).returning();
      await this.writeAuditLog('template', created.id, 'create', userId, { after: data });
      this.logger.log(`Template created: ${data.name} by ${userId}`);
      return this.mapTemplate(created);
    });
  }

  async updateTemplate(
    id: string,
    data: UpdateTemplateInput,
    userId: string,
  ): Promise<Template> {
    const existing = await this.db.select().from(template).where(eq(template.id, id)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    const result = await this.db.transaction(async (tx) => {
      if (data.isDefault && data.type) {
        await tx.update(template).set({ isDefault: false }).where(eq(template.type, data.type));
      } else if (data.isDefault) {
        await tx.update(template).set({ isDefault: false }).where(eq(template.type, existing[0].type));
      }
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.type !== undefined) updateData.type = data.type;
      if (data.fieldMapping !== undefined) updateData.fieldMapping = data.fieldMapping;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      const [updated] = await tx.update(template)
        .set(updateData)
        .where(eq(template.id, id))
        .returning();
      return { updated, existing: existing[0] };
    });

    const fieldChanges: Record<string, { before: unknown; after: unknown }> = {};
    if (data.name !== undefined) fieldChanges.name = { before: result.existing.name, after: data.name };
    if (data.type !== undefined) fieldChanges.type = { before: result.existing.type, after: data.type };
    if (data.fieldMapping !== undefined) {
      fieldChanges.fieldMapping = { before: result.existing.fieldMapping, after: data.fieldMapping };
    }
    if (data.isDefault !== undefined) {
      fieldChanges.isDefault = { before: result.existing.isDefault, after: data.isDefault };
    }
    if (Object.keys(fieldChanges).length > 0) {
      await this.writeAuditLog('template', id, 'update', userId, fieldChanges);
    }
    this.logger.log(`Template updated: ${id} by ${userId}`);
    return this.mapTemplate(result.updated);
  }

  async setDefaultTemplate(id: string, userId: string): Promise<Template> {
    const existing = await this.db.select().from(template).where(eq(template.id, id)).limit(1);
    if (existing.length === 0) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    await this.db.transaction(async (tx) => {
      await tx.update(template).set({ isDefault: false }).where(eq(template.type, existing[0].type));
      await tx.update(template).set({ isDefault: true }).where(eq(template.id, id));
    });
    await this.writeAuditLog('template', id, 'update', userId, {
      isDefault: { before: false, after: true },
    });
    const [updated] = await this.db.select().from(template).where(eq(template.id, id)).limit(1);
    return this.mapTemplate(updated);
  }

  // ─── Audit Helper ─────────────────────────────────────────────────

  private async writeAuditLog(
    entityType: string,
    entityId: string,
    action: AuditAction,
    userId: string,
    fieldChanges?: Record<string, unknown>,
  ): Promise<void> {
    try {
      // entity_id is uuid type; for non-uuid entities (e.g. "global"), use a zero-UUID placeholder
      const entityIdUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId)
        ? entityId
        : '00000000-0000-0000-0000-000000000000';

      await this.db.insert(auditLog).values({
        entityType,
        entityId: entityIdUuid,
        action,
        fieldChanges: fieldChanges as Record<string, unknown> | undefined,
        // created_by is auto-filled by the DB via current_setting('app.user_id')
      });
      // The DB auto-fills created_by from app.user_id; we log userId here for traceability
      void userId;
    } catch (err) {
      this.logger.error(`Failed to write audit log: ${JSON.stringify(err)}`);
    }
  }

  // ─── Mappers ──────────────────────────────────────────────────────

  private mapExchangeRate(row: typeof exchangeRate.$inferSelect): ExchangeRate {
    return {
      id: row.id,
      currency: row.currency,
      rateToHkd: Number(row.rateToHkd),
      effectiveDate: typeof row.effectiveDate === 'string'
        ? row.effectiveDate
        : (row.effectiveDate as Date).toISOString().slice(0, 10),
      status: row.status as 'active' | 'inactive',
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy ?? undefined,
    };
  }

  private mapTemplate(row: typeof template.$inferSelect): Template {
    return {
      id: row.id,
      name: row.name,
      type: row.type as Template['type'],
      fieldMapping: (row.fieldMapping ?? {}) as Record<string, unknown>,
      isDefault: row.isDefault,
      createdAt: row.createdAt.toISOString(),
      createdBy: row.createdBy ?? undefined,
      updatedAt: row.updatedAt.toISOString(),
      updatedBy: row.updatedBy ?? undefined,
    };
  }
}
