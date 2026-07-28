import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  ExceptionRecord,
  ExceptionListParams,
  PaginatedResponse,
  UpdateExceptionRequest,
} from '@shared/api.interface';

export const getExceptions = (
  params: ExceptionListParams,
): Promise<PaginatedResponse<ExceptionRecord>> =>
  axiosForBackend.get('/api/exceptions', { params }).then((r) => r.data);

export const getExceptionById = (id: string): Promise<ExceptionRecord> =>
  axiosForBackend.get(`/api/exceptions/${id}`).then((r) => r.data);

export const updateException = (
  id: string,
  data: UpdateExceptionRequest,
): Promise<ExceptionRecord> =>
  axiosForBackend.patch(`/api/exceptions/${id}`, data).then((r) => r.data);
