import { ADMIN_ROUTES } from '../constants/adminRoutes';

export type NavChild = {
  to: string;
  label: string;
  permission?: string;
  permissionsAny?: string[];
  superadminOnly?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  children: NavChild[];
};

export const businessNavGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Overview',
    children: [{ to: ADMIN_ROUTES.dashboard, label: 'Dashboard', permission: 'dashboard.dashboard' }],
  },
  {
    id: 'inventory-suppliers',
    label: 'Inventory & Suppliers',
    children: [
      { to: ADMIN_ROUTES.inventory, label: 'Inventory', permission: 'inventory.product_management' },
      { to: ADMIN_ROUTES.suppliers, label: 'Suppliers', permission: 'suppliers.supplier_management' },
    ],
  },
  {
    id: 'sales-billing',
    label: 'Sales & Billing',
    children: [
      { to: ADMIN_ROUTES.sales, label: 'Sales', permission: 'sales.sales_management' },
      { to: ADMIN_ROUTES.customers, label: 'Customers', permission: 'sales.sales_management' },
      { to: ADMIN_ROUTES.invoices, label: 'Invoices', permission: 'sales.sales_management' },
    ],
  },
  {
    id: 'finance',
    label: 'Finance',
    children: [
      {
        to: ADMIN_ROUTES.finance,
        label: 'Finance',
        permissionsAny: ['finance.expense_tracking', 'finance.payroll'],
      },
    ],
  },
  {
    id: 'insights',
    label: 'Insights',
    children: [{ to: ADMIN_ROUTES.reports, label: 'Reports', permission: 'reports.reports' }],
  },
  {
    id: 'operations',
    label: 'Operations',
    children: [
      { to: ADMIN_ROUTES.notifications, label: 'Notifications', permission: 'notifications.notifications' },
      { to: ADMIN_ROUTES.scheduler, label: 'Scheduler', permission: 'notifications.notifications' },
      { to: ADMIN_ROUTES.auditLogs, label: 'Audit Logs', permission: 'audit_logs.audit_logs' },
      { to: ADMIN_ROUTES.appointments, label: 'Appointments', permission: 'appointments.appointment_management' },
      {
        to: ADMIN_ROUTES.contactRequests,
        label: 'Contact Requests',
        permission: 'appointments.appointment_management',
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    children: [
      { to: ADMIN_ROUTES.users, label: 'Users', superadminOnly: true },
      { to: ADMIN_ROUTES.settings, label: 'Company Settings', superadminOnly: true },
    ],
  },
  {
    id: 'account',
    label: 'Account',
    children: [{ to: ADMIN_ROUTES.profile, label: 'Profile' }],
  },
];

export function findActiveGroupId(pathname: string, groupIds?: string[]): string | null {
  for (const group of businessNavGroups) {
    if (groupIds && !groupIds.includes(group.id)) {
      continue;
    }
    if (group.children.some((child) => pathname === child.to || pathname.startsWith(`${child.to}/`))) {
      return group.id;
    }
  }
  return null;
}
