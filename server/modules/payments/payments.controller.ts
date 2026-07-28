import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { PaymentsService } from './payments.service';
import type {
  Payment,
  PaymentListParams,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ApprovalRequest,
  PaginatedResponse,
  SwopBreakdown,
  CreateSwopBreakdownRequest,
  LoanSchedule,
  LoanScheduleStatus,
  CreateLoanScheduleRequest,
  UpdateLoanScheduleRequest,
} from '@shared/api.interface';

interface AuthenticatedRequest extends Request {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
  };
}

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * List payments with pagination and filters.
   * GET /api/payments
   */
  @Get()
  async getPayments(
    @Query() query: PaymentListParams,
  ): Promise<PaginatedResponse<Payment>> {
    const params: PaymentListParams = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      status: query.status,
      projectId: query.projectId,
      vendor: query.vendor,
      minAmount:
        query.minAmount !== undefined ? Number(query.minAmount) : undefined,
      maxAmount:
        query.maxAmount !== undefined ? Number(query.maxAmount) : undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
    };
    return this.paymentsService.getPayments(params);
  }

  /**
   * Get a single payment by ID.
   * GET /api/payments/:id
   */
  @Get(':id')
  async getPaymentById(@Param('id') id: string): Promise<Payment> {
    return this.paymentsService.getPaymentById(id);
  }

  /**
   * Create a new payment.
   * POST /api/payments
   */
  @NeedLogin()
  @Post()
  async createPayment(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreatePaymentRequest,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.createPayment(body, userId);
  }

  /**
   * Update a payment.
   * PATCH /api/payments/:id
   */
  @NeedLogin()
  @Patch(':id')
  async updatePayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdatePaymentRequest,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.updatePayment(id, body, userId);
  }

  /**
   * Delete a payment.
   * DELETE /api/payments/:id
   */
  @NeedLogin()
  @Delete(':id')
  async deletePayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.paymentsService.deletePayment(id, userId);
  }

  /**
   * Approve a payment.
   * POST /api/payments/:id/approve
   */
  @NeedLogin()
  @Post(':id/approve')
  async approvePayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ApprovalRequest,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.approvePayment(id, body.comments, userId);
  }

  /**
   * Reject a payment.
   * POST /api/payments/:id/reject
   */
  @NeedLogin()
  @Post(':id/reject')
  async rejectPayment(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ApprovalRequest,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.rejectPayment(id, body.comments ?? '', userId);
  }

  /**
   * Request revision (send back to draft).
   * POST /api/payments/:id/request-revision
   */
  @NeedLogin()
  @Post(':id/request-revision')
  async requestRevision(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ApprovalRequest,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.requestRevision(
      id,
      body.comments ?? '',
      userId,
    );
  }

  /**
   * Mark payment as processed.
   * POST /api/payments/:id/mark-processed
   */
  @NeedLogin()
  @Post(':id/mark-processed')
  async markProcessed(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<Payment> {
    const { userId } = req.userContext;
    return this.paymentsService.markProcessed(id, userId);
  }

  /**
   * Get SWOP breakdown for a payment.
   * GET /api/payments/:id/swop-breakdown
   */
  @Get(':id/swop-breakdown')
  async getSwopBreakdown(
    @Param('id') id: string,
  ): Promise<{ items: SwopBreakdown[] }> {
    return this.paymentsService.getSwopBreakdown(id);
  }

  /**
   * Create SWOP breakdown for a payment.
   * POST /api/payments/:id/swop-breakdown
   */
  @NeedLogin()
  @Post(':id/swop-breakdown')
  async createSwopBreakdown(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: CreateSwopBreakdownRequest,
  ): Promise<SwopBreakdown> {
    const { userId } = req.userContext;
    return this.paymentsService.createSwopBreakdown(id, body, userId);
  }
}

@Controller('api/loan-schedules')
export class LoanSchedulesController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * List loan schedules, optionally filtered by project or status.
   * GET /api/loan-schedules
   */
  @Get()
  async getLoanSchedules(
    @Query('projectId') projectId?: string,
    @Query('status') status?: LoanScheduleStatus,
  ): Promise<{ items: LoanSchedule[] }> {
    return this.paymentsService.getLoanSchedules(projectId, status);
  }

  /**
   * Create a loan schedule.
   * POST /api/loan-schedules
   */
  @NeedLogin()
  @Post()
  async createLoanSchedule(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateLoanScheduleRequest,
  ): Promise<LoanSchedule> {
    const { userId } = req.userContext;
    return this.paymentsService.createLoanSchedule(body, userId);
  }

  /**
   * Update a loan schedule.
   * PATCH /api/loan-schedules/:id
   */
  @NeedLogin()
  @Patch(':id')
  async updateLoanSchedule(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdateLoanScheduleRequest,
  ): Promise<LoanSchedule> {
    const { userId } = req.userContext;
    return this.paymentsService.updateLoanSchedule(id, body, userId);
  }
}
