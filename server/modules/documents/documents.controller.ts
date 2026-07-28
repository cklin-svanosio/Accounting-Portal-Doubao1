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
import { DocumentsService } from './documents.service';
import type {
  CreateDocumentRequest,
  Document,
  DocumentListParams,
  DocumentVersion,
  DuplicateCheckResult,
  PaginatedResponse,
  ReviewDocumentRequest,
} from '@shared/api.interface';

interface AuthenticatedRequest extends Request {
  userContext: {
    userId: string;
    tenantId: string;
    appId: string;
  };
}

@Controller('api/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * List documents with pagination and filters.
   * GET /api/documents
   */
  @Get()
  async getDocuments(
    @Query() query: DocumentListParams,
  ): Promise<PaginatedResponse<Document>> {
    const params: DocumentListParams = {
      page: query.page ? Number(query.page) : undefined,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
      type: query.type,
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
    return this.documentsService.getDocuments(params);
  }

  /**
   * Create a document with AI extraction and duplicate detection.
   * POST /api/documents
   */
  @NeedLogin()
  @Post()
  async createDocument(
    @Req() req: AuthenticatedRequest,
    @Body() body: CreateDocumentRequest,
  ): Promise<{ document: Document; isDuplicate: boolean }> {
    const { userId } = req.userContext;
    return this.documentsService.createDocumentWithExtraction(body, userId);
  }

  /**
   * Check if an invoice number already exists (duplicate detection).
   * GET /api/documents/check-duplicate?invoiceNumber=xxx
   */
  @Get('check-duplicate')
  async checkDuplicate(
    @Query('invoiceNumber') invoiceNumber: string,
  ): Promise<DuplicateCheckResult> {
    return this.documentsService.checkDuplicate(invoiceNumber);
  }

  /**
   * Get a single document by ID.
   * GET /api/documents/:id
   */
  @Get(':id')
  async getDocumentById(
    @Param('id') id: string,
  ): Promise<Document> {
    return this.documentsService.getDocumentById(id);
  }

  /**
   * Update document metadata.
   * PATCH /api/documents/:id
   */
  @NeedLogin()
  @Patch(':id')
  async updateDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: Partial<Document>,
  ): Promise<Document> {
    const { userId } = req.userContext;
    return this.documentsService.updateDocument(id, body, userId);
  }

  /**
   * Soft delete a document (archive).
   * DELETE /api/documents/:id
   */
  @NeedLogin()
  @Delete(':id')
  async deleteDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ): Promise<void> {
    const { userId } = req.userContext;
    return this.documentsService.deleteDocument(id, userId);
  }

  /**
   * Review a document (approve / reject / correct).
   * PATCH /api/documents/:id/review
   */
  @NeedLogin()
  @Patch(':id/review')
  async reviewDocument(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: ReviewDocumentRequest,
  ): Promise<Document> {
    const { userId } = req.userContext;
    return this.documentsService.reviewDocument(
      id,
      body.action,
      body.fields,
      userId,
    );
  }

  /**
   * Get all versions for a document.
   * GET /api/documents/:id/versions
   */
  @Get(':id/versions')
  async getDocumentVersions(
    @Param('id') id: string,
  ): Promise<{ items: DocumentVersion[] }> {
    return this.documentsService.getDocumentVersions(id);
  }
}
