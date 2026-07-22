import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import BuyerPicker from '../../components/apexcareir/BuyerPicker';
import ProductPicker from '../../components/apexcareir/ProductPicker';
import InvoiceEmailModal from '../../components/apexcareir/InvoiceEmailModal';
import TransactionTimeline from '../../components/apexcareir/TransactionTimeline';
import { useAuth } from '../../hooks';
import { useServerClock } from '../../hooks/useServerClock';
import {
  createSale,
  deleteSale,
  downloadSaleInvoicePdf,
  emailInvoice,
  getCustomerPurchaseHistory,
  listCustomerRecords,
  listCustomers,
  listProducts,
  listSales,
  type Customer,
  type Product,
  type Sale,
} from '../../services';
import { getApiErrorMessage } from '../../utils/apiError';

type SalesTab = 'entry' | 'history' | 'customers';

const tabs: { id: SalesTab; label: string }[] = [
  { id: 'entry', label: 'Sales Entry' },
  { id: 'history', label: 'Sales History' },
  { id: 'customers', label: 'Customer Records' },
];

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0));
}

export default function SalesPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canManage = isSuperAdmin || hasPermission('sales.sales_management');
  const { localDate } = useServerClock();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<SalesTab>('entry');
  const [salesSearch, setSalesSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [lastCreatedSale, setLastCreatedSale] = useState<Sale | null>(null);
  const [lastSaleCustomerEmail, setLastSaleCustomerEmail] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [timelineReference, setTimelineReference] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [emailTarget, setEmailTarget] = useState<{
    id: number;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
  } | null>(null);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedBuyerLogoUrl, setSelectedBuyerLogoUrl] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [entryForm, setEntryForm] = useState({
    customer: '',
    customer_company: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    quantity: 1,
    price: 0,
    discount: 0,
    cost_price: 0,
    date: '',
  });

  useEffect(() => {
    if (localDate) {
      setEntryForm((previous) => (previous.date ? previous : { ...previous, date: localDate }));
    }
  }, [localDate]);

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

  const customersQuery = useQuery({
    queryKey: ['customers', 'picker'],
    queryFn: () => listCustomers(),
  });

  const purchaseHistoryQuery = useQuery({
    queryKey: ['sales', 'purchase-history', selectedCustomerId],
    queryFn: () => getCustomerPurchaseHistory(selectedCustomerId as number),
    enabled: selectedCustomerId !== null,
  });

  const createSaleMutation = useMutation({
    mutationFn: createSale,
    onSuccess: async (sale) => {
      setLastSaleCustomerEmail(entryForm.customer_email);
      setLastCreatedSale(sale);
      setActionMessage(
        `Sale ${sale.sale_number} saved. Invoice ${sale.invoice_number} generated. Buyer details stored for future use.`,
      );
      setSelectedBuyerId('');
      setSelectedProductId('');
      setProductName('');
      setEntryForm((current) => ({
        ...current,
        customer: '',
        customer_company: '',
        customer_phone: '',
        customer_email: '',
        customer_address: '',
        quantity: 1,
        discount: 0,
      }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['sales', 'customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
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
        queryClient.invalidateQueries({ queryKey: ['invoices'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
      ]);
    },
  });

  const emailMutation = useMutation({
    mutationFn: ({ invoiceId, email }: { invoiceId: number; email?: string }) =>
      emailInvoice(invoiceId, email ? { email } : {}),
    onSuccess: (result) => {
      const recipients = result.recipients?.length ? result.recipients.join(', ') : result.recipient;
      setActionMessage(`Invoice emailed to ${recipients}.`);
      setEmailTarget(null);
    },
    onError: (error) =>
      setActionMessage(
        getApiErrorMessage(error, 'Unable to email invoice. Add a valid recipient email and try again.'),
      ),
  });

  const selectedProduct = (productsQuery.data ?? []).find((product) => product.id === Number(selectedProductId));
  const calculatedTotal = useMemo(
    () => Number(entryForm.quantity) * Number(entryForm.price) - Number(entryForm.discount),
    [entryForm.discount, entryForm.price, entryForm.quantity],
  );
  const calculatedProfit = useMemo(
    () => calculatedTotal - Number(entryForm.quantity) * Number(entryForm.cost_price),
    [calculatedTotal, entryForm.cost_price, entryForm.quantity],
  );

  const applyExistingCustomer = (customer: Customer) => {
    setSelectedBuyerId(String(customer.id));
    setSelectedBuyerLogoUrl(customer.logo_url);
    setEntryForm((current) => ({
      ...current,
      customer: customer.name,
      customer_company: customer.company_name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      customer_address: customer.address,
    }));
  };

  const applyExistingProduct = (product: Product) => {
    setSelectedProductId(String(product.id));
    setProductName(product.name);
    setEntryForm((current) => ({
      ...current,
      price: Number(product.selling_price ?? 0),
      cost_price: Number(product.purchase_price ?? 0),
    }));
  };

  const handleEntrySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!entryForm.customer.trim() || (!selectedProductId && !productName.trim())) return;
    setActionMessage('');
    createSaleMutation.mutate({
      customer: entryForm.customer.trim(),
      customer_company: entryForm.customer_company.trim(),
      customer_phone: entryForm.customer_phone.trim(),
      customer_email: entryForm.customer_email.trim(),
      customer_address: entryForm.customer_address.trim(),
      product: selectedProductId ? Number(selectedProductId) : undefined,
      new_product_name: selectedProductId ? undefined : productName.trim(),
      quantity: Number(entryForm.quantity),
      price: Number(entryForm.price),
      discount: Number(entryForm.discount || 0),
      tax: 0,
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

      {actionMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{actionMessage}</div>
      )}

      {activeTab === 'entry' && (
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Create Sale</h3>
            <p className="mt-1 text-xs text-slate-600">
              Sale and invoice numbers are assigned automatically. Buyer details are saved for reuse on future sales.
            </p>
            <form className="mt-3 grid gap-2 sm:grid-cols-2" onSubmit={handleEntrySubmit}>
              <BuyerPicker
                customers={customersQuery.data ?? []}
                value={selectedBuyerId}
                logoUrl={selectedBuyerLogoUrl}
                isLoading={customersQuery.isLoading}
                onSelect={applyExistingCustomer}
                onClear={() => {
                  setSelectedBuyerId('');
                  setSelectedBuyerLogoUrl(null);
                }}
              />
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Customer Name</label>
                <input
                  value={entryForm.customer}
                  onChange={(event) => {
                    setSelectedBuyerId('');
                    setSelectedBuyerLogoUrl(null);
                    setEntryForm((current) => ({ ...current, customer: event.target.value }));
                  }}
                  placeholder="Customer"
                  className="sm:col-span-2"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Company Name</label>
                <input
                  value={entryForm.customer_company}
                  onChange={(event) => setEntryForm((current) => ({ ...current, customer_company: event.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
                <input
                  value={entryForm.customer_phone}
                  onChange={(event) => setEntryForm((current) => ({ ...current, customer_phone: event.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={entryForm.customer_email}
                  onChange={(event) => setEntryForm((current) => ({ ...current, customer_email: event.target.value }))}
                  placeholder="Email"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
                <input
                  value={entryForm.customer_address}
                  onChange={(event) => setEntryForm((current) => ({ ...current, customer_address: event.target.value }))}
                  placeholder="Physical address"
                />
              </div>
              <ProductPicker
                products={productsQuery.data ?? []}
                productId={selectedProductId}
                productName={productName}
                isLoading={productsQuery.isLoading}
                onSelect={applyExistingProduct}
                onNameChange={setProductName}
                onClear={() => setSelectedProductId('')}
              />
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
                {createSaleMutation.isPending ? 'Saving Sale...' : 'Save Sale & Generate Invoice'}
              </button>
            </form>
          </section>

          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Invoice Preview</h3>
            <div className="mt-3 space-y-2 rounded-lg border border-slate-200 bg-white/85 p-3 text-xs">
              <p>
                <span className="text-slate-500">Invoice:</span>{' '}
                <span className="font-semibold">Auto-generated on save</span>
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
                <p className="mt-1">Sale: {lastCreatedSale.sale_number}</p>
                <p>Invoice: {lastCreatedSale.invoice_number}</p>
                <p>Total: {formatCurrency(lastCreatedSale.total)}</p>
                <p>Profit: {formatCurrency(lastCreatedSale.profit)}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="apex-btn-soft !px-2 !py-1"
                    onClick={() =>
                      downloadSaleInvoicePdf(lastCreatedSale.id, `${lastCreatedSale.invoice_number}.pdf`)
                    }
                  >
                    Download PDF
                  </button>
                  {lastCreatedSale.invoice_id && (
                    <button
                      type="button"
                      className="apex-btn-soft !px-2 !py-1"
                      disabled={emailMutation.isPending}
                      onClick={() =>
                        setEmailTarget({
                          id: lastCreatedSale.invoice_id as number,
                          invoiceNumber: lastCreatedSale.invoice_number ?? '',
                          customerName: lastCreatedSale.customer,
                          customerEmail: lastSaleCustomerEmail,
                        })
                      }
                    >
                      Email Invoice
                    </button>
                  )}
                </div>
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
                placeholder="Search sale number, invoice, customer, product..."
                className="w-full md:max-w-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Sale #</th>
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Qty</th>
                  <th className="py-2 pr-2">Total</th>
                  <th className="py-2 pr-2">Payment</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Actions</th>
                  {canManage ? <th className="py-2 pr-2">Admin</th> : null}
                </tr>
              </thead>
              <tbody>
                {(salesHistoryQuery.data ?? []).map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{sale.sale_number}</td>
                    <td className="py-2 pr-2">{sale.invoice_number}</td>
                    <td className="py-2 pr-2">
                      {sale.customer_record ? (
                        <Link
                          to={ADMIN_ROUTES.customer(sale.customer_record)}
                          className="font-medium text-apex-primary hover:underline"
                        >
                          {sale.customer}
                        </Link>
                      ) : (
                        sale.customer
                      )}
                    </td>
                    <td className="py-2 pr-2">{sale.product_name}</td>
                    <td className="py-2 pr-2">{sale.quantity}</td>
                    <td className="py-2 pr-2">{formatCurrency(sale.total)}</td>
                    <td className="py-2 pr-2">{sale.payment_status ?? 'unpaid'}</td>
                    <td className="py-2 pr-2">{sale.date}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() => downloadSaleInvoicePdf(sale.id, `${sale.invoice_number}.pdf`)}
                        >
                          PDF
                        </button>
                        {sale.invoice_id && (
                          <button
                            type="button"
                            className="apex-btn-soft !px-2 !py-1 text-[10px]"
                            disabled={emailMutation.isPending}
                            onClick={() =>
                              setEmailTarget({
                                id: sale.invoice_id as number,
                                invoiceNumber: sale.invoice_number ?? '',
                                customerName: sale.customer,
                                customerEmail: '',
                              })
                            }
                          >
                            Email
                          </button>
                        )}
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() =>
                            setTimelineReference(
                              timelineReference === sale.sale_number ? null : sale.sale_number,
                            )
                          }
                        >
                          Timeline
                        </button>
                      </div>
                    </td>
                    {canManage ? (
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

          {timelineReference && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white/80 p-3">
              <h4 className="text-xs font-semibold text-slate-800">Timeline — {timelineReference}</h4>
              <div className="mt-2">
                <TransactionTimeline referenceNumber={timelineReference} module="sales" />
              </div>
            </div>
          )}
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
                placeholder="Search customer name or number..."
                className="w-full md:max-w-sm"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Customer #</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Sale Count</th>
                  <th className="py-2 pr-2">Total Sales</th>
                  <th className="py-2 pr-2">Last Purchase</th>
                  <th className="py-2 pr-2">History</th>
                </tr>
              </thead>
              <tbody>
                {(customerRecordsQuery.data?.results ?? []).map((record) => (
                  <tr key={`${record.customer}-${record.customer_number}`} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{record.customer_number || '-'}</td>
                    <td className="py-2 pr-2">{record.customer}</td>
                    <td className="py-2 pr-2">{record.sale_count}</td>
                    <td className="py-2 pr-2">{formatCurrency(record.total_sales)}</td>
                    <td className="py-2 pr-2">{record.latest_sale_date ?? '-'}</td>
                    <td className="py-2 pr-2">
                      {record.customer_id ? (
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={ADMIN_ROUTES.customer(record.customer_id)}
                            className="text-[11px] font-medium text-apex-primary hover:underline"
                          >
                            Profile
                          </Link>
                          <button
                            type="button"
                            className="text-[11px] font-medium text-slate-600 hover:underline"
                            onClick={() =>
                              setSelectedCustomerId(
                                selectedCustomerId === record.customer_id ? null : record.customer_id,
                              )
                            }
                          >
                            {selectedCustomerId === record.customer_id ? 'Hide' : 'Quick View'}
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selectedCustomerId && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white/80 p-3">
              <h4 className="text-xs font-semibold text-slate-800">Purchase History</h4>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-2 pr-2">Sale #</th>
                      <th className="py-2 pr-2">Invoice</th>
                      <th className="py-2 pr-2">Product</th>
                      <th className="py-2 pr-2">Total</th>
                      <th className="py-2 pr-2">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(purchaseHistoryQuery.data?.results ?? []).map((sale) => (
                      <tr key={sale.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2">{sale.sale_number}</td>
                        <td className="py-2 pr-2">{sale.invoice_number}</td>
                        <td className="py-2 pr-2">{sale.product_name}</td>
                        <td className="py-2 pr-2">{formatCurrency(sale.total)}</td>
                        <td className="py-2 pr-2">{sale.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      <InvoiceEmailModal
        open={emailTarget !== null}
        invoiceNumber={emailTarget?.invoiceNumber}
        customerName={emailTarget?.customerName}
        defaultEmail={emailTarget?.customerEmail ?? ''}
        isSending={emailMutation.isPending}
        onClose={() => setEmailTarget(null)}
        onSend={(emails) => {
          if (!emailTarget) return;
          emailMutation.mutate({ invoiceId: emailTarget.id, email: emails });
        }}
      />
    </div>
  );
}
