import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { NeedLogin } from '@lark-apaas/fullstack-nestjs-core';
import { ReconciliationService } from './reconciliation.service';
import type {
  Reconciliation,
  ReconciliationSummary,
  ReconciliationStatus,
  MatchType,
  PaginatedResponse,
  Payment,
  Document,
} from '@shared/api.interface';

interface AuthenticatedRequest extends Request {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
  };
}

interface MatchRequest {
  paymentId: string;
  documentId: string;
  matchedAmount: number;
  matchType: MatchType;
}

interface UnmatchRequest {
  reconciliationId: string;
}

interface FollowUpRequest {
  followUpDate: string;
  followUpNotes?: string;
}

@Controller('api/reconciliation')
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Get reconciliation summary stats.
   * GET /api/reconciliation/summary
   */
  @Get('summary')
  async getSummary(): Promise<ReconciliationSummary> {
    return this.reconciliationService.getSummary();
  }

  /**
   * List reconciliations with pagination and filters.
   * GET /api/reconciliation
   */
  @Get()
  async getReconciliations(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: ReconciliationStatus,
    @Query('projectId') projectId?: string,
    @Query('matchType') matchType?: MatchType,
  ): Promise<
    PaginatedResponse<Reconciliation & { paymentNumber?: string; invoiceNumber?: string; vendor?: string }>
  > {
    return this.reconciliationService.getReconciliations({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      projectId,
      matchType,
    });
  }

  /**
   * Match a payment to a document (create reconciliation).
   * POST /api/reconciliation/match
   */
  @NeedLogin()
  @Post('match')
  async matchPaymentToDocument(
    @Req() req: AuthenticatedRequest,
    @Body() body: MatchRequest,
  ): Promise<Reconciliation> {
    const { userId } = req.userContext;
    return this.reconciliationService.matchPaymentToDocument(
      body.paymentId,
      body.documentId,
      Number(body.matchedAmount),
      body.matchType,
      userId,
    );
  }

  /**
   * Unmatch (delete) a reconciliation.
   * POST /api/reconciliation/unmatch
   */
  @NeedLogin()
  @Post('unmatch')
  async unmatch(
    @Req() req: AuthenticatedRequest,
    @Body() body: UnmatchRequest,
  ): Promise<{ success: boolean }> {
    const { userId } = req.userContext;
    return this.reconciliationService.unmatch(body.reconciliationId, userId);
  }

  /**
   * Set follow-up date and notes on a partial reconciliation.
   * PATCH /api/reconciliation/:id/follow-up
   */
  @NeedLogin()
  @Patch(':id/follow-up')
  async setFollowUp(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: FollowUpRequest,
  ): Promise<Reconciliation> {
    const { userId } = req.userContext;
    return this.reconciliationService.setFollowUp(
      id,
      body.followUpDate,
      body.followUpNotes,
      userId,
    );
  }

  /**
   * List unmatched payments.
   * GET /api/reconciliation/unmatched-payments
   */
  @Get('unmatched-payments')
  async getUnmatchedPayments(
    @Query('projectId') projectId?: string,
  ): Promise<{ items: Payment[] }> {
    return this.reconciliationService.getUnmatchedPayments(projectId);
  }

  /**
   * List unmatched documents (invoices).
   * GET /api/reconciliation/unmatched-documents
   */
  @Get('unmatched-documents')
  async getUnmatchedDocuments(
    @Query('projectId') projectId?: string,
  ): Promise<{ items: Document[] }> {
    return this.reconciliationService.getUnmatchedDocuments(projectId);
  }
}
