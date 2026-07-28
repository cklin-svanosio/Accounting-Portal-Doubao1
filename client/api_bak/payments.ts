import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Payment,
  PaymentListParams,
  PaginatedResponse,
  CreatePaymentRequest,
  UpdatePaymentRequest,
  ApprovalRequest,
  SwopBreakdown,
  CreateSwopBreakdownRequest,
  LoanSchedule,
  LoanScheduleStatus,
  CreateLoanScheduleRequest,
  UpdateLoanScheduleRequest,
} from '@shared/api.interface';

export const getPayments = (
  params: PaymentListParams,
): Promise<PaginatedResponse<Payment>> =>
  axiosForBackend.get('/api/payments', { params }).then((r) => r.data);

export const getPayment = (id: string): Promise<Payment> =>
  axiosForBackend.get(`/api/payments/${id}`).then((r) => r.data);

export const createPayment = (
  data: CreatePaymentRequest,
): Promise<Payment> =>
  axiosForBackend.post('/api/payments', data).then((r) => r.data);

export const updatePayment = (
  id: string,
  data: UpdatePaymentRequest,
): Promise<Payment> =>
  axiosForBackend.patch(`/api/payments/${id}`, data).then((r) => r.data);

export const deletePayment = (id: string): Promise<void> =>
  axiosForBackend.delete(`/api/payments/${id}`).then((r) => r.data);

export const approvePayment = (
  id: string,
  comments?: string,
): Promise<Payment> =>
  axiosForBackend
    .post(`/api/payments/${id}/approve`, { comments } as ApprovalRequest)
    .then((r) => r.data);

export const rejectPayment = (
  id: string,
  comments: string,
): Promise<Payment> =>
  axiosForBackend
    .post(`/api/payments/${id}/reject`, { comments } as ApprovalRequest)
    .then((r) => r.data);

export const requestRevision = (
  id: string,
  comments: string,
): Promise<Payment> =>
  axiosForBackend
    .post(`/api/payments/${id}/request-revision`, {
      comments,
    } as ApprovalRequest)
    .then((r) => r.data);

export const markProcessed = (id: string): Promise<Payment> =>
  axiosForBackend
    .post(`/api/payments/${id}/mark-processed`)
    .then((r) => r.data);

export const getSwopBreakdown = (
  paymentId: string,
): Promise<{ items: SwopBreakdown[] }> =>
  axiosForBackend
    .get(`/api/payments/${paymentId}/swop-breakdown`)
    .then((r) => r.data);

export const createSwopBreakdown = (
  paymentId: string,
  data: CreateSwopBreakdownRequest,
): Promise<SwopBreakdown> =>
  axiosForBackend
    .post(`/api/payments/${paymentId}/swop-breakdown`, data)
    .then((r) => r.data);

export const getLoanSchedules = (
  projectId?: string,
  status?: LoanScheduleStatus,
): Promise<{ items: LoanSchedule[] }> =>
  axiosForBackend
    .get('/api/loan-schedules', { params: { projectId, status } })
    .then((r) => r.data);

export const createLoanSchedule = (
  data: CreateLoanScheduleRequest,
): Promise<LoanSchedule> =>
  axiosForBackend.post('/api/loan-schedules', data).then((r) => r.data);

export const updateLoanSchedule = (
  id: string,
  data: UpdateLoanScheduleRequest,
): Promise<LoanSchedule> =>
  axiosForBackend
    .patch(`/api/loan-schedules/${id}`, data)
    .then((r) => r.data);
