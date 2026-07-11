import { httpClient } from '../api';

export type ReportType = 'sales' | 'inventory' | 'profit' | 'expenses' | 'performance';
export type ExportType = 'csv' | 'xlsx' | 'pdf';

export type ReportResponse = {
  title: string;
  filename: string;
  start_date: string;
  end_date: string;
  period_label?: string;
  generated_at?: string;
  summary: Record<string, number>;
  columns: Array<{ key: string; label: string }>;
  results: Array<Record<string, string | number | boolean | null>>;
};

type ReportFilters = {
  start_date?: string;
  end_date?: string;
  month?: string;
  date?: string;
  search?: string;
};

function reportPath(reportType: ReportType) {
  return `/reports/${reportType}/`;
}

export async function getReport(reportType: ReportType, filters: ReportFilters = {}) {
  const response = await httpClient.get<ReportResponse>(reportPath(reportType), {
    params: {
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      month: filters.month || undefined,
      date: filters.date || undefined,
      search: filters.search || undefined,
    },
  });
  return response.data;
}

export async function exportReport(reportType: ReportType, exportType: ExportType, filters: ReportFilters = {}) {
  const response = await httpClient.get<Blob>(reportPath(reportType), {
    params: {
      export: exportType,
      start_date: filters.start_date || undefined,
      end_date: filters.end_date || undefined,
      month: filters.month || undefined,
      date: filters.date || undefined,
      search: filters.search || undefined,
    },
    responseType: 'blob',
  });

  const contentTypeHeader = response.headers['content-type'];
  const mimeType = typeof contentTypeHeader === 'string' ? contentTypeHeader : undefined;
  const blob = new Blob([response.data], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const filename = `${reportType}-report.${exportType}`;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
