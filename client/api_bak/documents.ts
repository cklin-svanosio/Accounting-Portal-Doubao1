import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Document,
  DocumentVersion,
  DocumentListParams,
  PaginatedResponse,
  CreateDocumentRequest,
  DuplicateCheckResult,
  ReviewDocumentRequest,
} from '@shared/api.interface';

export const getDocuments = (
  params: DocumentListParams,
): Promise<PaginatedResponse<Document>> =>
  axiosForBackend.get('/api/documents', { params }).then((r) => r.data);

export const getDocument = (id: string): Promise<Document> =>
  axiosForBackend.get(`/api/documents/${id}`).then((r) => r.data);

export const createDocument = (
  data: CreateDocumentRequest,
): Promise<{ document: Document; isDuplicate: boolean }> =>
  axiosForBackend.post('/api/documents', data).then((r) => r.data);

export const reviewDocument = (
  id: string,
  data: ReviewDocumentRequest,
): Promise<Document> =>
  axiosForBackend
    .patch(`/api/documents/${id}/review`, data)
    .then((r) => r.data);

export const updateDocument = (
  id: string,
  data: Partial<Document>,
): Promise<Document> =>
  axiosForBackend.patch(`/api/documents/${id}`, data).then((r) => r.data);

export const deleteDocument = (id: string): Promise<void> =>
  axiosForBackend.delete(`/api/documents/${id}`).then((r) => r.data);

export const getDocumentVersions = (
  id: string,
): Promise<{ items: DocumentVersion[] }> =>
  axiosForBackend.get(`/api/documents/${id}/versions`).then((r) => r.data);

export const checkDuplicate = (
  invoiceNumber: string,
): Promise<DuplicateCheckResult> =>
  axiosForBackend
    .get('/api/documents/check-duplicate', { params: { invoiceNumber } })
    .then((r) => r.data);
