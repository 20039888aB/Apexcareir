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

export type Expense = {
  id: number;
  category: string;
  expense_type: string;
  business_area: string;
  amount: string;
  description: string;
  payment_method: 'cash' | 'bank' | 'mobile' | 'card';
  date: string;
  receipt: string | null;
  created_at: string;
};

export type Payroll = {
  id: number;
  employee: string;
  salary: string;
  allowances: string;
  deductions: string;
  net_salary: string;
  payment_date: string;
  notes: string;
  created_at: string;
};

export type FinanceSummary = {
  summary: {
    monthly_revenue: number;
    monthly_expenses: number;
    monthly_payroll: number;
    net_cashflow: number;
  };
  monthly_cashflow: Array<{
    month: string;
    revenue: number;
    expenses: number;
    payroll: number;
    net: number;
  }>;
};

export async function listExpenses(params?: {
  search?: string;
  expense_type?: string;
  business_area?: string;
}) {
  const response = await httpClient.get<PaginatedResponse<Expense> | Expense[]>('/finance/expenses/', {
    params: {
      search: params?.search || undefined,
      expense_type: params?.expense_type || undefined,
      business_area: params?.business_area || undefined,
    },
  });
  return extractResults(response.data);
}

export async function createExpense(payload: {
  category: string;
  expense_type: string;
  business_area: string;
  amount: number;
  description?: string;
  payment_method: Expense['payment_method'];
  date: string;
}) {
  const response = await httpClient.post<Expense>('/finance/expenses/', payload);
  return response.data;
}

export async function deleteExpense(expenseId: number) {
  await httpClient.delete(`/finance/expenses/${expenseId}/`);
}

export async function deletePayroll(payrollId: number) {
  await httpClient.delete(`/finance/payroll/${payrollId}/`);
}

export async function listPayroll(search?: string) {
  const response = await httpClient.get<PaginatedResponse<Payroll> | Payroll[]>('/finance/payroll/', {
    params: { search: search || undefined },
  });
  return extractResults(response.data);
}

export async function createPayroll(payload: {
  employee: string;
  salary: number;
  allowances?: number;
  deductions?: number;
  payment_date: string;
  notes?: string;
}) {
  const response = await httpClient.post<Payroll>('/finance/payroll/', payload);
  return response.data;
}

export async function getFinanceSummary() {
  const response = await httpClient.get<FinanceSummary>('/finance/summary/');
  return response.data;
}
