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
  sale_number: string;
  invoice_number: string;
  invoice_id: number | null;
  invoice_status: string | null;
  payment_status: string | null;
  customer: string;
  customer_record: number | null;
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
  updated_at: string;
};

export type CustomerRecord = {
  customer: string;
  customer_number: string;
  customer_id: number | null;
  total_sales: string;
  sale_count: number;
  latest_sale_date: string | null;
};

export type Customer = {
  id: number;
  customer_number: string;
  name: string;
  company_name: string;
  phone: string;
  email: string;
  address: string;
  logo: string | null;
  logo_url: string | null;
  is_active: boolean;
  total_invoices?: number;
  total_spent?: string;
  latest_invoice_date?: string | null;
  created_at: string;
  updated_at: string;
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
  customer: string;
  customer_phone?: string;
  customer_email?: string;
  customer_address?: string;
  customer_company?: string;
  product?: number;
  new_product_name?: string;
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

export async function deleteCustomer(customerId: number) {
  await httpClient.delete(`/customers/${customerId}/`);
}

export async function listCustomerRecords(query?: string) {
  const response = await httpClient.get<{ count: number; results: CustomerRecord[] }>('/sales/customers/', {
    params: { q: query || undefined },
  });
  return response.data;
}

export async function listCustomers(search?: string) {
  const response = await httpClient.get<PaginatedResponse<Customer> | Customer[]>('/customers/', {
    params: { search: search || undefined },
  });
  return extractResults(response.data);
}

export async function getCustomer(customerId: number) {
  const response = await httpClient.get<Customer & { total_invoices: number; total_spent: string; latest_invoice_date: string | null }>(
    `/customers/${customerId}/`,
  );
  return response.data;
}

export async function getCustomerInvoices(customerId: number) {
  const response = await httpClient.get<{ count: number; results: import('./invoiceService').Invoice[] }>(
    `/customers/${customerId}/invoices/`,
  );
  return response.data;
}

export async function getCustomerPurchaseHistory(customerId: number) {
  const response = await httpClient.get<{ count: number; results: Sale[] }>(`/customers/${customerId}/purchase-history/`);
  return response.data;
}
