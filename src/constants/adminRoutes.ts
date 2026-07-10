export const ADMIN_BASE = '/admin1';

export function adminRoute(path = '') {
  if (!path) {
    return ADMIN_BASE;
  }
  return `${ADMIN_BASE}/${path.replace(/^\//, '')}`;
}

export const ADMIN_ROUTES = {
  login: ADMIN_BASE,
  dashboard: adminRoute('dashboard'),
  forgotPassword: adminRoute('forgot-password'),
  resetPassword: adminRoute('reset-password'),
  unauthorized: adminRoute('unauthorized'),
  inventory: adminRoute('inventory'),
  sales: adminRoute('sales'),
  customers: adminRoute('customers'),
  customer: (customerId: number | string) => adminRoute(`customers/${customerId}`),
  invoices: adminRoute('invoices'),
  finance: adminRoute('finance'),
  suppliers: adminRoute('suppliers'),
  reports: adminRoute('reports'),
  notifications: adminRoute('notifications'),
  scheduler: adminRoute('scheduler'),
  auditLogs: adminRoute('audit-logs'),
  appointments: adminRoute('appointments'),
  contactRequests: adminRoute('contact-requests'),
  users: adminRoute('users'),
  settings: adminRoute('settings'),
  profile: adminRoute('profile'),
  changePassword: adminRoute('change-password'),
} as const;
