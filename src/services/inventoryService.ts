import { httpClient } from '../api';

type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function extractResults<T>(payload: PaginatedResponse<T> | T[]) {
  if (Array.isArray(payload)) {
    return payload;
  }
  return payload.results ?? [];
}

export type ProductCategory = {
  id: number;
  name: string;
  description: string;
  created_at: string;
};

export type Product = {
  id: number;
  name: string;
  product_number: string | null;
  sku: string;
  barcode: string;
  category: number | null;
  category_name: string | null;
  brand: string;
  model_name: string;
  supplier: number | null;
  supplier_name: string | null;
  unit: string;
  purchase_price: string;
  selling_price: string;
  current_stock: number;
  minimum_stock: number;
  is_low_stock: boolean;
  availability_status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'unavailable';
  description: string;
  status: 'active' | 'inactive' | 'discontinued';
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export type StockReceipt = {
  id: number;
  supplier: number | null;
  supplier_name: string | null;
  invoice_number: string;
  product: number;
  product_name: string;
  quantity: number;
  purchase_price: string;
  batch_number: string;
  date_received: string;
  received_by: number | null;
  received_by_email: string | null;
  batch_additional_expenses: string;
  notes: string;
  receipt_batch: number | null;
};

export type StockMovement = {
  id: number;
  product: number;
  product_name: string;
  product_sku: string;
  movement_type: 'received' | 'sale' | 'adjustment' | 'return';
  quantity_change: number;
  reference_model: string;
  reference_id: string;
  reference_label: string;
  event_date: string;
  note: string;
  created_at: string;
};

export type StockTransfer = {
  id: number;
  product: number;
  product_name: string;
  quantity: number;
  destination: string;
  customer: string;
  selling_price: string;
  date: string;
  sold_by: number | null;
  sold_by_email: string | null;
  notes: string;
};

export type StockAdjustment = {
  id: number;
  product: number;
  product_name: string;
  reason: 'damaged' | 'lost' | 'expired' | 'correction' | 'returned';
  operation: 'increase' | 'decrease';
  quantity: number;
  date: string;
  adjusted_by: number | null;
  adjusted_by_email: string | null;
  notes: string;
};

export async function listProductCategories() {
  const response = await httpClient.get<PaginatedResponse<ProductCategory> | ProductCategory[]>('/inventory/categories/');
  return extractResults(response.data);
}

export async function createProductCategory(payload: Pick<ProductCategory, 'name' | 'description'>) {
  const response = await httpClient.post<ProductCategory>('/inventory/categories/', payload);
  return response.data;
}

export async function seedDefaultProductCategories() {
  const response = await httpClient.post<{ created: string[]; count: number }>('/inventory/categories/seed-defaults/');
  return response.data;
}

type ProductListFilters = {
  search?: string;
  status?: string;
  category?: number;
  low_stock?: boolean;
  include_archived?: boolean;
};

export async function listProducts(filters: ProductListFilters = {}) {
  const response = await httpClient.get<PaginatedResponse<Product> | Product[]>('/inventory/products/', { params: filters });
  return extractResults(response.data);
}

export async function createProduct(payload: {
  name: string;
  sku: string;
  barcode?: string;
  category?: number | null;
  brand?: string;
  model_name?: string;
  supplier?: number | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  current_stock?: number;
  minimum_stock: number;
  description?: string;
  status: Product['status'];
}) {
  const response = await httpClient.post<Product>('/inventory/products/', payload);
  return response.data;
}

export async function updateProduct(productId: number, payload: Partial<Product>) {
  const response = await httpClient.patch<Product>(`/inventory/products/${productId}/`, payload);
  return response.data;
}

export async function archiveProduct(productId: number) {
  const response = await httpClient.post<Product>(`/inventory/products/${productId}/archive/`);
  return response.data;
}

export async function unarchiveProduct(productId: number) {
  const response = await httpClient.post<Product>(`/inventory/products/${productId}/unarchive/`);
  return response.data;
}

export async function listProductHistory(productId: number) {
  const response = await httpClient.get<{ count: number; results: StockMovement[] }>(
    `/inventory/products/${productId}/history/`,
  );
  return response.data;
}

export async function listLowStockProducts() {
  const response = await httpClient.get<{ count: number; results: Product[] }>('/inventory/products/low-stock/');
  return response.data;
}

export async function seedMedicalCatalogue(overwrite = false) {
  const response = await httpClient.post<{
    created_categories: number;
    created_products: number;
    updated_products?: number;
    existing_products: number;
    total_catalogue_items: number;
  }>('/inventory/products/seed-catalogue/', { overwrite });
  return response.data;
}

export async function deleteProductCategory(categoryId: number) {
  await httpClient.delete(`/inventory/categories/${categoryId}/`);
}

export async function forceDeleteProduct(productId: number) {
  const response = await httpClient.post<{ status: string; sku: string }>(
    `/inventory/products/${productId}/force-delete/`,
  );
  return response.data;
}

export async function purgeProductHistory(productId: number) {
  const response = await httpClient.post<{ deleted_count: number }>(
    `/inventory/products/${productId}/purge-history/`,
  );
  return response.data;
}

export async function deleteStockReceipt(receiptId: number) {
  await httpClient.delete(`/inventory/stock-receipts/${receiptId}/`);
}

export async function deleteStockTransfer(transferId: number) {
  await httpClient.delete(`/inventory/stock-transfers/${transferId}/`);
}

export async function deleteStockAdjustment(adjustmentId: number) {
  await httpClient.delete(`/inventory/stock-adjustments/${adjustmentId}/`);
}

export async function listStockReceipts() {
  const response = await httpClient.get<PaginatedResponse<StockReceipt> | StockReceipt[]>('/inventory/stock-receipts/');
  return extractResults(response.data);
}

export async function createStockReceipt(payload: {
  supplier?: number | null;
  invoice_number: string;
  product: number;
  quantity: number;
  purchase_price: number;
  batch_number?: string;
  date_received: string;
  notes?: string;
}) {
  const response = await httpClient.post<StockReceipt>('/inventory/stock-receipts/', payload);
  return response.data;
}

export async function createBulkStockReceipt(payload: {
  supplier?: number | null;
  invoice_number: string;
  date_received: string;
  additional_expenses?: number;
  notes?: string;
  items: Array<{
    product: number;
    quantity: number;
    purchase_price: number;
    batch_number?: string;
    notes?: string;
  }>;
}) {
  const response = await httpClient.post<{
    batch_id: number;
    invoice_number: string;
    count: number;
    results: StockReceipt[];
  }>('/inventory/stock-receipts/bulk-receive/', payload);
  return response.data;
}

export async function listStockTransfers() {
  const response = await httpClient.get<PaginatedResponse<StockTransfer> | StockTransfer[]>('/inventory/stock-transfers/');
  return extractResults(response.data);
}

export async function createStockTransfer(payload: {
  product: number;
  quantity: number;
  destination: string;
  customer?: string;
  selling_price: number;
  date: string;
  notes?: string;
}) {
  const response = await httpClient.post<StockTransfer>('/inventory/stock-transfers/', payload);
  return response.data;
}

export async function listStockAdjustments() {
  const response = await httpClient.get<PaginatedResponse<StockAdjustment> | StockAdjustment[]>(
    '/inventory/stock-adjustments/',
  );
  return extractResults(response.data);
}

export async function createStockAdjustment(payload: {
  product: number;
  reason: StockAdjustment['reason'];
  operation: StockAdjustment['operation'];
  quantity: number;
  date: string;
  notes?: string;
}) {
  const response = await httpClient.post<StockAdjustment>('/inventory/stock-adjustments/', payload);
  return response.data;
}
