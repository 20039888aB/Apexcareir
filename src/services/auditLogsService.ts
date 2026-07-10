import { httpClient } from '../api';

export type AuditLogItem = {
  id: number;
  user: number | null;
  user_email: string | null;
  action: string;
  module: string;
  description: string;
  target_model: string;
  target_id: string;
  target_repr: string;
  ip_address: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuditLogResponse = {
  count: number;
  results: AuditLogItem[];
};

export type AuditLogFilters = {
  search?: string;
  module?: string;
  action?: string;
  start_date?: string;
  end_date?: string;
  limit?: number;
};

export async function deleteAuditLog(logId: number) {
  await httpClient.delete(`/audit-logs/${logId}/`);
}

export async function purgeAuditLogs() {
  const response = await httpClient.post<{ deleted_count: number }>('/audit-logs/purge/');
  return response.data;
}

export async function listAuditLogs(filters: AuditLogFilters = {}) {
  const response = await httpClient.get<AuditLogResponse>('/audit-logs/', {
    params: {
      search: filters.search || undefined,
      module: filters.module || undefined,
      action: filters.action || undefined,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      limit: filters.limit || 100,
    },
  });
  return response.data;
}
