import { axiosForBackend, logger } from './index';
import type {
  ExchangeRate,
  Template,
  ProjectCodeConfig,
} from '@shared/api.interface';

// ─── Exchange Rates ─────────────────────────────────────────────────

export async function getExchangeRates(status?: 'active' | 'inactive'): Promise<ExchangeRate[]> {
  try {
    const params: Record<string, string> = {};
    if (status) params.status = status;
    const res = await axiosForBackend.get<{ items: ExchangeRate[] }>('/api/exchange-rates', { params });
    return res.data.items;
  } catch (err) {
    logger.error('Failed to fetch exchange rates', err);
    throw err;
  }
}

export async function createExchangeRate(data: {
  currency: string;
  rateToHkd: number;
  effectiveDate: string;
}): Promise<ExchangeRate> {
  try {
    const res = await axiosForBackend.post<ExchangeRate>('/api/exchange-rates', data);
    return res.data;
  } catch (err) {
    logger.error('Failed to create exchange rate', err);
    throw err;
  }
}

export async function updateExchangeRate(
  id: string,
  data: { rateToHkd?: number; effectiveDate?: string; status?: 'active' | 'inactive' },
): Promise<ExchangeRate> {
  try {
    const res = await axiosForBackend.patch<ExchangeRate>(`/api/exchange-rates/${id}`, data);
    return res.data;
  } catch (err) {
    logger.error(`Failed to update exchange rate ${id}`, err);
    throw err;
  }
}

export async function deactivateExchangeRate(id: string): Promise<ExchangeRate> {
  return updateExchangeRate(id, { status: 'inactive' });
}

// ─── Project Codes ──────────────────────────────────────────────────

export async function getProjectCodeConfig(): Promise<ProjectCodeConfig> {
  try {
    const res = await axiosForBackend.get<ProjectCodeConfig>('/api/settings/project-codes');
    return res.data;
  } catch (err) {
    logger.error('Failed to fetch project code config', err);
    throw err;
  }
}

export async function updateProjectCodeConfig(data: {
  prefix?: string;
  sequenceDigits?: number;
  namingConvention?: string;
}): Promise<ProjectCodeConfig> {
  try {
    const res = await axiosForBackend.put<ProjectCodeConfig>('/api/settings/project-codes', data);
    return res.data;
  } catch (err) {
    logger.error('Failed to update project code config', err);
    throw err;
  }
}

// ─── Templates ──────────────────────────────────────────────────────

export async function getTemplates(type?: string): Promise<Template[]> {
  try {
    const params: Record<string, string> = {};
    if (type) params.type = type;
    const res = await axiosForBackend.get<{ items: Template[] }>('/api/templates', { params });
    return res.data.items;
  } catch (err) {
    logger.error('Failed to fetch templates', err);
    throw err;
  }
}

export async function createTemplate(data: {
  name: string;
  type: string;
  fieldMapping: Record<string, unknown>;
  isDefault?: boolean;
}): Promise<Template> {
  try {
    const res = await axiosForBackend.post<Template>('/api/templates', data);
    return res.data;
  } catch (err) {
    logger.error('Failed to create template', err);
    throw err;
  }
}

export async function updateTemplate(
  id: string,
  data: {
    name?: string;
    type?: string;
    fieldMapping?: Record<string, unknown>;
    isDefault?: boolean;
  },
): Promise<Template> {
  try {
    const res = await axiosForBackend.patch<Template>(`/api/templates/${id}`, data);
    return res.data;
  } catch (err) {
    logger.error(`Failed to update template ${id}`, err);
    throw err;
  }
}

export async function setDefaultTemplate(id: string): Promise<Template> {
  return updateTemplate(id, { isDefault: true });
}
