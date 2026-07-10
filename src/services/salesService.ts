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

export type Sale = {
  id: number;
  invoice_number: string;
  customer: string;
  product: number;
  product_name: string;
  product_sku: string;
  quantity: number;
  price: string;
  discount: string;
  tax: string;
  total: string;
  cost_price: string;
  profit: string;
  salesperson: number | null;
  salesperson_email: string | null;
  date: string;
  created_at: string;
};

export type CustomerRecord = {
  customer: string;
  total_sales: string;
  sale_count: number;
  latest_sale_date: string | null;
};

type SalesListParams = {
  search?: string;
  customer?: string;
  product?: number;
  start_date?: string;
  end_date?: string;
};

export async function listSales(params: SalesListParams = {}) {
  const response = await httpClient.get<PaginatedResponse<Sale> | Sale[]>('/sales/', { params });
  return extractResults(response.data);
}

export async function createSale(payload: {
  invoice_number?: string;
  customer: string;
  product: number;
  quantity: number;
  price: number;
  discount?: number;
  tax?: number;
  cost_price: number;
  date: string;
}) {
  const response = await httpClient.post<Sale>('/sales/', payload);
  return response.data;
}

export async function deleteSale(saleId: number) {
  await httpClient.delete(`/sales/${saleId}/`);
}

export async function listCustomerRecords(query?: string) {
  const response = await httpClient.get<{ count: number; results: CustomerRecord[] }>('/sales/customers/', {
    params: { q: query || undefined },
  });
  return response.data;
}
