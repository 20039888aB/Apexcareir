import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { InvoiceActivitySummary } from '../../components/apexcareir/TransactionTimeline';
import { PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { downloadInvoicePdf, getCustomer, getCustomerInvoices } from '../../services';

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

export default function CustomerProfilePage() {
  const { customerId } = useParams();
  const id = Number(customerId);

  const customerQuery = useQuery({
    queryKey: ['customers', id],
    queryFn: () => getCustomer(id),
    enabled: Number.isFinite(id),
  });

  const invoicesQuery = useQuery({
    queryKey: ['customers', id, 'invoices'],
    queryFn: () => getCustomerInvoices(id),
    enabled: Number.isFinite(id),
  });

  if (customerQuery.isLoading) {
    return <PageSkeleton rows={8} />;
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <PageErrorState
        message="Unable to load customer profile."
        onRetry={() => customerQuery.refetch()}
      />
    );
  }

  const customer = customerQuery.data;

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="text-xs">
        <Link to={ADMIN_ROUTES.customers} className="text-apex-primary hover:underline">
          ← Back to Customers
        </Link>
      </div>

      <section className="apex-glass-panel p-4">
        <div className="flex flex-wrap items-start gap-4">
          {customer.logo_url ? (
            <img src={customer.logo_url} alt={customer.name} className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-semibold text-slate-500">
              {customer.name.charAt(0)}
            </div>
          )}
          <div>
            <h2 className="text-base font-semibold text-slate-800">{customer.name}</h2>
            <p className="text-xs text-slate-500">{customer.customer_number}</p>
            {customer.company_name && <p className="mt-1 text-xs text-slate-600">{customer.company_name}</p>}
            <p className="mt-2 text-xs text-slate-600">
              {[customer.phone, customer.email, customer.address].filter(Boolean).join(' · ') || 'No contact details yet'}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <article className="apex-data-card-soft p-3">
            <p className="text-[11px] text-slate-500">Total Invoices</p>
            <p className="text-sm font-semibold text-slate-800">{customer.total_invoices ?? 0}</p>
          </article>
          <article className="apex-data-card-soft p-3">
            <p className="text-[11px] text-slate-500">Total Spent</p>
            <p className="text-sm font-semibold text-slate-800">{formatCurrency(customer.total_spent ?? 0)}</p>
          </article>
          <article className="apex-data-card-soft p-3">
            <p className="text-[11px] text-slate-500">Latest Invoice</p>
            <p className="text-sm font-semibold text-slate-800">{customer.latest_invoice_date ?? '-'}</p>
          </article>
        </div>
      </section>

      <section className="apex-glass-panel p-4">
        <h3 className="text-sm font-semibold text-slate-800">Invoice History</h3>
        <p className="mt-1 text-xs text-slate-600">Every invoice this customer has received.</p>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Total</th>
                <th className="py-2 pr-2">Status</th>
                <th className="py-2 pr-2">Payment</th>
                <th className="py-2 pr-2">PDF</th>
              </tr>
            </thead>
            <tbody>
              {(invoicesQuery.data?.results ?? []).map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2 font-medium">{invoice.invoice_number}</td>
                  <td className="py-2 pr-2">{invoice.invoice_date}</td>
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
                      <button
                        type="button"
                        className="text-[11px] font-medium text-apex-primary hover:underline"
                        onClick={() => downloadInvoicePdf(invoice.id, `${invoice.invoice_number}.pdf`)}
                      >
                        Download
                      </button>
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(invoicesQuery.data?.results ?? []).length === 0 && (
            <p className="py-4 text-xs text-slate-500">No invoices recorded for this customer yet.</p>
          )}
        </div>
      </section>

      {(invoicesQuery.data?.results ?? []).slice(0, 3).map((invoice) => (
        <InvoiceActivitySummary key={invoice.id} invoiceNumber={invoice.invoice_number} />
      ))}
    </div>
  );
}
