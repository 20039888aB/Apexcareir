import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, LogOut, Menu, UserCircle, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import BusinessSidebar from '../../components/apexcareir/BusinessSidebar';
import CompanyBrandingHeader from '../../components/apexcareir/CompanyBrandingHeader';
import QuickPreferencesPanel from '../../components/apexcareir/QuickPreferencesPanel';
import SystemClockDisplay from '../../components/apexcareir/SystemClockDisplay';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { listNotifications, logout, markAllNotificationsRead, markNotificationRead } from '../../services';
import { useAuthStore } from '../../store';
import { useResizableSidebar } from '../../hooks/useResizableSidebar';
import { canAccessNavItem, filterVisibleNavGroups } from '../../utils/navAccess';

export default function BusinessLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { width: sidebarWidth, isResizing, startResize } = useResizableSidebar();
  const notificationPanelRef = useRef<HTMLDivElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const clearTokens = useAuthStore((state) => state.clearTokens);

  const visibleNavGroups = useMemo(() => filterVisibleNavGroups(user), [user]);
  const navigationMode = user?.sidebar_navigation_mode ?? 'accordion';
  const canViewNotifications = canAccessNavItem(user, 'notifications.notifications');

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
      navigate(ADMIN_ROUTES.login);
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
          className={`apex-shell-sidebar fixed inset-y-0 z-40 flex h-screen shrink-0 transform flex-col overflow-hidden backdrop-blur-sm transition-transform duration-200 lg:static lg:translate-x-0 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isResizing ? 'apex-shell-sidebar-resizing' : ''}`}
          style={{ width: sidebarWidth }}
        >
          <div className="shrink-0 border-b border-[rgba(184,149,47,0.16)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <CompanyBrandingHeader compact />
              <button className="apex-btn-soft lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="apex-shell-sidebar-nav min-h-0 flex-1">
            <BusinessSidebar
              groups={visibleNavGroups}
              navigationMode={navigationMode}
              onNavigate={() => setSidebarOpen(false)}
            />
          </div>
          <div
            className={`apex-shell-sidebar-resize-handle ${isResizing ? 'apex-shell-sidebar-resize-handle-active' : ''}`}
            onPointerDown={startResize}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-valuemin={200}
            aria-valuemax={520}
            aria-valuenow={sidebarWidth}
          />
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
              <QuickPreferencesPanel />
              <SystemClockDisplay />
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
                          navigate(ADMIN_ROUTES.notifications);
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
