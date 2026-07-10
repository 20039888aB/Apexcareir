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

export type Supplier = {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  products_supplied: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  purchase_count: number;
  total_items_received: number;
  total_purchase_amount: string;
  last_purchase_date: string | null;
};

export type SupplierInvoice = {
  id: number;
  invoice_number: string;
  product: number;
  product_name: string;
  supplier: number;
  supplier_name: string;
  quantity: number;
  purchase_price: string;
  batch_number: string;
  date_received: string;
  notes: string;
  created_at: string;
};

export async function listSuppliers(search?: string) {
  const response = await httpClient.get<PaginatedResponse<Supplier> | Supplier[]>('/suppliers/', {
    params: { search: search || undefined },
  });
  return extractResults(response.data);
}

export async function createSupplier(payload: {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  products_supplied?: string;
  is_active?: boolean;
}) {
  const response = await httpClient.post<Supplier>('/suppliers/', payload);
  return response.data;
}

export async function updateSupplier(supplierId: number, payload: Partial<Supplier>) {
  const response = await httpClient.patch<Supplier>(`/suppliers/${supplierId}/`, payload);
  return response.data;
}

export async function listSupplierInvoices(supplierId: number) {
  const response = await httpClient.get<{ count: number; results: SupplierInvoice[] }>(`/suppliers/${supplierId}/invoices/`);
  return response.data;
}
