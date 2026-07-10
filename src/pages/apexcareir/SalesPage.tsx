import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { useAuth } from '../../hooks';
import { createSale, deleteSale, listCustomerRecords, listProducts, listSales, type Sale } from '../../services';

type SalesTab = 'entry' | 'history' | 'customers';

const tabs: { id: SalesTab; label: string }[] = [
  { id: 'entry', label: 'Sales Entry' },
  { id: 'history', label: 'Sales History' },
  { id: 'customers', label: 'Customer Records' },
];

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0));
}

function generateInvoiceNumber() {
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0',
  )}${String(now.getSeconds()).padStart(2, '0')}`;
  return `INV-${stamp}`;
}

export default function SalesPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SalesTab>('entry');
  const [salesSearch, setSalesSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [invoiceDraft, setInvoiceDraft] = useState(generateInvoiceNumber());
  const [lastCreatedSale, setLastCreatedSale] = useState<Sale | null>(null);
  const [entryForm, setEntryForm] = useState({
    customer: '',
    product: '',
    quantity: 1,
    price: 0,
    discount: 0,
    tax: 0,
    cost_price: 0,
    date: new Date().toISOString().slice(0, 10),
  });

  const productsQuery = useQuery({
    queryKey: ['sales', 'entry-products'],
    queryFn: () => listProducts({ status: 'active' }),
  });

  const salesHistoryQuery = useQuery({
    queryKey: ['sales', 'history', salesSearch],
    queryFn: () => listSales({ search: salesSearch || undefined }),
  });

  const customerRecordsQuery = useQuery({
    queryKey: ['sales', 'customers', customerSearch],
    queryFn: () => listCustomerRecords(customerSearch || undefined),
  });

  const createSaleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: async (sale) => {
      setLastCreatedSale(sale);
      setInvoiceDraft(generateInvoiceNumber());
      setEntryForm((current) => ({ ...current, customer: '', quantity: 1, discount: 0, tax: 0 }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['sales', 'customers'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'low-stock'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
      ]);
    },
  });

  const deleteSaleMutation = useMutation({
    mutationFn: deleteSale,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['sales', 'customers'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
      ]);
    },
  });

  const selectedProduct = (productsQuery.data ?? []).find((product) => product.id === Number(entryForm.product));
  const calculatedTotal = useMemo(
    () => Number(entryForm.quantity) * Number(entryForm.price) - Number(entryForm.discount) + Number(entryForm.tax),
    [entryForm.discount, entryForm.price, entryForm.quantity, entryForm.tax],
  );
  const calculatedProfit = useMemo(
    () => calculatedTotal - Number(entryForm.quantity) * Number(entryForm.cost_price),
    [calculatedTotal, entryForm.cost_price, entryForm.quantity],
  );

  const handleEntrySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entryForm.customer.trim() || !entryForm.product) return;
    createSaleMutation.mutate({
      invoice_number: invoiceDraft,
      customer: entryForm.customer.trim(),
      product: Number(entryForm.product),
      quantity: Number(entryForm.quantity),
      price: Number(entryForm.price),
      discount: Number(entryForm.discount || 0),
      tax: Number(entryForm.tax || 0),
      cost_price: Number(entryForm.cost_price),
      date: entryForm.date,
    });
  };

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="apex-glass-panel p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`apex-tab ${activeTab === tab.id ? 'apex-tab-active' : 'apex-tab-idle'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'entry' && (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Create Sale</h3>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleEntrySubmit}>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Invoice Number</label>
                <input
                  value={invoiceDraft}
                  onChange={(event) => setInvoiceDraft(event.target.value)}
                  placeholder="Invoice number"
                  className="sm:col-span-2"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Customer Name</label>
                <input
                  value={entryForm.customer}
                  onChange={(event) => setEntryForm((current) => ({ ...current, customer: event.target.value }))}
                  placeholder="Customer"
                  className="sm:col-span-2"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Product</label>
                <select
                  value={entryForm.product}
                  onChange={(event) => {
                    const productId = event.target.value;
                    const product = (productsQuery.data ?? []).find((item) => item.id === Number(productId));
                    setEntryForm((current) => ({
                      ...current,
                      product: productId,
                      price: Number(product?.selling_price ?? 0),
                      cost_price: Number(product?.purchase_price ?? 0),
                    }));
                  }}
                  className="sm:col-span-2"
                  required
                >
                  <option value="">Select product</option>
                  {(productsQuery.data ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku}) - Stock: {product.current_stock}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={entryForm.quantity}
                  onChange={(event) => setEntryForm((current) => ({ ...current, quantity: Number(event.target.value) }))}
                  placeholder="Quantity"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.price}
                  onChange={(event) => setEntryForm((current) => ({ ...current, price: Number(event.target.value) }))}
                  placeholder="Price"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Discount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.discount}
                  onChange={(event) => setEntryForm((current) => ({ ...current, discount: Number(event.target.value) }))}
                  placeholder="Discount"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Tax</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.tax}
                  onChange={(event) => setEntryForm((current) => ({ ...current, tax: Number(event.target.value) }))}
                  placeholder="Tax"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Cost Price</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={entryForm.cost_price}
                  onChange={(event) => setEntryForm((current) => ({ ...current, cost_price: Number(event.target.value) }))}
                  placeholder="Cost price"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Sale Date</label>
                <input
                  type="date"
                  value={entryForm.date}
                  onChange={(event) => setEntryForm((current) => ({ ...current, date: event.target.value }))}
                  required
                />
              </div>
              <button disabled={createSaleMutation.isPending} className="sm:col-span-2">
                {createSaleMutation.isPending ? 'Saving Sale...' : 'Save Sale'}
              </button>
            </form>
          </section>

          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Invoice Preview</h3>
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/85 p-3 text-xs">
              <p>
                <span className="text-slate-500">Invoice:</span> <span className="font-semibold">{invoiceDraft}</span>
              </p>
              <p>
                <span className="text-slate-500">Customer:</span>{' '}
                <span className="font-semibold">{entryForm.customer || '-'}</span>
              </p>
              <p>
                <span className="text-slate-500">Product:</span>{' '}
                <span className="font-semibold">{selectedProduct?.name || '-'}</span>
              </p>
              <p>
                <span className="text-slate-500">Quantity:</span> <span className="font-semibold">{entryForm.quantity}</span>
              </p>
              <p>
                <span className="text-slate-500">Total:</span>{' '}
                <span className="font-semibold">{formatCurrency(calculatedTotal)}</span>
              </p>
              <p>
                <span className="text-slate-500">Estimated Profit:</span>{' '}
                <span className={`font-semibold ${calculatedProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {formatCurrency(calculatedProfit)}
                </span>
              </p>
            </div>

            {lastCreatedSale && (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <p className="font-semibold">Latest sale saved successfully.</p>
                <p className="mt-1">Invoice: {lastCreatedSale.invoice_number}</p>
                <p>Total: {formatCurrency(lastCreatedSale.total)}</p>
                <p>Profit: {formatCurrency(lastCreatedSale.profit)}</p>
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'history' && (
        <section className="apex-glass-panel apex-animate-in p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="w-full md:max-w-sm">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Search Sales</label>
              <input
                value={salesSearch}
                onChange={(event) => setSalesSearch(event.target.value)}
                placeholder="Search invoice, customer, product..."
                className="w-full md:max-w-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Total</th>
                  <th className="py-2 pr-2">Profit</th>
                  <th className="py-2 pr-2">Date</th>
                  {isSuperAdmin ? <th className="py-2 pr-2">Admin</th> : null}
                </tr>
              </thead>
              <tbody>
                {(salesHistoryQuery.data ?? []).map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{sale.invoice_number}</td>
                    <td className="py-2 pr-2">{sale.customer}</td>
                    <td className="py-2 pr-2">{sale.product_name}</td>
                    <td className="py-2 pr-2">{sale.quantity}</td>
                    <td className="py-2 pr-2">{formatCurrency(sale.total)}</td>
                    <td className={`py-2 pr-2 ${Number(sale.profit) < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {formatCurrency(sale.profit)}
                    </td>
                    <td className="py-2 pr-2">{sale.date}</td>
                    {isSuperAdmin ? (
                      <td className="py-2 pr-2">
                        <AdminConfirmButton
                          label="Delete"
                          confirmMessage={`Delete sale ${sale.invoice_number}? Stock will be restored.`}
                          onConfirm={() => deleteSaleMutation.mutateAsync(sale.id)}
                          disabled={deleteSaleMutation.isPending}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === 'customers' && (
        <section className="apex-glass-panel apex-animate-in p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="w-full md:max-w-sm">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Search Customers</label>
              <input
                value={customerSearch}
                onChange={(event) => setCustomerSearch(event.target.value)}
                placeholder="Search customer..."
                className="w-full md:max-w-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Sale Count</th>
                  <th className="py-2 pr-2">Total Sales</th>
                  <th className="py-2 pr-2">Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                {(customerRecordsQuery.data?.results ?? []).map((record) => (
                  <tr key={record.customer} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{record.customer}</td>
                    <td className="py-2 pr-2">{record.sale_count}</td>
                    <td className="py-2 pr-2">{formatCurrency(record.total_sales)}</td>
                    <td className="py-2 pr-2">{record.latest_sale_date ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
