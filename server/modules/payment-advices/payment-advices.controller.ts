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
import { PaymentAdvicesService } from './payment-advices.service';
import type {
  PaymentAdvice,
  PaymentAdviceDetail,
  PaymentAdviceListParams,
  GenerateAdviceRequest,
  UpdatePaymentAdviceRequest,
  PaginatedResponse,
} from '@shared/api.interface';

interface AuthenticatedRequest extends Request {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
  };
}

@Controller('api/payment-advices')
export class PaymentAdvicesController {
  constructor(private readonly paymentAdvicesService: PaymentAdvicesService) {}

  /**
   * List payment advices with pagination and filters.
   * GET /api/payment-advices
   */
  @Get()
  async getPaymentAdvices(
    @Query() query: PaymentAdviceListParams,
  ): Promise<PaginatedResponse<PaymentAdvice>> {
    const params: PaymentAdviceListParams = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      status: query.status,
      projectId: query.projectId,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
    };
    return this.paymentAdvicesService.getPaymentAdvices(params);
  }

  /**
   * Get a single payment advice by ID with related records.
   * GET /api/payment-advices/:id
   */
  @Get(':id')
  async getPaymentAdviceById(
    @Param('id') id: string,
  ): Promise<PaymentAdviceDetail> {
    return this.paymentAdvicesService.getPaymentAdviceById(id);
  }

  /**
   * Generate a new payment advice from a payment.
   * POST /api/payment-advices/generate
   */
  @NeedLogin()
  @Post('generate')
  async generateAdvice(
    @Req() req: AuthenticatedRequest,
    @Body() body: GenerateAdviceRequest,
  ): Promise<PaymentAdvice> {
    const { userId } = req.userContext;
    return this.paymentAdvicesService.generateAdvice(body, userId);
  }

  /**
   * Update a payment advice.
   * PATCH /api/payment-advices/:id
   */
  @NeedLogin()
  @Patch(':id')
  async updatePaymentAdvice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: UpdatePaymentAdviceRequest,
  ): Promise<PaymentAdvice> {
    const { userId } = req.userContext;
    return this.paymentAdvicesService.updatePaymentAdvice(id, body, userId);
  }

  /**
   * Finalize a payment advice.
   * POST /api/payment-advices/:id/finalize
   */
  @NeedLogin()
  @Post(':id/finalize')
  async finalizeAdvice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<PaymentAdvice> {
    const { userId } = req.userContext;
    return this.paymentAdvicesService.finalizeAdvice(id, userId);
  }

  /**
   * Delete a payment advice.
   * DELETE /api/payment-advices/:id
   */
  @NeedLogin()
  @Delete(':id')
  async deletePaymentAdvice(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    await this.paymentAdvicesService.deletePaymentAdvice(id, userId);
  }

  /**
   * Get payments for dropdown (used in generate modal).
   * GET /api/payment-advices/meta/payments
   */
  @Get('meta/payments')
  async getPaymentsForDropdown(): Promise<{
    items: Array<{
      id: string;
      paymentNumber: string;
      vendor: string;
      amount: number;
      currency: string;
    }>;
  }> {
    const items = await this.paymentAdvicesService.getPaymentsForDropdown();
    return { items };
  }

  /**
   * Get templates for dropdown (used in generate modal).
   * GET /api/payment-advices/meta/templates
   */
  @Get('meta/templates')
  async getTemplatesForDropdown(): Promise<{
    items: Array<{ id: string; name: string; isDefault: boolean }>;
  }> {
    const items = await this.paymentAdvicesService.getTemplatesForDropdown();
    return { items };
  }
}
