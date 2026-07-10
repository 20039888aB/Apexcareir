import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Menu, UserCircle, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { listNotifications, logout, markAllNotificationsRead, markNotificationRead } from '../../services';
import { useAuthStore } from '../../store';

type ModuleItem = {
  to: string;
  label: string;
  permission?: string;
  permissionsAny?: string[];
};

const moduleItems: ModuleItem[] = [
  { to: '/apexcareir-main/app/dashboard', label: 'Dashboard', permission: 'dashboard.dashboard' },
  { to: '/apexcareir-main/app/inventory', label: 'Inventory', permission: 'inventory.product_management' },
  { to: '/apexcareir-main/app/sales', label: 'Sales', permission: 'sales.sales_management' },
  {
    to: '/apexcareir-main/app/finance',
    label: 'Finance',
    permissionsAny: ['finance.expense_tracking', 'finance.payroll'],
  },
  { to: '/apexcareir-main/app/suppliers', label: 'Suppliers', permission: 'suppliers.supplier_management' },
  { to: '/apexcareir-main/app/reports', label: 'Reports', permission: 'reports.reports' },
  { to: '/apexcareir-main/app/notifications', label: 'Notifications', permission: 'notifications.notifications' },
  { to: '/apexcareir-main/app/scheduler', label: 'Scheduler', permission: 'notifications.notifications' },
  { to: '/apexcareir-main/app/audit-logs', label: 'Audit Logs', permission: 'audit_logs.audit_logs' },
  { to: '/apexcareir-main/app/appointments', label: 'Appointments', permission: 'appointments.appointment_management' },
  { to: '/apexcareir-main/app/contact-requests', label: 'Contact Requests', permission: 'appointments.appointment_management' },
  { to: '/apexcareir-main/app/users', label: 'Users' },
  { to: '/apexcareir-main/app/profile', label: 'Profile' },
];

export default function BusinessLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const canAccess = (permission?: string, permissionsAny?: string[]) => {
    if (!permission && !permissionsAny?.length) {
      return true;
    }
    if (!user) {
      return false;
    }
    if (user.role === 'superadmin') {
      return true;
    }
    if (permissionsAny?.length) {
      return permissionsAny.some((permissionCode) => user.permissions.includes(permissionCode));
    }
    return Boolean(permission && user.permissions.includes(permission));
  };

  const visibleItems = moduleItems.filter((item) => canAccess(item.permission, item.permissionsAny));
  const canViewNotifications = canAccess('notifications.notifications');

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'active'],
    queryFn: () => listNotifications('active'),
    enabled: canViewNotifications,
    refetchInterval: 30_000,
  });

  const markOneMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleLogout = async () => {
    try {
      if (refreshToken) {
        await logout(refreshToken);
      }
    } catch {
      // clear local session even if API logout fails
    } finally {
      clearTokens();
      navigate('/apexcareir-main/login');
    }
  };

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (!notificationPanelRef.current) return;
      if (!notificationPanelRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [notificationsOpen]);

  return (
    <div className="apexcareir-ui min-h-screen bg-apex-background">
      <div className="flex">
        <aside
          className={`apex-shell-sidebar fixed inset-y-0 z-40 w-72 transform backdrop-blur-sm transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-[rgba(184,149,47,0.16)] px-5 py-4">
            <p className="text-sm font-semibold text-apex-primary">Apexcareir main</p>
            <button className="apex-btn-soft lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
              <X size={18} />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {visibleItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `apex-nav-link ${isActive ? 'apex-nav-link-active' : ''} block rounded-lg px-4 py-2 text-sm transition ${
                    isActive
                      ? 'bg-gradient-to-r from-forest to-gold text-white shadow-md'
                      : 'text-slate-700 hover:bg-white/75 hover:text-forest'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <div className="min-h-screen flex-1 lg:ml-0">
          <header className="apex-shell-header sticky top-0 z-30 flex items-center justify-between px-4 py-3 shadow-sm backdrop-blur sm:px-6">
            <div className="flex items-center gap-3">
              <button className="apex-btn-soft lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar">
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs text-slate-500">Inventory & Business Management</p>
                <h1 className="text-sm font-semibold text-slate-900">Apex Care IR</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {canViewNotifications && (
                <div className="relative" ref={notificationPanelRef}>
                  <button
                    className="apex-btn-soft rounded-full !p-2 text-slate-600"
                    onClick={() => setNotificationsOpen((previous) => !previous)}
                    aria-label="Toggle notifications"
                    aria-expanded={notificationsOpen}
                  >
                    <Bell size={16} />
                    {(notificationsQuery.data?.unread_count ?? 0) > 0 && (
                      <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                        {notificationsQuery.data?.unread_count}
                      </span>
                    )}
                  </button>

                  {notificationsOpen && (
                    <div className="apex-data-card absolute right-0 z-40 mt-2 w-80 p-3 shadow-lg">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800">Notifications</p>
                        <button
                          className="text-[11px] font-medium text-apex-primary hover:underline"
                          onClick={() => markAllMutation.mutate()}
                          disabled={markAllMutation.isPending}
                        >
                          Mark all read
                        </button>
                      </div>

                      <div className="max-h-72 space-y-2 overflow-y-auto">
                        {notificationsQuery.isLoading && <p className="text-xs text-slate-500">Loading...</p>}
                        {notificationsQuery.isError && (
                          <p className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700">Unable to load notifications.</p>
                        )}
                        {notificationsQuery.data?.results.length === 0 && (
                          <p className="apex-data-card-soft px-2 py-1 text-xs text-slate-600">No active notifications.</p>
                        )}
                        {notificationsQuery.data?.results.map((notification) => (
                          <div key={notification.id} className="apex-data-card-soft p-2">
                            <p className="text-xs font-semibold text-slate-800">{notification.title}</p>
                            <p className="mt-0.5 text-[11px] text-slate-600">{notification.message}</p>
                            {!notification.is_read && (
                              <button
                                className="mt-1 text-[11px] font-medium text-apex-primary hover:underline"
                                onClick={() => markOneMutation.mutate(notification.id)}
                                disabled={markOneMutation.isPending}
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button
                        className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        onClick={() => {
                          setNotificationsOpen(false);
                          navigate('/apexcareir-main/app/notifications');
                        }}
                      >
                        Open Notification Center
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="hidden items-center gap-2 rounded-full border border-[rgba(184,149,47,0.16)] bg-white/65 px-3 py-1.5 sm:flex">
                <UserCircle size={16} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-700">{user?.email ?? 'User'}</span>
              </div>
              <button className="apex-btn-soft inline-flex items-center gap-1" onClick={handleLogout}>
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </header>
          <main className="p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
