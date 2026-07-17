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

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'partially_paid' | 'cancelled';
export type InvoicePaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export type InvoiceLineItem = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  description: string;
  quantity: number;
  unit_price: string;
  cost_price: string;
  discount: string;
  tax: string;
  line_total: string;
  sort_order: number;
};

export type InvoicePayment = {
  id: number;
  amount: string;
  payment_date: string;
  payment_method: string;
  reference: string;
  notes: string;
  recorded_by: number | null;
  recorded_by_email: string | null;
  created_at: string;
};

export type Invoice = {
  id: number;
  invoice_number: string;
  sale: number;
  sale_number: string;
  customer: number | null;
  customer_name: string;
  customer_company: string;
  customer_phone: string;
  customer_email: string;
  customer_address: string;
  customer_logo_url: string | null;
  status: InvoiceStatus;
  payment_status: InvoicePaymentStatus;
  amount_paid: string;
  balance_due: string;
  subtotal: string;
  discount: string;
  tax: string;
  grand_total: string;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: string;
  cost_price: string;
  line_items: InvoiceLineItem[];
  line_count: number;
  payments: InvoicePayment[];
  pdf_url: string | null;
  has_stored_pdf: boolean;
  pdf_generated_at: string | null;
  generated_by: number | null;
  generated_by_email: string | null;
  issued_at: string | null;
  paid_at: string | null;
  invoice_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineInput = {
  product: number;
  quantity: number;
  unit_price: number;
  cost_price?: number;
  discount?: number;
  tax?: number;
  description?: string;
};

export type InvoiceInput = {
  customer_name: string;
  customer_id?: number;
  customer_company?: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_logo?: File | null;
  lines?: InvoiceLineInput[];
  product?: number;
  quantity?: number;
  unit_price?: number;
  cost_price?: number;
  discount?: number;
  tax?: number;
  invoice_date?: string;
  status?: InvoiceStatus;
  payment_status?: InvoicePaymentStatus;
  notes?: string;
};

type InvoiceListParams = {
  search?: string;
  status?: InvoiceStatus;
  payment_status?: InvoicePaymentStatus;
  start_date?: string;
  end_date?: string;
};

function buildInvoiceFormData(payload: InvoiceInput) {
  const formData = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    if (key === 'customer_logo' && value instanceof File) {
      formData.append(key, value);
    } else if (key === 'lines' && Array.isArray(value)) {
      formData.append(key, JSON.stringify(value));
    } else {
      formData.append(key, String(value));
    }
  });
  return formData;
}

export async function listInvoices(params: InvoiceListParams = {}) {
  const response = await httpClient.get<PaginatedResponse<Invoice> | Invoice[]>('/invoices/', { params });
  return extractResults(response.data);
}

export async function getInvoice(invoiceId: number) {
  const response = await httpClient.get<Invoice>(`/invoices/${invoiceId}/`);
  return response.data;
}

export async function createInvoice(payload: InvoiceInput) {
  const hasLogo = payload.customer_logo instanceof File;
  if (hasLogo) {
    const response = await httpClient.post<Invoice>('/invoices/', buildInvoiceFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
  const { customer_logo: _logo, ...jsonPayload } = payload;
  const response = await httpClient.post<Invoice>('/invoices/', jsonPayload);
  return response.data;
}

export async function updateInvoice(invoiceId: number, payload: InvoiceInput) {
  const hasLogo = payload.customer_logo instanceof File;
  if (hasLogo) {
    const response = await httpClient.patch<Invoice>(`/invoices/${invoiceId}/`, buildInvoiceFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
  const { customer_logo: _logo, ...jsonPayload } = payload;
  const response = await httpClient.patch<Invoice>(`/invoices/${invoiceId}/`, jsonPayload);
  return response.data;
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function getInvoiceTimeline(invoiceId: number) {
  const response = await httpClient.get<{ count: number; results: import('./timelineService').TransactionEvent[] }>(
    `/invoices/${invoiceId}/timeline/`,
  );
  return response.data;
}

export async function downloadInvoicePdf(invoiceId: number, filename: string) {
  const response = await httpClient.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
  triggerBlobDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

export async function printInvoicePdf(invoiceId: number) {
  const response = await httpClient.get(`/invoices/${invoiceId}/pdf/`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.addEventListener('load', () => printWindow.print());
  }
}

export async function downloadSaleInvoicePdf(saleId: number, filename: string) {
  const response = await httpClient.get(`/sales/${saleId}/invoice-pdf/`, { responseType: 'blob' });
  triggerBlobDownload(new Blob([response.data], { type: 'application/pdf' }), filename);
}

export async function regenerateInvoice(invoiceId: number) {
  const response = await httpClient.post<Invoice>(`/invoices/${invoiceId}/regenerate/`);
  return response.data;
}

export type InvoiceEmailInput = {
  email?: string;
  emails?: string[];
};

export async function emailInvoice(invoiceId: number, payload: InvoiceEmailInput = {}) {
  const body =
    payload.emails && payload.emails.length > 0
      ? { emails: payload.emails }
      : payload.email
        ? { email: payload.email }
        : {};
  const response = await httpClient.post<{ status: string; recipients: string[]; recipient: string }>(
    `/invoices/${invoiceId}/email/`,
    body,
  );
  return response.data;
}

export async function updateInvoiceStatus(
  invoiceId: number,
  payload: { status?: InvoiceStatus; payment_status?: InvoicePaymentStatus },
) {
  const response = await httpClient.patch<Invoice>(`/invoices/${invoiceId}/status/`, payload);
  return response.data;
}

export async function deleteInvoice(invoiceId: number) {
  await httpClient.delete(`/invoices/${invoiceId}/`);
}

export type InvoicePaymentInput = {
  amount: number;
  payment_date?: string;
  payment_method?: string;
  reference?: string;
  notes?: string;
};

export async function listInvoicePayments(invoiceId: number) {
  const response = await httpClient.get<{ count: number; results: InvoicePayment[] }>(`/invoices/${invoiceId}/payments/`);
  return response.data;
}

export async function recordInvoicePayment(invoiceId: number, payload: InvoicePaymentInput) {
  const response = await httpClient.post<{ payment: InvoicePayment; invoice: Invoice }>(
    `/invoices/${invoiceId}/payments/`,
    payload,
  );
  return response.data;
}
