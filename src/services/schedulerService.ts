import { httpClient } from '../api';

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function extractResults<T>(payload: PaginatedResponse<T> | T[]) {
  return Array.isArray(payload) ? payload : payload.results ?? [];
}

export type ScheduledJob = {
  id: number;
  key: string;
  name: string;
  description: string;
  command: string;
  command_kwargs: Record<string, unknown>;
  interval_value: number;
  interval_unit: 'minutes' | 'hours' | 'days' | 'weeks';
  is_active: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  last_status: 'idle' | 'success' | 'failed';
  last_error: string;
  created_at: string;
  updated_at: string;
};

export type ScheduledJobRunLog = {
  id: number;
  job: number;
  job_key: string;
  job_name: string;
  status: 'success' | 'failed';
  output: string;
  error: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  created_at: string;
};

export async function listScheduledJobs() {
  const response = await httpClient.get<PaginatedResponse<ScheduledJob> | ScheduledJob[]>('/scheduled-jobs/');
  return extractResults(response.data);
}

export async function updateScheduledJob(id: number, payload: { interval_value?: number; interval_unit?: string; is_active?: boolean }) {
  const response = await httpClient.patch<ScheduledJob>(`/scheduled-jobs/${id}/`, payload);
  return response.data;
}

export async function runScheduledJobNow(id: number) {
  const response = await httpClient.post<ScheduledJob>(`/scheduled-jobs/${id}/run-now/`);
  return response.data;
}

export async function sendReportNow(period: 'weekly' | 'monthly' | 'both') {
  const response = await httpClient.post<{ status: string; period: string }>('/scheduled-jobs/send-report-now/', {
    period,
  });
  return response.data;
}

export async function deleteSchedulerRunLog(logId: number) {
  await httpClient.delete(`/scheduled-job-runs/${logId}/`);
}

export async function purgeSchedulerRunLogs(jobKey?: string) {
  const response = await httpClient.post<{ deleted_count: number }>('/scheduled-job-runs/purge/', {
    job_key: jobKey || undefined,
  });
  return response.data;
}

export async function listScheduledJobRunLogs(jobKey?: string) {
  const response = await httpClient.get<PaginatedResponse<ScheduledJobRunLog> | ScheduledJobRunLog[]>('/scheduled-job-runs/', {
    params: { job_key: jobKey || undefined },
  });
  return extractResults(response.data);
}
