import { axiosForBackend } from '@lark-apaas/client-toolkit/utils/getAxiosForBackend';
import type {
  Project,
  ProjectFinancialSummary,
  ProjectCodeSuggestion,
  Document,
  Payment,
  AuditLog,
  PaginatedResponse,
} from '@shared/api.interface';

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  responsiblePerson?: string;
  startDate?: string;
  endDate?: string;
  minBudget?: number;
  maxBudget?: number;
  search?: string;
}

export interface CreateProjectPayload {
  code: string;
  name: string;
  description?: string;
  budget: number;
  currency: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  responsiblePerson?: string;
}

export interface UpdateProjectPayload {
  code?: string;
  name?: string;
  description?: string;
  budget?: number;
  currency?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  responsiblePerson?: string;
}

export async function listProjects(
  params: ProjectListParams = {},
): Promise<PaginatedResponse<Project>> {
  const { data } = await axiosForBackend.get('/api/projects', { params });
  return data;
}

export async function getProject(id: string): Promise<Project> {
  const { data } = await axiosForBackend.get(`/api/projects/${id}`);
  return data;
}

export async function createProject(
  payload: CreateProjectPayload,
): Promise<Project> {
  const { data } = await axiosForBackend.post('/api/projects', payload);
  return data;
}

export async function updateProject(
  id: string,
  payload: UpdateProjectPayload,
): Promise<Project> {
  const { data } = await axiosForBackend.patch(`/api/projects/${id}`, payload);
  return data;
}

export async function getFinancialSummary(
  id: string,
): Promise<ProjectFinancialSummary> {
  const { data } = await axiosForBackend.get(
    `/api/projects/${id}/financial-summary`,
  );
  return data;
}

export async function getProjectDocuments(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Document>> {
  const { data } = await axiosForBackend.get(`/api/projects/${id}/documents`, {
    params: { page, pageSize },
  });
  return data;
}

export async function getProjectPayments(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<Payment>> {
  const { data } = await axiosForBackend.get(`/api/projects/${id}/payments`, {
    params: { page, pageSize },
  });
  return data;
}

export async function getProjectActivityLog(
  id: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedResponse<AuditLog>> {
  const { data } = await axiosForBackend.get(
    `/api/projects/${id}/activity-log`,
    { params: { page, pageSize } },
  );
  return data;
}

export async function suggestCode(
  prefix?: string,
): Promise<ProjectCodeSuggestion> {
  const { data } = await axiosForBackend.get('/api/projects/suggest-code', {
    params: { prefix },
  });
  return data;
}
