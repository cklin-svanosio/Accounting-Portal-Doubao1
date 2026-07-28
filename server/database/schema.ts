/* eslint-disable */
/** auto generated, do not edit */
import { sql } from 'drizzle-orm';
import { boolean, date, foreignKey, index, integer, jsonb, numeric, pgTable, text, uniqueIndex, uuid, varchar, customType } from "drizzle-orm/pg-core"

export const customTimestamptz = customType<{
  data: Date;
  driverData: string;
  config: { precision?: number };
}>({
  dataType(config) {
    const precision = typeof config?.precision !== 'undefined'
      ? ` (${config.precision})`
      : '';
    return `timestamptz${precision}`;
  },
  toDriver(value: Date | string | number) {
    if (value == null) return value as any;
    if (typeof value === 'number') return new Date(value).toISOString();
    if (typeof value === 'string') return value;
    if (value instanceof Date) return value.toISOString();
    throw new Error('Invalid timestamp value');
  },
  fromDriver(value: string | Date): Date {
    if (value instanceof Date) return value;
    return new Date(value);
  },
});

export const userProfile = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return 'user_profile';
  },
  toDriver(value: string) {
    return sql`ROW(${value})::user_profile`;
  },
  fromDriver(value: string) {
    const [userId] = value.slice(1, -1).split(',');
    return userId.trim();
  },
});

export type FileAttachment = {
  bucket_id: string;
  file_path: string;
};

export const fileAttachment = customType<{
  data: FileAttachment;
  driverData: string;
}>({
  dataType() {
    return 'file_attachment';
  },
  toDriver(value: FileAttachment) {
    return sql`ROW(${value.bucket_id},${value.file_path})::file_attachment`;
  },
  fromDriver(value: string): FileAttachment {
    const [bucketId, filePath] = value.slice(1, -1).split(',');
    return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
  },
});

export function escapeLiteral(str: string): string {
  return "'" + str.replace(/'/g, "''") + "'";
}

export const userProfileArray = customType<{
  data: string[];
  driverData: string;
}>({
  dataType() {
    return 'user_profile[]';
  },
  toDriver(value: string[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::user_profile[]`;
    }
    const elements = value.map(id => `ROW(${escapeLiteral(id)})::user_profile`).join(',');
    return sql.raw(`ARRAY[${elements}]::user_profile[]`);
  },
  fromDriver(value: string): string[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => m.slice(1, -1).split(',')[0].trim());
  },
});

export const fileAttachmentArray = customType<{
  data: FileAttachment[];
  driverData: string;
}>({
  dataType() {
    return 'file_attachment[]';
  },
  toDriver(value: FileAttachment[]) {
    if (!value || value.length === 0) {
      return sql`'{}'::file_attachment[]`;
    }
    const elements = value.map(f =>
      `ROW(${escapeLiteral(f.bucket_id)},${escapeLiteral(f.file_path)})::file_attachment`
    ).join(',');
    return sql.raw(`ARRAY[${elements}]::file_attachment[]`);
  },
  fromDriver(value: string): FileAttachment[] {
    if (!value || value === '{}') return [];
    const inner = value.slice(1, -1);
    const matches = inner.match(/\([^)]*\)/g) || [];
    return matches.map(m => {
      const [bucketId, filePath] = m.slice(1, -1).split(',');
      return { bucket_id: bucketId.trim(), file_path: filePath.trim() };
    });
  },
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  action: varchar("action", { length: 20 }).notNull(),
  /**
   * @type { [key: string]: { before: any; after: any } }
   */
  fieldChanges: jsonb("field_changes"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_audit_log_entity").on(table.entityType, table.entityId),
  index("idx_audit_log_action").on(table.action),
  index("idx_audit_log_created_at").on(table.createdAt),
]);

export const exceptionRecord = pgTable("exception_record", {
  id: uuid("id").primaryKey().defaultRandom(),
  category: varchar("category", { length: 30 }).notNull(),
  severity: varchar("severity", { length: 20 }).notNull(),
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 20 }).notNull().default('open'),
  resolutionNotes: text("resolution_notes"),
  resolvedBy: userProfile("resolved_by"),
  resolvedAt: customTimestamptz("resolved_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_exception_status").on(table.status),
  index("idx_exception_category").on(table.category),
  index("idx_exception_severity").on(table.severity),
  index("idx_exception_entity").on(table.entityType, table.entityId),
]);

export const loanSchedule = pgTable("loan_schedule", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id"),
  lender: varchar("lender", { length: 255 }).notNull(),
  principalAmount: numeric("principal_amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  interestRate: numeric("interest_rate").notNull(),
  totalInstallments: integer("total_installments").notNull().default(0),
  startDate: date("start_date"),
  nextPaymentDate: date("next_payment_date"),
  nextPaymentAmount: numeric("next_payment_amount"),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_loan_schedule_project_id").on(table.projectId),
  index("idx_loan_schedule_status").on(table.status),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [project.id],
    name: "loan_schedule_project_id_fkey",
  }).onDelete("set null"),
]);

export const swopBreakdown = pgTable("swop_breakdown", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id"),
  projectId: uuid("project_id"),
  fromCurrency: varchar("from_currency", { length: 10 }).notNull(),
  toCurrency: varchar("to_currency", { length: 10 }).notNull(),
  fromAmount: numeric("from_amount").notNull(),
  toAmount: numeric("to_amount").notNull(),
  exchangeRate: numeric("exchange_rate").notNull(),
  tradeDate: date("trade_date"),
  referenceNumber: varchar("reference_number", { length: 100 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_swop_breakdown_payment_id").on(table.paymentId),
  index("idx_swop_breakdown_project_id").on(table.projectId),
  foreignKey({
    columns: [table.paymentId],
    foreignColumns: [payment.id],
    name: "swop_breakdown_payment_id_fkey",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [project.id],
    name: "swop_breakdown_project_id_fkey",
  }).onDelete("set null"),
]);

export const reconciliation = pgTable("reconciliation", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentId: uuid("payment_id").notNull(),
  documentId: uuid("document_id").notNull(),
  matchedAmount: numeric("matched_amount").notNull(),
  matchType: varchar("match_type", { length: 20 }).notNull().default('full'),
  status: varchar("status", { length: 20 }).notNull().default('matched'),
  followUpDate: date("follow_up_date"),
  followUpNotes: text("follow_up_notes"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_reconciliation_payment_id").on(table.paymentId),
  index("idx_reconciliation_document_id").on(table.documentId),
  index("idx_reconciliation_status").on(table.status),
  foreignKey({
    columns: [table.paymentId],
    foreignColumns: [payment.id],
    name: "reconciliation_payment_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.documentId],
    foreignColumns: [document.id],
    name: "reconciliation_document_id_fkey",
  }).onDelete("cascade"),
]);

export const paymentAdvice = pgTable("payment_advice", {
  id: uuid("id").primaryKey().defaultRandom(),
  adviceNumber: varchar("advice_number", { length: 50 }).notNull().unique(),
  paymentId: uuid("payment_id").notNull(),
  templateId: uuid("template_id"),
  /**
   * @type { [key: string]: any }
   */
  content: jsonb("content"),
  status: varchar("status", { length: 20 }).notNull().default('draft'),
  fileUrl: text("file_url"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("payment_advice_advice_number_key").on(table.adviceNumber),
  index("idx_payment_advice_payment_id").on(table.paymentId),
  index("idx_payment_advice_status").on(table.status),
  foreignKey({
    columns: [table.paymentId],
    foreignColumns: [payment.id],
    name: "payment_advice_payment_id_fkey",
  }).onDelete("cascade"),
  foreignKey({
    columns: [table.templateId],
    foreignColumns: [template.id],
    name: "payment_advice_template_id_fkey",
  }).onDelete("set null"),
]);

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  paymentNumber: varchar("payment_number", { length: 50 }).notNull().unique(),
  projectId: uuid("project_id"),
  documentId: uuid("document_id"),
  vendor: varchar("vendor", { length: 255 }).notNull(),
  amount: numeric("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  exchangeRate: numeric("exchange_rate"),
  hkdEquivalent: numeric("hkd_equivalent"),
  status: varchar("status", { length: 20 }).notNull().default('draft'),
  paymentMethod: varchar("payment_method", { length: 50 }),
  dueDate: date("due_date"),
  approvalComments: text("approval_comments"),
  approvedBy: userProfile("approved_by"),
  approvedAt: customTimestamptz("approved_at", { precision: 3 }),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("payment_payment_number_key").on(table.paymentNumber),
  index("idx_payment_status").on(table.status),
  index("idx_payment_project_id").on(table.projectId),
  index("idx_payment_document_id").on(table.documentId),
  index("idx_payment_vendor").on(table.vendor),
  index("idx_payment_due_date").on(table.dueDate),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [project.id],
    name: "payment_project_id_fkey",
  }).onDelete("set null"),
  foreignKey({
    columns: [table.documentId],
    foreignColumns: [document.id],
    name: "payment_document_id_fkey",
  }).onDelete("set null"),
]);

export const documentVersion = pgTable("document_version", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull(),
  version: integer("version").notNull(),
  changeSummary: text("change_summary"),
  /**
   * @type { [key: string]: { before: any; after: any } }
   */
  changedFields: jsonb("changed_fields"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
  index("idx_document_version_document_id").on(table.documentId),
  foreignKey({
    columns: [table.documentId],
    foreignColumns: [document.id],
    name: "document_version_document_id_fkey",
  }).onDelete("cascade"),
]);

export const document = pgTable("document", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 30 }).notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  invoiceNumber: varchar("invoice_number", { length: 100 }),
  amount: numeric("amount"),
  currency: varchar("currency", { length: 10 }),
  exchangeRate: numeric("exchange_rate"),
  vendor: varchar("vendor", { length: 255 }),
  invoiceDate: date("invoice_date"),
  projectId: uuid("project_id"),
  status: varchar("status", { length: 30 }).notNull().default('pending-review'),
  extractionConfidence: numeric("extraction_confidence"),
  version: integer("version").notNull().default(1),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  index("idx_document_type").on(table.type),
  index("idx_document_status").on(table.status),
  index("idx_document_project_id").on(table.projectId),
  index("idx_document_invoice_number").on(table.invoiceNumber),
  index("idx_document_vendor").on(table.vendor),
  foreignKey({
    columns: [table.projectId],
    foreignColumns: [project.id],
    name: "document_project_id_fkey",
  }).onDelete("set null"),
]);

export const project = pgTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  budget: numeric("budget").notNull().default('0'),
  currency: varchar("currency", { length: 10 }).notNull().default('HKD'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  startDate: date("start_date"),
  endDate: date("end_date"),
  responsiblePerson: userProfile("responsible_person"),
  contractDocumentId: uuid("contract_document_id"),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("project_code_key").on(table.code),
  index("idx_project_status").on(table.status),
  index("idx_project_code").on(table.code),
  // Complex index: CREATE INDEX idx_project_responsible_person ON project USING btree (((responsible_person).user_id)),
]);

export const template = pgTable("template", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  /**
   * @type { [key: string]: any }
   */
  fieldMapping: jsonb("field_mapping").notNull().default('{}'),
  isDefault: boolean("is_default").notNull().default(false),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
});

export const exchangeRate = pgTable("exchange_rate", {
  id: uuid("id").primaryKey().defaultRandom(),
  currency: varchar("currency", { length: 10 }).notNull().unique(),
  rateToHkd: numeric("rate_to_hkd").notNull(),
  effectiveDate: date("effective_date").notNull().default('CURRENT_DATE'),
  status: varchar("status", { length: 20 }).notNull().default('active'),
  // System field: Creation time (auto-filled, do not modify)
  createdAt: customTimestamptz("_created_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Creator (auto-filled, do not modify)
  createdBy: userProfile("_created_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
  // System field: Update time (auto-filled, do not modify)
  updatedAt: customTimestamptz("_updated_at", { precision: 3 }).notNull().default(sql`CURRENT_TIMESTAMP`),
  // System field: Updater (auto-filled, do not modify)
  updatedBy: userProfile("_updated_by").default(sql`CASE
    WHEN (current_setting('app.user_id'::text, true) = ''::text) THEN NULL`),
}, (table) => [
  uniqueIndex("exchange_rate_currency_key").on(table.currency),
]);

// table aliases
export const auditLogTable = auditLog;
export const documentTable = document;
export const documentVersionTable = documentVersion;
export const exceptionRecordTable = exceptionRecord;
export const exchangeRateTable = exchangeRate;
export const loanScheduleTable = loanSchedule;
export const paymentTable = payment;
export const paymentAdviceTable = paymentAdvice;
export const projectTable = project;
export const reconciliationTable = reconciliation;
export const swopBreakdownTable = swopBreakdown;
export const templateTable = template;
