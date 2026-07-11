import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useState } from 'react';
import { createExpense, createPayroll, deleteExpense, deletePayroll, getFinanceSummary, listExpenses, listPayroll } from '../../services';
import { useAuth } from '../../hooks';
import { useServerClock } from '../../hooks/useServerClock';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { BUSINESS_AREAS, EXPENSE_TYPES, businessAreaLabel, expenseTypeLabel } from '../../data/expenseTypes';

type FinanceTab = 'business-expenses' | 'payroll' | 'cashflow';

const tabs: { id: FinanceTab; label: string }[] = [
  { id: 'business-expenses', label: 'Business Expenses' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'cashflow', label: 'Performance & Cashflow' },
];

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(Number(value || 0));
}

export default function FinancePage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = useAuth();
  const { localDate } = useServerClock();
  const [activeTab, setActiveTab] = useState<FinanceTab>('business-expenses');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseTypeFilter, setExpenseTypeFilter] = useState('');
  const [businessAreaFilter, setBusinessAreaFilter] = useState('');
  const [payrollSearch, setPayrollSearch] = useState('');

  const canManageExpenses = isSuperAdmin || hasPermission('finance.expense_tracking');
  const canManagePayroll = isSuperAdmin || hasPermission('finance.payroll');
  const canSeeCashflow = canManageExpenses || canManagePayroll;

  const expensesQuery = useQuery({
    queryKey: ['finance', 'expenses', expenseSearch, expenseTypeFilter, businessAreaFilter],
    queryFn: () =>
      listExpenses({
        search: expenseSearch || undefined,
        expense_type: expenseTypeFilter || undefined,
        business_area: businessAreaFilter || undefined,
      }),
    enabled: canManageExpenses,
  });

  const payrollQuery = useQuery({
    queryKey: ['finance', 'payroll', payrollSearch],
    queryFn: () => listPayroll(payrollSearch),
    enabled: canManagePayroll,
  });

  const summaryQuery = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: getFinanceSummary,
    enabled: canSeeCashflow,
  });

  const invalidateFinance = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['finance', 'expenses'] }),
      queryClient.invalidateQueries({ queryKey: ['finance', 'payroll'] }),
      queryClient.invalidateQueries({ queryKey: ['finance', 'summary'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'overview'] }),
    ]);
  };

  const createExpenseMutation = useMutation({
    mutationFn: createExpense,
    onSuccess: invalidateFinance,
  });

  const createPayrollMutation = useMutation({
    mutationFn: createPayroll,
    onSuccess: invalidateFinance,
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: deleteExpense,
    onSuccess: invalidateFinance,
  });

  const deletePayrollMutation = useMutation({
    mutationFn: deletePayroll,
    onSuccess: invalidateFinance,
  });

  const handleExpenseSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createExpenseMutation.mutate({
      category: String(formData.get('category') || '').trim(),
      expense_type: String(formData.get('expense_type') || 'other'),
      business_area: String(formData.get('business_area') || 'shared'),
      amount: Number(formData.get('amount') || 0),
      description: String(formData.get('description') || '').trim(),
      payment_method: String(formData.get('payment_method') || 'cash') as 'cash' | 'bank' | 'mobile' | 'card',
      date: String(formData.get('date') || localDate),
    });
    event.currentTarget.reset();
  };

  const handlePayrollSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    createPayrollMutation.mutate({
      employee: String(formData.get('employee') || '').trim(),
      salary: Number(formData.get('salary') || 0),
      allowances: Number(formData.get('allowances') || 0),
      deductions: Number(formData.get('deductions') || 0),
      payment_date: String(formData.get('payment_date') || localDate),
      notes: String(formData.get('notes') || '').trim(),
    });
    event.currentTarget.reset();
  };

  if (!canManageExpenses && !canManagePayroll) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        You do not have finance permissions assigned.
      </div>
    );
  }

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="apex-glass-panel p-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const visible =
              (tab.id === 'business-expenses' && canManageExpenses) ||
              (tab.id === 'payroll' && canManagePayroll) ||
              (tab.id === 'cashflow' && canSeeCashflow);
            if (!visible) return null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`apex-tab ${activeTab === tab.id ? 'apex-tab-active' : 'apex-tab-idle'}`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'business-expenses' && canManageExpenses && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Record Business Expense</h3>
            <p className="mt-1 text-xs text-slate-600">
              Track clinic, website, and shared operating costs. Expense type is used in weekly and monthly report emails.
            </p>
            <form className="mt-3 grid gap-2" onSubmit={handleExpenseSubmit}>
              <label className="text-xs font-semibold text-slate-700">Expense Type</label>
              <select name="expense_type" required defaultValue="other">
                {EXPENSE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <label className="text-xs font-semibold text-slate-700">Business Area</label>
              <select name="business_area" required defaultValue="shared">
                {BUSINESS_AREAS.map((area) => (
                  <option key={area.value} value={area.value}>
                    {area.label}
                  </option>
                ))}
              </select>
              <label className="text-xs font-semibold text-slate-700">Category / Label</label>
              <input name="category" required placeholder="e.g. Domain renewal, Google Ads, Office rent" />
              <label className="text-xs font-semibold text-slate-700">Amount (KSH)</label>
              <input name="amount" type="number" min="0" step="0.01" required placeholder="Amount" />
              <label className="text-xs font-semibold text-slate-700">Payment Method</label>
              <select name="payment_method" defaultValue="cash">
                <option value="cash">Cash</option>
                <option value="bank">Bank Transfer</option>
                <option value="mobile">Mobile Money</option>
                <option value="card">Card</option>
              </select>
              <label className="text-xs font-semibold text-slate-700">Expense Date</label>
              <input name="date" type="date" defaultValue={localDate} key={`expense-date-${localDate}`} />
              <label className="text-xs font-semibold text-slate-700">Description</label>
              <textarea name="description" placeholder="Notes for record keeping and reports" />
              <button disabled={createExpenseMutation.isPending}>
                {createExpenseMutation.isPending ? 'Saving Expense...' : 'Save Expense'}
              </button>
            </form>
          </section>

          <section className="apex-glass-panel apex-animate-in p-4">
            <div className="mb-3 grid gap-2 sm:grid-cols-3">
              <div className="sm:col-span-3">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Search Expenses</label>
                <input
                  value={expenseSearch}
                  onChange={(event) => setExpenseSearch(event.target.value)}
                  placeholder="Search category or description..."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Expense Type</label>
                <select value={expenseTypeFilter} onChange={(event) => setExpenseTypeFilter(event.target.value)}>
                  <option value="">All types</option>
                  {EXPENSE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Business Area</label>
                <select value={businessAreaFilter} onChange={(event) => setBusinessAreaFilter(event.target.value)}>
                  <option value="">All areas</option>
                  {BUSINESS_AREAS.map((area) => (
                    <option key={area.value} value={area.value}>
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Type</th>
                    <th className="py-2 pr-2">Area</th>
                    <th className="py-2 pr-2">Category</th>
                    <th className="py-2 pr-2">Amount</th>
                    <th className="py-2 pr-2">Method</th>
                    {isSuperAdmin ? <th className="py-2 pr-2">Admin</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {(expensesQuery.data ?? []).map((expense) => (
                    <tr key={expense.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{expense.date}</td>
                      <td className="py-2 pr-2">{expenseTypeLabel(expense.expense_type)}</td>
                      <td className="py-2 pr-2">{businessAreaLabel(expense.business_area)}</td>
                      <td className="py-2 pr-2">{expense.category}</td>
                      <td className="py-2 pr-2">{formatCurrency(expense.amount)}</td>
                      <td className="py-2 pr-2 capitalize">{expense.payment_method}</td>
                      {isSuperAdmin ? (
                        <td className="py-2 pr-2">
                          <AdminConfirmButton
                            label="Delete"
                            confirmMessage={`Delete expense ${expense.category} (${formatCurrency(expense.amount)})?`}
                            onConfirm={() => deleteExpenseMutation.mutateAsync(expense.id)}
                            disabled={deleteExpenseMutation.isPending}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'payroll' && canManagePayroll && (
        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="text-sm font-semibold text-slate-800">Record Payroll Payment</h3>
            <form className="mt-3 grid gap-2" onSubmit={handlePayrollSubmit}>
              <label className="text-xs font-semibold text-slate-700">Employee</label>
              <input name="employee" required placeholder="Employee name" />
              <label className="text-xs font-semibold text-slate-700">Base Salary</label>
              <input name="salary" type="number" min="0" step="0.01" required placeholder="Salary" />
              <label className="text-xs font-semibold text-slate-700">Allowances</label>
              <input name="allowances" type="number" min="0" step="0.01" defaultValue="0" placeholder="Allowances" />
              <label className="text-xs font-semibold text-slate-700">Deductions</label>
              <input name="deductions" type="number" min="0" step="0.01" defaultValue="0" placeholder="Deductions" />
              <label className="text-xs font-semibold text-slate-700">Payment Date</label>
              <input name="payment_date" type="date" defaultValue={localDate} key={`payroll-date-${localDate}`} />
              <label className="text-xs font-semibold text-slate-700">Notes</label>
              <textarea name="notes" placeholder="Notes" />
              <button disabled={createPayrollMutation.isPending}>
                {createPayrollMutation.isPending ? 'Saving Payroll...' : 'Save Payroll'}
              </button>
            </form>
          </section>

          <section className="apex-glass-panel apex-animate-in p-4">
            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Search Payroll</label>
              <input
                value={payrollSearch}
                onChange={(event) => setPayrollSearch(event.target.value)}
                placeholder="Search employee..."
              />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2">Employee</th>
                    <th className="py-2 pr-2">Salary</th>
                    <th className="py-2 pr-2">Allowances</th>
                    <th className="py-2 pr-2">Deductions</th>
                    <th className="py-2 pr-2">Net</th>
                    <th className="py-2 pr-2">Date</th>
                    {isSuperAdmin ? <th className="py-2 pr-2">Admin</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {(payrollQuery.data ?? []).map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2">{entry.employee}</td>
                      <td className="py-2 pr-2">{formatCurrency(entry.salary)}</td>
                      <td className="py-2 pr-2">{formatCurrency(entry.allowances)}</td>
                      <td className="py-2 pr-2">{formatCurrency(entry.deductions)}</td>
                      <td className="py-2 pr-2 font-semibold text-slate-800">{formatCurrency(entry.net_salary)}</td>
                      <td className="py-2 pr-2">{entry.payment_date}</td>
                      {isSuperAdmin ? (
                        <td className="py-2 pr-2">
                          <AdminConfirmButton
                            label="Delete"
                            confirmMessage={`Delete payroll record for ${entry.employee}?`}
                            onConfirm={() => deletePayrollMutation.mutateAsync(entry.id)}
                            disabled={deletePayrollMutation.isPending}
                          />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {activeTab === 'cashflow' && canSeeCashflow && (
        <div className="space-y-4">
          <section className="apex-glass-panel apex-animate-in grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-[11px] text-slate-500">Monthly Revenue</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(summaryQuery.data?.summary.monthly_revenue ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Monthly Expenses</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(summaryQuery.data?.summary.monthly_expenses ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Monthly Payroll</p>
              <p className="text-sm font-semibold text-slate-900">
                {formatCurrency(summaryQuery.data?.summary.monthly_payroll ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Net Cashflow</p>
              <p
                className={`text-sm font-semibold ${
                  (summaryQuery.data?.summary.net_cashflow ?? 0) < 0 ? 'text-red-600' : 'text-emerald-700'
                }`}
              >
                {formatCurrency(summaryQuery.data?.summary.net_cashflow ?? 0)}
              </p>
            </div>
          </section>

          <section className="apex-glass-panel apex-animate-in p-4">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Cashflow Trend (Last 6 Months)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summaryQuery.data?.monthly_cashflow ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="#1B4D3E" fill="#A7F3D0" name="Revenue" />
                  <Area type="monotone" dataKey="expenses" stroke="#8B3A50" fill="#FBCFE8" name="Expenses" />
                  <Area type="monotone" dataKey="payroll" stroke="#B8952F" fill="#FDE68A" name="Payroll" />
                  <Area type="monotone" dataKey="net" stroke="#1F2937" fill="#CBD5E1" name="Net Cashflow" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
