import { useQuery } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { getDashboardOverview } from '../../services';
import { useAuthStore } from '../../store';
import { Link } from 'react-router-dom';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(
    value,
  );
}

function toSafeNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-KE');
}

function formatSignedPercent(value: number) {
  const safeValue = toSafeNumber(value);
  return `${safeValue > 0 ? '+' : ''}${safeValue.toFixed(2)}%`;
}

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const dashboardQuery = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: getDashboardOverview,
  });

  if (dashboardQuery.isLoading) {
    return <PageSkeleton rows={8} />;
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return <PageErrorState message="Unable to load dashboard data. Please check backend connectivity and permissions." onRetry={() => dashboardQuery.refetch()} />;
  }

  const { cards, charts, insights, recent_sales, recent_purchases, recent_stock_receipts } = dashboardQuery.data;
  const schedulerVariant =
    cards.scheduler_health === 'critical'
      ? 'scheduler-critical'
      : cards.scheduler_health === 'warning'
        ? 'scheduler-warning'
        : 'scheduler-healthy';

  const commandCentreCards = [
    {
      label: "Today's Sales",
      value: formatCurrency(toSafeNumber(cards.today_sales)),
      hint: 'Live daily performance',
      to: '/apexcareir-main/app/sales',
      variant: 'sales',
    },
    {
      label: 'Pending Appointments',
      value: `${toSafeNumber(cards.pending_appointments)}`,
      hint: 'Awaiting admin action',
      to: '/apexcareir-main/app/appointments?status=pending',
      variant: 'appointments',
    },
    {
      label: 'Pending Contact Requests',
      value: `${toSafeNumber(cards.pending_contact_requests)}`,
      hint: 'Needs response',
      to: '/apexcareir-main/app/contact-requests?status=new',
      variant: 'contacts',
    },
    {
      label: 'Low Stock Alerts',
      value: `${toSafeNumber(cards.low_stock_count)}`,
      hint: 'At or below minimum stock',
      to: '/apexcareir-main/app/inventory',
      variant: 'inventory',
    },
    {
      label: 'Failed Email Notifications',
      value: `${toSafeNumber(cards.failed_email_notifications)}`,
      hint: 'Delivery issues to resolve',
      to: '/apexcareir-main/app/notifications?status=all&q=failed',
      variant: 'email',
    },
    {
      label: 'Scheduler Health',
      value: `${cards.scheduler_health.toUpperCase()} (${toSafeNumber(cards.overdue_scheduler_jobs)} overdue)`,
      hint: `${toSafeNumber(cards.active_scheduler_jobs)} active jobs | ${toSafeNumber(cards.failed_scheduler_jobs)} failed`,
      variant: schedulerVariant,
      to: '/apexcareir-main/app/scheduler',
    },
  ];

  const summaryCards = [
    { label: 'Monthly Sales', value: formatCurrency(toSafeNumber(cards.monthly_sales)), variant: 'monthly-sales' },
    { label: 'Inventory Value', value: formatCurrency(toSafeNumber(cards.inventory_value)), variant: 'inventory-value' },
    { label: 'Profit', value: formatCurrency(toSafeNumber(cards.profit)), variant: 'profit' },
    { label: 'Monthly Expenses', value: formatCurrency(toSafeNumber(cards.monthly_expenses)), variant: 'expenses' },
  ];

  return (
    <div className="space-y-6">
      <div className="apex-glass-panel rounded-2xl p-6">
        <h2 className="apex-section-title text-xl">KPI Command Centre</h2>
        <p className="apex-muted mt-2 text-sm">
          Welcome, {user?.first_name || user?.email}. Monitor high-priority operational indicators and intervene fast.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {commandCentreCards.map((card) => (
          <Link key={card.label} to={card.to} className="block">
            <article className={`apex-kpi-card p-4 apex-kpi-card--${card.variant}`}>
              <p className="apex-kpi-label">{card.label}</p>
              <p className="apex-kpi-value">{card.value}</p>
              <p className="apex-kpi-hint">{card.hint}</p>
            </article>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className={`apex-kpi-card p-4 apex-kpi-card--${card.variant}`}>
            <p className="apex-kpi-label">{card.label}</p>
            <p className="apex-kpi-value">{card.value}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Sales Trend (Last 7 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.sales_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#1B4D3E" strokeWidth={2.5} name="Sales (KES)" />
                <Line type="monotone" dataKey="count" stroke="#B8952F" strokeWidth={2.5} name="Transactions" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Monthly Revenue vs Expenses</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenue_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="sales" stroke="#1B4D3E" fill="#D8EEE7" name="Sales" />
                <Area type="monotone" dataKey="expenses" stroke="#6E2C3E" fill="#F3D7DE" name="Expenses" />
                <Area type="monotone" dataKey="profit" stroke="#B8952F" fill="#F5E8BE" name="Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <article className="apex-data-card p-4">
        <h3 className="apex-section-title mb-3 text-sm">Inventory Trend (Received vs Sold)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={charts.inventory_trend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="received" fill="#1B4D3E" name="Received Qty" />
              <Bar dataKey="sold" fill="#6E2C3E" name="Sold Qty" />
              <Bar dataKey="net" fill="#B8952F" name="Net Movement" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Most Sold Products</h3>
          <div className="space-y-2">
            {insights.most_sold_products.length === 0 && <p className="text-xs text-slate-500">No sales data yet.</p>}
            {insights.most_sold_products.map((item) => (
              <div key={item.product_id} className="apex-data-card-soft p-2">
                <p className="text-xs font-semibold text-slate-800">{item.product__name}</p>
                <p className="text-[11px] text-slate-600">
                  {item.product__sku} | Qty: {item.total_quantity} | {formatCurrency(toSafeNumber(item.total_sales))}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Least Sold Products</h3>
          <div className="space-y-2">
            {insights.least_sold_products.length === 0 && <p className="text-xs text-slate-500">No comparable sales yet.</p>}
            {insights.least_sold_products.map((item) => (
              <div key={item.product_id} className="apex-data-card-soft p-2">
                <p className="text-xs font-semibold text-slate-800">{item.product__name}</p>
                <p className="text-[11px] text-slate-600">
                  {item.product__sku} | Qty: {item.total_quantity} | {formatCurrency(toSafeNumber(item.total_sales))}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Growth Insights</h3>
          <div className="space-y-2 text-xs">
            <div className="apex-data-card-soft p-2">
              <p className="text-slate-500">Sales Growth vs Last Month</p>
              <p
                className={`font-semibold ${
                  toSafeNumber(insights.growth_summary.sales_growth_percent) >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatSignedPercent(toSafeNumber(insights.growth_summary.sales_growth_percent))}
              </p>
            </div>
            <div className="apex-data-card-soft p-2">
              <p className="text-slate-500">Profit Growth vs Last Month</p>
              <p
                className={`font-semibold ${
                  toSafeNumber(insights.growth_summary.profit_growth_percent) >= 0 ? 'text-emerald-700' : 'text-red-700'
                }`}
              >
                {formatSignedPercent(toSafeNumber(insights.growth_summary.profit_growth_percent))}
              </p>
            </div>
            <div className="apex-data-card-soft p-2">
              <p className="text-slate-500">Current Month Sales</p>
              <p className="font-semibold text-slate-800">
                {formatCurrency(toSafeNumber(insights.growth_summary.current_month_sales))}
              </p>
            </div>
            <div className="apex-data-card-soft p-2">
              <p className="text-slate-500">Current Month Profit</p>
              <p className="font-semibold text-slate-800">
                {formatCurrency(toSafeNumber(insights.growth_summary.current_month_profit))}
              </p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Stockout Risk (Next 14 Days)</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Current</th>
                  <th className="py-2 pr-2">Min</th>
                  <th className="py-2 pr-2">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {insights.stockout_risk.length === 0 && (
                  <tr>
                    <td className="py-2 pr-2 text-slate-500" colSpan={4}>
                      No immediate stockout risk detected.
                    </td>
                  </tr>
                )}
                {insights.stockout_risk.map((risk) => (
                  <tr key={`${risk.sku}-${risk.product_name}`} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{risk.product_name}</td>
                    <td className="py-2 pr-2">{risk.current_stock}</td>
                    <td className="py-2 pr-2">{risk.minimum_stock}</td>
                    <td className="py-2 pr-2">{risk.estimated_days_left ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-800">Suggested Reorder List</p>
            <p className="mt-1 text-[11px] text-amber-700">
              {insights.reorder_suggestions.length === 0
                ? 'No urgent reorder recommendations at the moment.'
                : insights.reorder_suggestions
                    .slice(0, 3)
                    .map((item) => `${item.product_name} (${item.current_stock}/${item.minimum_stock})`)
                    .join(' | ')}
            </p>
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Business Growth Trend (6 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={insights.monthly_growth_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="sales_growth_percent" stroke="#6E2C3E" strokeWidth={2.5} name="Sales Growth %" />
                <Line type="monotone" dataKey="profit" stroke="#1B4D3E" strokeWidth={2.5} name="Profit (KES)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Recent Sales</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Customer</th>
                  <th className="py-2 pr-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent_sales.length === 0 && (
                  <tr>
                    <td className="py-2 pr-2 text-slate-500" colSpan={3}>
                      No recent sales available.
                    </td>
                  </tr>
                )}
                {recent_sales.map((sale) => (
                  <tr key={sale.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{sale.invoice_number}</td>
                    <td className="py-2 pr-2">{sale.customer}</td>
                    <td className="py-2 pr-2">{formatCurrency(Number(sale.total))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Recent Purchases</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Supplier</th>
                  <th className="py-2 pr-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {recent_purchases.length === 0 && (
                  <tr>
                    <td className="py-2 pr-2 text-slate-500" colSpan={3}>
                      No recent purchases available.
                    </td>
                  </tr>
                )}
                {recent_purchases.map((purchase) => (
                  <tr key={purchase.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{purchase.invoice_number}</td>
                    <td className="py-2 pr-2">{purchase.supplier__name ?? 'N/A'}</td>
                    <td className="py-2 pr-2">{formatDate(purchase.date_received)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="apex-data-card p-4">
          <h3 className="apex-section-title mb-3 text-sm">Recent Stock Receipts</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-2">Invoice</th>
                  <th className="py-2 pr-2">Product</th>
                  <th className="py-2 pr-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {recent_stock_receipts.length === 0 && (
                  <tr>
                    <td className="py-2 pr-2 text-slate-500" colSpan={3}>
                      No recent stock receipts available.
                    </td>
                  </tr>
                )}
                {recent_stock_receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b border-slate-100">
                    <td className="py-2 pr-2">{receipt.invoice_number}</td>
                    <td className="py-2 pr-2">{receipt.product__name}</td>
                    <td className="py-2 pr-2">{receipt.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </div>
  );
}
