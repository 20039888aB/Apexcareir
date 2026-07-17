import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import CompanyBrandingHeader from '../../components/apexcareir/CompanyBrandingHeader';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import {
  lastDayOfMonth,
  previousMonthValue,
  shiftIsoDate,
  useServerClock,
} from '../../hooks/useServerClock';
import { exportReport, getReport, type ExportType, type ReportType } from '../../services';
import { formatDateTime, formatIsoDate, formatMonthValue } from '../../utils/formatDate';

const reportTypes: Array<{ id: ReportType; label: string; description: string }> = [
  { id: 'sales', label: 'Sales Report', description: 'Revenue, invoice, customer, and salesperson performance.' },
  {
    id: 'inventory',
    label: 'Inventory Report',
    description: 'Stock movements (received, sold, adjusted) for the selected date range, plus current low-stock count.',
  },
  { id: 'profit', label: 'Profit Report', description: 'Profitability by invoice and margin analysis.' },
  { id: 'expenses', label: 'Expense Report', description: 'Expense category, amount, payment method, and trend filtering.' },
  { id: 'performance', label: 'Business Performance', description: 'Monthly business performance with revenue/expense/payroll net.' },
];

type ReportPeriodMode = 'month' | 'range';

const periodPresets = [
  { id: 'today', label: 'Today' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'last_30_days', label: 'Last 30 Days' },
] as const;

function formatCellValue(key: string, value: unknown) {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '-';
  if (key === 'date' || key === 'payment_date' || key === 'date_received' || key === 'event_date') {
    return formatIsoDate(String(value));
  }
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : value.toFixed(2);
  return String(value);
}

function formatSummaryKey(key: string) {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function ReportsPage() {
  const { localDate, monthValue, monthStart } = useServerClock();
  const [periodMode, setPeriodMode] = useState<ReportPeriodMode>('range');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!localDate || initialized) {
      return;
    }
    setSelectedMonth(monthValue);
    setStartDate(monthStart);
    setEndDate(localDate);
    setInitialized(true);
  }, [initialized, localDate, monthStart, monthValue]);

  const rangeInvalid = Boolean(startDate && endDate && startDate > endDate);

  const reportFilters = useMemo(() => {
    if (periodMode === 'month') {
      return { month: selectedMonth || undefined, search: search || undefined };
    }
    return {
      start_date: startDate || undefined,
      end_date: endDate || undefined,
      search: search || undefined,
    };
  }, [endDate, periodMode, search, selectedMonth, startDate]);

  const reportQuery = useQuery({
    queryKey: ['reports', activeReport, periodMode, selectedMonth, startDate, endDate, search],
    queryFn: () => getReport(activeReport, reportFilters),
    enabled: initialized && !rangeInvalid && (periodMode === 'month' ? Boolean(selectedMonth) : Boolean(startDate && endDate)),
  });

  const exportMutation = useMutation({
    mutationFn: (exportType: ExportType) => exportReport(activeReport, exportType, reportFilters),
  });

  const activeReportMeta = useMemo(() => reportTypes.find((report) => report.id === activeReport), [activeReport]);

  const selectedPeriodLabel = useMemo(() => {
    if (periodMode === 'month') {
      return selectedMonth ? formatMonthValue(selectedMonth) : 'Select a month';
    }
    if (startDate && endDate) {
      if (startDate === endDate) {
        return formatIsoDate(startDate);
      }
      return `${formatIsoDate(startDate)} → ${formatIsoDate(endDate)}`;
    }
    return 'Select from and to dates';
  }, [endDate, periodMode, selectedMonth, startDate]);

  const applyPreset = (preset: (typeof periodPresets)[number]['id']) => {
    if (preset === 'today') {
      setPeriodMode('range');
      setStartDate(localDate);
      setEndDate(localDate);
      return;
    }
    if (preset === 'this_month') {
      setPeriodMode('month');
      setSelectedMonth(monthValue);
      setStartDate(monthStart);
      setEndDate(localDate);
      return;
    }
    if (preset === 'last_month') {
      const previousMonth = previousMonthValue(monthValue);
      setPeriodMode('range');
      setStartDate(`${previousMonth}-01`);
      setEndDate(lastDayOfMonth(previousMonth));
      return;
    }
    setPeriodMode('range');
    setStartDate(shiftIsoDate(localDate, -30));
    setEndDate(localDate);
  };

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <CompanyBrandingHeader
          title="Reports & Analytics"
          subtitle="Filter any report from a start date to an end date, or by full month. Exports use the same filters."
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[rgba(184,149,47,0.2)] bg-white/85 px-3 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Report Period</p>
            <p className="text-sm font-semibold text-slate-900">{selectedPeriodLabel}</p>
            {periodMode === 'range' && (
              <p className="mt-1 text-[11px] text-slate-500">
                Choose a from date and to date to include only records in that inclusive range.
              </p>
            )}
          </div>
          <div className="text-right text-[11px] text-slate-500">
            <p>System date: {formatIsoDate(localDate)}</p>
            {reportQuery.data?.generated_at && <p>Generated: {formatDateTime(reportQuery.data.generated_at)}</p>}
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {periodPresets.map((preset) => (
            <button key={preset.id} className="apex-btn-soft text-xs" onClick={() => applyPreset(preset.id)}>
              {preset.label}
            </button>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <button
            className={`apex-tab ${periodMode === 'month' ? 'apex-tab-active' : 'apex-tab-idle'}`}
            onClick={() => setPeriodMode('month')}
          >
            By Month
          </button>
          <button
            className={`apex-tab ${periodMode === 'range' ? 'apex-tab-active' : 'apex-tab-idle'}`}
            onClick={() => setPeriodMode('range')}
          >
            By Date Range
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {periodMode === 'month' && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Report Month</label>
              <input type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} />
            </div>
          )}

          {periodMode === 'range' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </div>
            </>
          )}

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-700">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report-specific fields..."
            />
          </div>
          <div className="flex items-end justify-end gap-2">
            <button
              className="apex-btn-soft"
              onClick={() => exportMutation.mutate('csv')}
              disabled={exportMutation.isPending || rangeInvalid}
              aria-label="Export report as CSV"
            >
              CSV
            </button>
            <button
              className="apex-btn-soft"
              onClick={() => exportMutation.mutate('xlsx')}
              disabled={exportMutation.isPending || rangeInvalid}
              aria-label="Export report as Excel"
            >
              Excel
            </button>
            <button
              className="apex-btn-soft"
              onClick={() => exportMutation.mutate('pdf')}
              disabled={exportMutation.isPending || rangeInvalid}
              aria-label="Export report as PDF"
            >
              PDF
            </button>
          </div>
        </div>

        {rangeInvalid && (
          <p className="mt-2 text-xs text-red-600">From date must be on or before the to date.</p>
        )}
      </section>

      {reportQuery.isLoading && <PageSkeleton rows={6} />}

      {reportQuery.isError && (
        <PageErrorState
          message="Unable to load report data. Please check date range and connectivity."
          onRetry={() => reportQuery.refetch()}
        />
      )}

      {exportMutation.isError && <PageErrorState message="Report export failed. Please try again." />}

      {reportQuery.data && (
        <>
          <section className="apex-glass-panel p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-800">Summary</h3>
              <p className="text-xs text-slate-500">
                {reportQuery.data.period_label ||
                  `${formatIsoDate(reportQuery.data.start_date)} to ${formatIsoDate(reportQuery.data.end_date)}`}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Object.entries(reportQuery.data.summary).map(([key, value]) => (
                <div key={key} className="rounded-lg border border-slate-200 bg-white/85 p-3">
                  <p className="text-[11px] text-slate-500">{formatSummaryKey(key)}</p>
                  <p className="text-sm font-semibold text-slate-900">{formatCellValue(key, value)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="apex-glass-panel p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Results</h3>
            {reportQuery.data.results.length === 0 ? (
              <EmptyState
                title="No Report Rows Found"
                message="Try expanding the from/to date range or clearing your search filter."
              />
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
                      <tr
                        key={`${row[reportQuery.data.columns[0]?.key] ?? 'row'}-${index}`}
                        className="border-b border-slate-100"
                      >
                        {reportQuery.data.columns.map((column) => (
                          <td key={column.key} className="py-2 pr-3">
                            {formatCellValue(column.key, row[column.key])}
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
