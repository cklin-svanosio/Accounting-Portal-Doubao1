import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  DashboardKpis,
  InvoiceVolumePoint,
  PaymentStatusBreakdown,
  ActivityItem,
  ProjectFinancialSummaryResponse,
  PaymentStatusDashboardResponse,
  ExceptionReportResponse,
  AuditLog,
  PaginatedResponse,
  AuditLogListParams,
} from '@shared/api.interface';

// ─── Dashboard ────────────────────────────────────────────────────────

export const getDashboardKpis = (): Promise<DashboardKpis> =>
  axiosForBackend.get('/api/dashboard/kpis').then((r) => r.data);

export const getInvoiceVolume = (
  months = 6,
): Promise<{ items: InvoiceVolumePoint[] }> =>
  axiosForBackend
    .get('/api/dashboard/invoice-volume', { params: { months } })
    .then((r) => r.data);

export const getPaymentStatusDistribution = (): Promise<{
  items: PaymentStatusBreakdown[];
}> =>
  axiosForBackend.get('/api/dashboard/payment-status').then((r) => r.data);

export const getRecentActivity = (
  limit = 10,
): Promise<{ items: ActivityItem[] }> =>
  axiosForBackend
    .get('/api/dashboard/recent-activity', { params: { limit } })
    .then((r) => r.data);

// ─── Reports ──────────────────────────────────────────────────────────

export const getReportInvoiceVolume = (
  months = 12,
): Promise<{ items: InvoiceVolumePoint[] }> =>
  axiosForBackend
    .get('/api/reports/invoice-volume', { params: { months } })
    .then((r) => r.data);

export const getProjectFinancialSummary = (
  status?: string,
): Promise<ProjectFinancialSummaryResponse> =>
  axiosForBackend
    .get('/api/reports/project-financial-summary', { params: { status } })
    .then((r) => r.data);

export const getPaymentStatusDashboard = (
  params?: { startDate?: string; endDate?: string },
): Promise<PaymentStatusDashboardResponse> =>
  axiosForBackend
    .get('/api/reports/payment-status-dashboard', { params })
    .then((r) => r.data);

export const getExceptionReport = (params?: {
  category?: string;
  severity?: string;
  status?: string;
}): Promise<ExceptionReportResponse> =>
  axiosForBackend
    .get('/api/reports/exceptions', { params })
    .then((r) => r.data);

export const getAuditLogs = (
  params: AuditLogListParams,
): Promise<PaginatedResponse<AuditLog>> =>
  axiosForBackend.get('/api/audit-logs', { params }).then((r) => r.data);
