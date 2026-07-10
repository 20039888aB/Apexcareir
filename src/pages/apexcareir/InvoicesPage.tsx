import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { InvoiceActivitySummary } from '../../components/apexcareir/TransactionTimeline';
import InvoiceEmailModal from '../../components/apexcareir/InvoiceEmailModal';
import InvoicePaymentModal from '../../components/apexcareir/InvoicePaymentModal';
import InvoiceLineEditor, { calculateLinesTotal, createInitialInvoiceLines, type InvoiceLineForm } from '../../components/apexcareir/InvoiceLineEditor';
import BuyerPicker from '../../components/apexcareir/BuyerPicker';
import {
  createInvoice,
  downloadInvoicePdf,
  emailInvoice,
  listInvoices,
  listCustomers,
  listProducts,
  printInvoicePdf,
  recordInvoicePayment,
  regenerateInvoice,
  updateInvoice,
  updateInvoiceStatus,
  type Invoice,
  type InvoiceInput,
  type InvoicePaymentStatus,
  type InvoiceStatus,
  type Customer,
} from '../../services';

type InvoicesTab = 'list' | 'create' | 'edit';

const emptyForm = {
  customer_name: '',
  customer_company: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  product: '',
  quantity: '1',
  unit_price: '',
  cost_price: '',
  discount: '0',
  tax: '0',
  invoice_date: new Date().toISOString().slice(0, 10),
  status: 'draft' as InvoiceStatus,
  payment_status: 'unpaid' as InvoicePaymentStatus,
  notes: '',
};

function parseAmount(value: string | number, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0));
}

function statusBadgeClass(value: string) {
  if (value === 'paid') return 'bg-emerald-100 text-emerald-800';
  if (value === 'partially_paid') return 'bg-amber-100 text-amber-800';
  if (value === 'cancelled') return 'bg-red-100 text-red-800';
  if (value === 'issued') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}

function invoiceToForm(invoice: Invoice) {
  return {
    customer_name: invoice.customer_name,
    customer_company: invoice.customer_company,
    customer_phone: invoice.customer_phone,
    customer_email: invoice.customer_email,
    customer_address: invoice.customer_address,
    product: String(invoice.product),
    quantity: String(invoice.quantity),
    unit_price: String(invoice.unit_price),
    cost_price: String(invoice.cost_price),
    discount: String(invoice.discount),
    tax: String(invoice.tax),
    invoice_date: invoice.invoice_date,
    status: invoice.status,
    payment_status: invoice.payment_status,
    notes: invoice.notes,
  };
}

export default function InvoicesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<InvoicesTab>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<InvoicePaymentStatus | ''>('');
  const [selectedReference, setSelectedReference] = useState<string | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [customerLogoFile, setCustomerLogoFile] = useState<File | null>(null);
  const [actionMessage, setActionMessage] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [selectedBuyerId, setSelectedBuyerId] = useState('');
  const [selectedBuyerLogoUrl, setSelectedBuyerLogoUrl] = useState<string | null>(null);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLineForm[]>(createInitialInvoiceLines);
  const [paymentTarget, setPaymentTarget] = useState<Invoice | null>(null);
  const [emailTarget, setEmailTarget] = useState<{
    id: number;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
  } | null>(null);

  const invoicesQuery = useQuery({
    queryKey: ['invoices', search, statusFilter, paymentFilter],
    queryFn: () =>
      listInvoices({
        search: search || undefined,
        status: statusFilter || undefined,
        payment_status: paymentFilter || undefined,
      }),
  });

  const productsQuery = useQuery({
    queryKey: ['invoices', 'products'],
    queryFn: () => listProducts({ status: 'active' }),
  });

  const customersQuery = useQuery({
    queryKey: ['customers', 'picker'],
    queryFn: () => listCustomers(),
  });

  useEffect(() => {
    if (editingInvoice) {
      setForm(invoiceToForm(editingInvoice));
      setCustomerLogoFile(null);
      setActiveTab('edit');
    }
  }, [editingInvoice]);

  const selectedProduct = (productsQuery.data ?? []).find((product) => product.id === Number(form.product));

  const calculatedSubtotal = useMemo(() => {
    if (activeTab === 'create') {
      return calculateLinesTotal(invoiceLines);
    }
    return parseAmount(form.quantity) * parseAmount(form.unit_price);
  }, [activeTab, form.quantity, form.unit_price, invoiceLines]);

  const calculatedDiscount = useMemo(() => parseAmount(form.discount), [form.discount]);
  const calculatedTax = useMemo(() => parseAmount(form.tax), [form.tax]);

  const calculatedTotal = useMemo(
    () => calculatedSubtotal - calculatedDiscount + calculatedTax,
    [calculatedDiscount, calculatedSubtotal, calculatedTax],
  );

  const calculatedCostTotal = useMemo(
    () => parseAmount(form.quantity) * parseAmount(form.cost_price),
    [form.cost_price, form.quantity],
  );

  const calculatedProfit = useMemo(
    () => calculatedTotal - calculatedCostTotal,
    [calculatedCostTotal, calculatedTotal],
  );

  const invalidateInvoices = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['invoices'] }),
      queryClient.invalidateQueries({ queryKey: ['customers'] }),
      queryClient.invalidateQueries({ queryKey: ['sales'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: (payload: InvoiceInput) => createInvoice(payload),
    onSuccess: async (invoice) => {
      setActionMessage(`Invoice ${invoice.invoice_number} created. Buyer "${invoice.customer_name}" saved for future use.`);
      setForm(emptyForm);
      setSelectedBuyerId('');
      setCustomerLogoFile(null);
      setActiveTab('list');
      await invalidateInvoices();
    },
    onError: () => setActionMessage('Unable to create invoice. Check product stock and required fields.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ invoiceId, payload }: { invoiceId: number; payload: InvoiceInput }) =>
      updateInvoice(invoiceId, payload),
    onSuccess: async (invoice) => {
      setActionMessage(`Invoice ${invoice.invoice_number} updated successfully.`);
      setEditingInvoice(null);
      setCustomerLogoFile(null);
      setActiveTab('list');
      await invalidateInvoices();
    },
    onError: () => setActionMessage('Unable to update invoice. Check stock levels if quantity changed.'),
  });

  const emailMutation = useMutation({
    mutationFn: ({ invoiceId, email }: { invoiceId: number; email?: string }) =>
      emailInvoice(invoiceId, email ? { email } : {}),
    onSuccess: async (result) => {
      const recipients = result.recipients?.length ? result.recipients.join(', ') : result.recipient;
      setActionMessage(`Invoice emailed to ${recipients}.`);
      setEmailTarget(null);
      await invalidateInvoices();
    },
    onError: () => setActionMessage('Unable to email invoice. Add a valid recipient email and try again.'),
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateInvoice,
    onSuccess: async () => {
      setActionMessage('Invoice regenerated successfully.');
      await invalidateInvoices();
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({
      invoiceId,
      status,
      payment_status,
    }: {
      invoiceId: number;
      status?: InvoiceStatus;
      payment_status?: InvoicePaymentStatus;
    }) => updateInvoiceStatus(invoiceId, { status, payment_status }),
    onSuccess: async () => {
      setActionMessage('Invoice status updated.');
      await invalidateInvoices();
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: number;
      payload: { amount: number; payment_date: string; payment_method: string; reference: string; notes: string };
    }) => recordInvoicePayment(invoiceId, payload),
    onSuccess: async () => {
      setActionMessage('Payment recorded successfully.');
      setPaymentTarget(null);
      await invalidateInvoices();
    },
    onError: () => setActionMessage('Unable to record payment. Check the amount and try again.'),
  });

  const applyExistingCustomer = (customer: Customer) => {
    setSelectedBuyerId(String(customer.id));
    setSelectedBuyerLogoUrl(customer.logo_url);
    setForm((current) => ({
      ...current,
      customer_name: customer.name,
      customer_company: customer.company_name,
      customer_phone: customer.phone,
      customer_email: customer.email,
      customer_address: customer.address,
    }));
  };

  const buildPayload = (): InvoiceInput => {
    const base = {
      customer_name: form.customer_name.trim(),
      customer_id: selectedBuyerId ? Number(selectedBuyerId) : undefined,
      customer_company: form.customer_company.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_email: form.customer_email.trim(),
      customer_address: form.customer_address.trim(),
      customer_logo: customerLogoFile,
      invoice_date: form.invoice_date,
      status: form.status,
      payment_status: form.payment_status,
      notes: form.notes,
    };

    if (activeTab === 'create') {
      const lines = invoiceLines
        .filter((line) => line.product)
        .map((line) => ({
          product: Number(line.product),
          quantity: parseAmount(line.quantity, 1),
          unit_price: parseAmount(line.unit_price),
          cost_price: parseAmount(line.cost_price),
          discount: parseAmount(line.discount),
          tax: parseAmount(line.tax),
        }));
      if (lines.length > 1) {
        return { ...base, lines };
      }
      const first = lines[0];
      return {
        ...base,
        product: first?.product,
        quantity: first?.quantity,
        unit_price: first?.unit_price,
        cost_price: first?.cost_price,
        discount: first?.discount,
        tax: first?.tax,
      };
    }

    return {
      ...base,
      product: Number(form.product),
      quantity: parseAmount(form.quantity, 1),
      unit_price: parseAmount(form.unit_price),
      cost_price: parseAmount(form.cost_price),
      discount: parseAmount(form.discount),
      tax: parseAmount(form.tax),
    };
  };

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.customer_name.trim() || !invoiceLines.some((line) => line.product)) return;
    setActionMessage('');
    createMutation.mutate(buildPayload());
  };

  const handleEditSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingInvoice || !form.customer_name.trim()) return;
    setActionMessage('');
    updateMutation.mutate({ invoiceId: editingInvoice.id, payload: buildPayload() });
  };

  const renderInvoiceForm = (mode: 'create' | 'edit') => (
    <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={mode === 'create' ? handleCreateSubmit : handleEditSubmit}>
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
        <label className="mb-1 block text-xs font-semibold text-slate-700">Buyer Name</label>
        <input
          value={form.customer_name}
          onChange={(event) => {
            setSelectedBuyerId('');
            setSelectedBuyerLogoUrl(null);
            setForm((current) => ({ ...current, customer_name: event.target.value }));
          }}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Company</label>
        <input
          value={form.customer_company}
          onChange={(event) => setForm((current) => ({ ...current, customer_company: event.target.value }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Phone</label>
        <input
          value={form.customer_phone}
          onChange={(event) => setForm((current) => ({ ...current, customer_phone: event.target.value }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Email</label>
        <input
          type="email"
          value={form.customer_email}
          onChange={(event) => setForm((current) => ({ ...current, customer_email: event.target.value }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Buyer Logo</label>
        <input type="file" accept="image/*" onChange={(event) => setCustomerLogoFile(event.target.files?.[0] ?? null)} />
        {editingInvoice?.customer_logo_url && !customerLogoFile && !selectedBuyerLogoUrl && (
          <img src={editingInvoice.customer_logo_url} alt="Buyer logo" className="mt-2 h-12 w-auto rounded border border-slate-200" />
        )}
        {selectedBuyerLogoUrl && !customerLogoFile && (
          <img src={selectedBuyerLogoUrl} alt="Buyer logo" className="mt-2 h-12 w-auto rounded border border-slate-200" />
        )}
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-700">Address</label>
        <input
          value={form.customer_address}
          onChange={(event) => setForm((current) => ({ ...current, customer_address: event.target.value }))}
        />
      </div>

      {mode === 'create' ? (
        <InvoiceLineEditor
          lines={invoiceLines}
          products={productsQuery.data ?? []}
          onChange={setInvoiceLines}
        />
      ) : (
        <>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Product</label>
            <select
              value={form.product}
              onChange={(event) => {
                const product = (productsQuery.data ?? []).find((item) => item.id === Number(event.target.value));
                setForm((current) => ({
                  ...current,
                  product: event.target.value,
                  unit_price: product?.selling_price ?? current.unit_price,
                  cost_price: product?.purchase_price ?? current.cost_price,
                }));
              }}
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
              step="1"
              value={form.quantity}
              onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Unit Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.unit_price}
              onChange={(event) => setForm((current) => ({ ...current, unit_price: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Cost Price</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.cost_price}
              onChange={(event) => setForm((current) => ({ ...current, cost_price: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Discount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.discount}
              onChange={(event) => setForm((current) => ({ ...current, discount: event.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Tax</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.tax}
              onChange={(event) => setForm((current) => ({ ...current, tax: event.target.value }))}
            />
          </div>
        </>
      )}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Invoice Date</label>
        <input
          type="date"
          value={form.invoice_date}
          onChange={(event) => setForm((current) => ({ ...current, invoice_date: event.target.value }))}
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
        <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as InvoiceStatus }))}>
          <option value="draft">Draft</option>
          <option value="issued">Issued</option>
          <option value="paid">Paid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Status</label>
        <select
          value={form.payment_status}
          onChange={(event) =>
            setForm((current) => ({ ...current, payment_status: event.target.value as InvoicePaymentStatus }))
          }
        >
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
        <textarea
          value={form.notes}
          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          rows={2}
        />
      </div>
      <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white/80 p-3 text-xs">
        <p className="font-semibold text-slate-800">Live Invoice Total</p>
        <div className="mt-2 space-y-1">
          <p className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Product</span>
            <span className="font-medium text-slate-800">{selectedProduct?.name || 'Not selected'}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-800">{formatCurrency(calculatedSubtotal)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Discount</span>
            <span className="font-medium text-slate-800">-{formatCurrency(calculatedDiscount)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Tax</span>
            <span className="font-medium text-slate-800">+{formatCurrency(calculatedTax)}</span>
          </p>
          <p className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
            <span className="font-semibold text-slate-700">Calculated Total</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(calculatedTotal)}</span>
          </p>
          <p className="flex items-center justify-between gap-3">
            <span className="text-slate-500">Estimated Profit</span>
            <span className={`font-semibold ${calculatedProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
              {formatCurrency(calculatedProfit)}
            </span>
          </p>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">Buyer details are saved automatically to customer records.</p>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="submit" disabled={mode === 'create' ? createMutation.isPending : updateMutation.isPending}>
          {mode === 'create'
            ? createMutation.isPending
              ? 'Creating...'
              : 'Create Invoice'
            : updateMutation.isPending
              ? 'Saving...'
              : 'Save Changes'}
        </button>
        {mode === 'edit' && (
          <button
            type="button"
            className="apex-btn-soft"
            onClick={() => {
              setEditingInvoice(null);
              setActiveTab('list');
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="apex-glass-panel p-3">
        <div className="flex flex-wrap gap-2">
          {([
            { id: 'list', label: 'All Invoices' },
            { id: 'create', label: 'Create Invoice' },
            { id: 'edit', label: editingInvoice ? `Edit ${editingInvoice.invoice_number}` : 'Edit Invoice' },
          ] as { id: InvoicesTab; label: string }[]).map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.id === 'create') {
                  setEditingInvoice(null);
                  setForm(emptyForm);
                  setInvoiceLines(createInitialInvoiceLines());
                  setSelectedBuyerId('');
                  setSelectedBuyerLogoUrl(null);
                  setCustomerLogoFile(null);
                }
                setActiveTab(tab.id);
              }}
              disabled={tab.id === 'edit' && !editingInvoice}
              className={`apex-tab ${activeTab === tab.id ? 'apex-tab-active' : 'apex-tab-idle'} ${
                tab.id === 'edit' && !editingInvoice ? 'opacity-50' : ''
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {actionMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{actionMessage}</div>
      )}

      {activeTab === 'create' && (
        <section className="apex-glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-800">Create New Invoice</h2>
          <p className="mt-1 text-xs text-slate-600">
            Create an invoice manually. The buyer is saved automatically with all contact details and logo.
          </p>
          {renderInvoiceForm('create')}
        </section>
      )}

      {activeTab === 'edit' && editingInvoice && (
        <section className="apex-glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-800">Edit Invoice {editingInvoice.invoice_number}</h2>
          <p className="mt-1 text-xs text-slate-600">
            Adjust buyer details, line items, totals, and status. Changes regenerate the PDF automatically.
          </p>
          {renderInvoiceForm('edit')}
        </section>
      )}

      {activeTab === 'list' && (
        <section className="apex-glass-panel p-4">
          <h2 className="text-sm font-semibold text-slate-800">Invoice Management</h2>
          <p className="mt-1 text-xs text-slate-600">Search, download, email, edit, and track professional invoices.</p>

          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search invoice, sale, customer..."
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as InvoiceStatus | '')}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="issued">Issued</option>
              <option value="paid">Paid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={paymentFilter}
              onChange={(event) => setPaymentFilter(event.target.value as InvoicePaymentStatus | '')}
            >
              <option value="">All payment statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Sale</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Total</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Payment</th>
                  <th className="py-2 pr-2">PDF</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(invoicesQuery.data ?? []).map((invoice) => (
                  <tr key={invoice.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2 font-medium">{invoice.invoice_number}</td>
                    <td className="py-2 pr-2">{invoice.sale_number}</td>
                    <td className="py-2 pr-2">
                      <div className="flex items-center gap-2">
                        {invoice.customer_logo_url && (
                          <img src={invoice.customer_logo_url} alt="" className="h-6 w-6 rounded object-cover" />
                        )}
                        <span>{invoice.customer_name}</span>
                      </div>
                    </td>
                    <td className="py-2 pr-2">{invoice.product_name}</td>
                    <td className="py-2 pr-2">{formatCurrency(invoice.grand_total)}</td>
                    <td className="py-2 pr-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(invoice.payment_status)}`}
                      >
                        {invoice.payment_status}
                      </span>
                    </td>
                    <td className="py-2 pr-2">
                      {invoice.has_stored_pdf ? (
                        <span className="text-[10px] font-medium text-emerald-700" title={invoice.pdf_generated_at ?? undefined}>
                          Stored
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-2">{invoice.invoice_date}</td>
                    <td className="py-2 pr-2">
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() => setEditingInvoice(invoice)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() => downloadInvoicePdf(invoice.id, `${invoice.invoice_number}.pdf`)}
                        >
                          PDF
                        </button>
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() => printInvoicePdf(invoice.id)}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          disabled={emailMutation.isPending}
                          onClick={() =>
                            setEmailTarget({
                              id: invoice.id,
                              invoiceNumber: invoice.invoice_number,
                              customerName: invoice.customer_name,
                              customerEmail: invoice.customer_email,
                            })
                          }
                        >
                          Email
                        </button>
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          disabled={regenerateMutation.isPending}
                          onClick={() => regenerateMutation.mutate(invoice.id)}
                        >
                          Regenerate
                        </button>
                        <button
                          type="button"
                          className="apex-btn-soft !px-2 !py-1 text-[10px]"
                          onClick={() =>
                            setSelectedReference(selectedReference === invoice.invoice_number ? null : invoice.invoice_number)
                          }
                        >
                          Timeline
                        </button>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        <button
                          type="button"
                          className="text-[10px] text-blue-700 hover:underline"
                          disabled={paymentMutation.isPending}
                          onClick={() => setPaymentTarget(invoice)}
                        >
                          Record Payment
                        </button>
                        <button
                          type="button"
                          className="text-[10px] text-emerald-700 hover:underline"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ invoiceId: invoice.id, status: 'paid', payment_status: 'paid' })
                          }
                        >
                          Mark Paid
                        </button>
                        <button
                          type="button"
                          className="text-[10px] text-amber-700 hover:underline"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({
                              invoiceId: invoice.id,
                              status: 'partially_paid',
                              payment_status: 'partially_paid',
                            })
                          }
                        >
                          Partial
                        </button>
                        <button
                          type="button"
                          className="text-[10px] text-red-700 hover:underline"
                          disabled={statusMutation.isPending}
                          onClick={() => statusMutation.mutate({ invoiceId: invoice.id, status: 'cancelled' })}
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(invoicesQuery.data ?? []).length === 0 && <p className="py-4 text-xs text-slate-500">No invoices found.</p>}
          </div>
        </section>
      )}

      {selectedReference && (
        <section className="apex-glass-panel p-4">
          <InvoiceActivitySummary invoiceNumber={selectedReference} />
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
          emailMutation.mutate({ invoiceId: emailTarget.id, email: emails || undefined });
        }}
      />

      <InvoicePaymentModal
        open={paymentTarget !== null}
        invoiceNumber={paymentTarget?.invoice_number}
        balanceDue={Number(paymentTarget?.balance_due ?? paymentTarget?.grand_total ?? 0)}
        isSaving={paymentMutation.isPending}
        onClose={() => setPaymentTarget(null)}
        onSave={(payload) => {
          if (!paymentTarget) return;
          paymentMutation.mutate({
            invoiceId: paymentTarget.id,
            payload: {
              amount: Number(payload.amount),
              payment_date: payload.payment_date,
              payment_method: payload.payment_method,
              reference: payload.reference,
              notes: payload.notes,
            },
          });
        }}
      />
    </div>
  );
}
