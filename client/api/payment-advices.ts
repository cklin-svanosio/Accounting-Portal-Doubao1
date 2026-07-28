import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  PaymentAdvice,
  PaymentAdviceDetail,
  PaymentAdviceListParams,
  GenerateAdviceRequest,
  UpdatePaymentAdviceRequest,
  PaginatedResponse,
} from '@shared/api.interface';

export const getPaymentAdvices = (
  params: PaymentAdviceListParams,
): Promise<PaginatedResponse<PaymentAdvice>> =>
  axiosForBackend.get('/api/payment-advices', { params }).then((r) => r.data);

export const getPaymentAdvice = (id: string): Promise<PaymentAdviceDetail> =>
  axiosForBackend.get(`/api/payment-advices/${id}`).then((r) => r.data);

export const generateAdvice = (
  data: GenerateAdviceRequest,
): Promise<PaymentAdvice> =>
  axiosForBackend.post('/api/payment-advices/generate', data).then((r) => r.data);

export const updatePaymentAdvice = (
  id: string,
  data: UpdatePaymentAdviceRequest,
): Promise<PaymentAdvice> =>
  axiosForBackend
    .patch(`/api/payment-advices/${id}`, data)
    .then((r) => r.data);

export const finalizeAdvice = (id: string): Promise<PaymentAdvice> =>
  axiosForBackend
    .post(`/api/payment-advices/${id}/finalize`)
    .then((r) => r.data);

export const deletePaymentAdvice = (id: string): Promise<void> =>
  axiosForBackend.delete(`/api/payment-advices/${id}`).then((r) => r.data);

export const getPaymentsForDropdown = (): Promise<{
  items: Array<{
    id: string;
    paymentNumber: string;
    vendor: string;
    amount: number;
    currency: string;
  }>;
}> =>
  axiosForBackend
    .get('/api/payment-advices/meta/payments')
    .then((r) => r.data);

export const getTemplatesForDropdown = (): Promise<{
  items: Array<{ id: string; name: string; isDefault: boolean }>;
}> =>
  axiosForBackend
    .get('/api/payment-advices/meta/templates')
    .then((r) => r.data);
