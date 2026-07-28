import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Reconciliation,
  ReconciliationSummary,
  ReconciliationStatus,
  MatchType,
  PaginatedResponse,
  Payment,
  Document,
} from '@shared/api.interface';

interface ReconciliationListParams {
  page?: number;
  pageSize?: number;
  status?: ReconciliationStatus;
  projectId?: string;
  matchType?: MatchType;
}

interface MatchRequest {
  paymentId: string;
  documentId: string;
  matchedAmount: number;
  matchType: MatchType;
}

interface FollowUpRequest {
  followUpDate: string;
  followUpNotes?: string;
}

export const getSummary = (): Promise<ReconciliationSummary> =>
  axiosForBackend.get('/api/reconciliation/summary').then((r) => r.data);

export const getReconciliations = (
  params: ReconciliationListParams,
): Promise<
  PaginatedResponse<
    Reconciliation & { paymentNumber?: string; invoiceNumber?: string; vendor?: string }
  >
> =>
  axiosForBackend.get('/api/reconciliation', { params }).then((r) => r.data);

export const matchPaymentToDocument = (
  data: MatchRequest,
): Promise<Reconciliation> =>
  axiosForBackend.post('/api/reconciliation/match', data).then((r) => r.data);

export const unmatch = (
  reconciliationId: string,
): Promise<{ success: boolean }> =>
  axiosForBackend
    .post('/api/reconciliation/unmatch', { reconciliationId })
    .then((r) => r.data);

export const setFollowUp = (
  id: string,
  data: FollowUpRequest,
): Promise<Reconciliation> =>
  axiosForBackend
    .patch(`/api/reconciliation/${id}/follow-up`, data)
    .then((r) => r.data);

export const getUnmatchedPayments = (
  projectId?: string,
): Promise<{ items: Payment[] }> =>
  axiosForBackend
    .get('/api/reconciliation/unmatched-payments', { params: { projectId } })
    .then((r) => r.data);

export const getUnmatchedDocuments = (
  projectId?: string,
): Promise<{ items: Document[] }> =>
  axiosForBackend
    .get('/api/reconciliation/unmatched-documents', { params: { projectId } })
    .then((r) => r.data);
