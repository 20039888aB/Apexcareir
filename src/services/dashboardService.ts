import { httpClient } from '../api';

export type DashboardCards = {
  today_sales: number;
  today_profit: number;
  monthly_sales: number;
  monthly_revenue: number;
  outstanding_invoice_amount: number;
  inventory_value: number;
  profit: number;
  monthly_expenses: number;
  low_stock_count: number;
  pending_invoices: number;
  pending_appointments: number;
  pending_contact_requests: number;
  failed_email_notifications: number;
  active_scheduler_jobs: number;
  overdue_scheduler_jobs: number;
  failed_scheduler_jobs: number;
  scheduler_health: 'healthy' | 'warning' | 'critical' | string;
};

export type TopBuyerInsight = {
  customer_id: number;
  customer__name: string;
  customer__company_name: string;
  customer__customer_number: string;
  total_spent: number;
  invoice_count: number;
};

export type RecentSale = {
  id: number;
  invoice_number: string;
  customer: string;
  quantity: number;
  total: number;
  profit: number;
  date: string;
  product__name: string;
  salesperson__email: string | null;
};

export type RecentPurchase = {
  id: number;
  invoice_number: string;
  date_received: string;
  quantity: number;
  purchase_price: number;
  product__name: string;
  supplier__name: string | null;
};

export type RecentStockReceipt = {
  id: number;
  invoice_number: string;
  date_received: string;
  quantity: number;
  batch_number: string;
  product__name: string;
  received_by__email: string | null;
};

export type SalesTrendPoint = {
  date: string;
  sales: number;
  count: number;
};

export type RevenueTrendPoint = {
  month: string;
  sales: number;
  expenses: number;
  profit: number;
};

export type InventoryTrendPoint = {
  month: string;
  received: number;
  sold: number;
  net: number;
};

export type ProductSalesInsight = {
  product_id: number;
  product__name: string;
  product__sku: string;
  total_quantity: number;
  total_sales: number;
};

export type StockRiskInsight = {
  product_name: string;
  sku: string;
  current_stock: number;
  minimum_stock: number;
  average_daily_sales: number;
  estimated_days_left: number | null;
};

export type GrowthSummaryInsight = {
  current_month_sales: number;
  previous_month_sales: number;
  sales_growth_percent: number;
  current_month_profit: number;
  previous_month_profit: number;
  profit_growth_percent: number;
};

export type MonthlyGrowthInsight = {
  month: string;
  sales: number;
  expenses: number;
  profit: number;
  sales_growth_percent: number;
};

export type DashboardPeriod = {
  as_of: string;
  system_today: string;
  month_start: string;
  month_end: string;
  is_current_month: boolean;
  is_current_day: boolean;
  label: string;
};

export type DashboardOverviewParams = {
  date?: string;
  month?: string;
};

export type DashboardOverviewResponse = {
  period?: DashboardPeriod;
  cards: DashboardCards;
  recent_sales: RecentSale[];
  recent_purchases: RecentPurchase[];
  recent_stock_receipts: RecentStockReceipt[];
  top_buyers: TopBuyerInsight[];
  charts: {
    sales_trend: SalesTrendPoint[];
    revenue_trend: RevenueTrendPoint[];
    inventory_trend: InventoryTrendPoint[];
  };
  insights: {
    most_sold_products: ProductSalesInsight[];
    least_sold_products: ProductSalesInsight[];
    stockout_risk: StockRiskInsight[];
    reorder_suggestions: StockRiskInsight[];
    growth_summary: GrowthSummaryInsight;
    monthly_growth_trend: MonthlyGrowthInsight[];
  };
};

export async function getDashboardOverview(params?: DashboardOverviewParams) {
  const query: Record<string, string> = {};
  if (params?.date) {
    query.date = params.date;
  }
  if (params?.month) {
    query.month = params.month;
  }
  const response = await httpClient.get<DashboardOverviewResponse>('/dashboard/overview/', {
    params: query,
  });
  return response.data;
}
