import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import CompanyBrandingHeader from '../../components/apexcareir/CompanyBrandingHeader';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { exportReport, getReport, type ExportType, type ReportType } from '../../services';

const reportTypes: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'sales', label: 'Sales Report', description: 'Revenue, invoice, customer, and salesperson performance.' },
  { id: 'inventory', label: 'Inventory Report', description: 'Stock levels, valuation, status, and low-stock visibility.' },
  { id: 'profit', label: 'Profit Report', description: 'Profitability by invoice and margin analysis.' },
  { id: 'expenses', label: 'Expense Report', description: 'Expense category, amount, payment method, and trend filtering.' },
  { id: 'performance', label: 'Business Performance', description: 'Monthly business performance with revenue/expense/payroll net.' },
];

function formatCellValue(value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function formatSummaryKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [search, setSearch] = useState('');

  const reportQuery = useQuery({
    queryKey: ['reports', activeReport, startDate, endDate, search],
    queryFn: () =>
      getReport(activeReport, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
      }),
  });

  const exportMutation = useMutation({
    mutationFn: (exportType: ExportType) =>
      exportReport(activeReport, exportType, {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        search: search || undefined,
      }),
  });

  const activeReportMeta = useMemo(() => reportTypes.find((report) => report.id === activeReport), [activeReport]);

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <CompanyBrandingHeader
          title="Reports & Analytics"
          subtitle="Generate and export business reports with date-range and search filters."
        />
      </section>

      <section className="apex-glass-panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {reportTypes.map((report) => (
            <button
              key={report.id}
              className={`apex-tab ${activeReport === report.id ? 'apex-tab-active' : 'apex-tab-idle'}`}
              onClick={() => setActiveReport(report.id)}
            >
              {report.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-600">{activeReportMeta?.description}</p>
      </section>

      <section className="apex-glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Start Date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">End Date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report-specific fields..."
            />
          </div>
          <div className="flex items-end justify-end gap-2">
            <button className="apex-btn-soft" onClick={() => exportMutation.mutate('csv')} disabled={exportMutation.isPending} aria-label="Export report as CSV">
              CSV
            </button>
            <button className="apex-btn-soft" onClick={() => exportMutation.mutate('xlsx')} disabled={exportMutation.isPending} aria-label="Export report as Excel">
              Excel
            </button>
            <button className="apex-btn-soft" onClick={() => exportMutation.mutate('pdf')} disabled={exportMutation.isPending} aria-label="Export report as PDF">
              PDF
            </button>
          </div>
        </div>
      </section>

      {reportQuery.isLoading && <PageSkeleton rows={6} />}

      {reportQuery.isError && <PageErrorState message="Unable to load report data. Please check date range and connectivity." onRetry={() => reportQuery.refetch()} />}

      {exportMutation.isError && <PageErrorState message="Report export failed. Please try again." />}

      {reportQuery.data && (
        <>
          <section className="apex-glass-panel p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Summary</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(reportQuery.data.summary).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-white/85 p-3">
                  <p className="text-[11px] text-slate-500">{formatSummaryKey(key)}</p>
                  <p className="text-sm font-semibold text-slate-900">{formatCellValue(value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="apex-glass-panel p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Results</h3>
            {reportQuery.data.results.length === 0 ? (
              <EmptyState title="No Report Rows Found" message="Try expanding date range or clearing your search filter." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      {reportQuery.data.columns.map((column) => (
                        <th key={column.key} className="py-2 pr-3">
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportQuery.data.results.map((row, index) => (
                      <tr key={`${row[reportQuery.data.columns[0]?.key] ?? 'row'}-${index}`} className="border-b border-slate-100">
                        {reportQuery.data.columns.map((column) => (
                          <td key={column.key} className="py-2 pr-3">
                            {formatCellValue(row[column.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
