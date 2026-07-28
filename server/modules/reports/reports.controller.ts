import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ReportsService } from './reports.service';
import type {
  DashboardKpis,
  InvoiceVolumePoint,
  PaymentStatusBreakdown,
  ActivityItem,
  ProjectFinancialSummaryResponse,
  PaymentStatusDashboardResponse,
  ExceptionReportResponse,
  ExceptionRecord,
  PaginatedResponse,
  AuditLog,
  ExceptionListParams,
  AuditLogListParams,
  UpdateExceptionRequest,
} from '@shared/api.interface';

interface AuthenticatedRequest extends Request {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
  };
}

@Controller('api')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────

  @Get('dashboard/kpis')
  async getDashboardKpis(): Promise<DashboardKpis> {
    return this.reportsService.getDashboardKpis();
  }

  @Get('dashboard/invoice-volume')
  async getInvoiceVolume(
    @Query('months') months?: string,
  ): Promise<{ items: InvoiceVolumePoint[] }> {
    return this.reportsService.getInvoiceVolume(
      months ? parseInt(months, 10) : 6,
    );
  }

  @Get('dashboard/payment-status')
  async getPaymentStatusDistribution(): Promise<{ items: PaymentStatusBreakdown[] }> {
    return this.reportsService.getPaymentStatusDistribution();
  }

  @Get('dashboard/recent-activity')
  async getRecentActivity(
    @Query('limit') limit?: string,
  ): Promise<{ items: ActivityItem[] }> {
    return this.reportsService.getRecentActivity(
      limit ? parseInt(limit, 10) : 10,
    );
  }

  // ─── Reports ────────────────────────────────────────────────────────

  @Get('reports/invoice-volume')
  async getReportInvoiceVolume(
    @Query('months') months?: string,
  ): Promise<{ items: InvoiceVolumePoint[] }> {
    return this.reportsService.getInvoiceVolume(
      months ? parseInt(months, 10) : 12,
    );
  }

  @Get('reports/project-financial-summary')
  async getProjectFinancialSummary(
    @Query('status') status?: string,
  ): Promise<ProjectFinancialSummaryResponse> {
    return this.reportsService.getProjectFinancialSummary(status);
  }

  @Get('reports/payment-status-dashboard')
  async getPaymentStatusDashboard(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<PaymentStatusDashboardResponse> {
    return this.reportsService.getPaymentStatusDashboard(startDate, endDate);
  }

  @Get('reports/exceptions')
  async getExceptionReport(
    @Query('category') category?: string,
    @Query('severity') severity?: string,
    @Query('status') status?: string,
  ): Promise<ExceptionReportResponse> {
    return this.reportsService.getExceptionReport(category, severity, status);
  }

  @Get('audit-logs')
  async getAuditLogs(
    @Query() query: AuditLogListParams,
  ): Promise<PaginatedResponse<AuditLog>> {
    const params: AuditLogListParams = {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      entityType: query.entityType,
      userId: query.userId,
      startDate: query.startDate,
      endDate: query.endDate,
    };
    return this.reportsService.getAuditLogs(params);
  }

  // ─── Exceptions Center ──────────────────────────────────────────────

  @Get('exceptions')
  async getExceptions(
    @Query() query: ExceptionListParams,
  ): Promise<PaginatedResponse<ExceptionRecord>> {
    const params: ExceptionListParams = {
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
      status: query.status,
      category: query.category,
      severity: query.severity,
    };
    return this.reportsService.getExceptions(params);
  }

  @Get('exceptions/:id')
  async getExceptionById(@Param('id') id: string): Promise<ExceptionRecord> {
    return this.reportsService.getExceptionById(id);
  }

  @NeedLogin()
  @Patch('exceptions/:id')
  async updateException(
    @Param('id') id: string,
    @Body() body: UpdateExceptionRequest,
    @Req() req: AuthenticatedRequest,
  ): Promise<ExceptionRecord> {
    const { userId } = req.userContext;
    return this.reportsService.updateException(id, body, userId);
  }
}
