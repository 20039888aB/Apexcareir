import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import {
  deleteNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  searchNotifications,
  type NotificationItem,
  type NotificationStatusFilter,
} from '../../services';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE');
}

function typeBadgeClass(type: string) {
  if (type === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (type === 'warning') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (type === 'danger') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-slate-200 bg-slate-50 text-slate-700';
}

export default function NotificationsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialStatus = searchParams.get('status');
  const statusOptions: NotificationStatusFilter[] = ['active', 'unread', 'all'];
  const [status, setStatus] = useState<NotificationStatusFilter>(
    statusOptions.includes(initialStatus as NotificationStatusFilter)
      ? (initialStatus as NotificationStatusFilter)
      : 'active',
  );
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [typeFilter, setTypeFilter] = useState<string>(searchParams.get('type') ?? '');

  const notificationsQuery = useQuery({
    queryKey: ['notifications', status, query, typeFilter],
    queryFn: () =>
      query || typeFilter
        ? searchNotifications({ status, q: query || undefined, type: typeFilter || undefined })
        : listNotifications(status),
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

  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notificationTypes: NotificationItem['notification_type'][] = [
    'inventory',
    'sales',
    'finance',
    'supplier',
    'report',
    'appointment',
    'system',
    'security',
  ];

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Notification Center</h2>
            <p className="mt-1 text-sm text-slate-600">
              Live operational alerts for stock, large sales, and high expenses.
            </p>
          </div>
          <button className="apex-btn-soft" onClick={() => markAllMutation.mutate()} disabled={markAllMutation.isPending}>
            Mark all as read
          </button>
        </div>
      </section>

      <section className="apex-glass-panel p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {(statusOptions as NotificationStatusFilter[]).map((filterValue) => (
            <button
              key={filterValue}
              className={`apex-tab ${status === filterValue ? 'apex-tab-active' : 'apex-tab-idle'}`}
              onClick={() => setStatus(filterValue)}
            >
              {filterValue[0].toUpperCase() + filterValue.slice(1)}
            </button>
          ))}
        </div>
        <div className="mb-3 grid gap-2 md:grid-cols-[1fr_220px]">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search notifications..."
          />
          <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
            <option value="">All notification types</option>
            {notificationTypes.map((typeOption) => (
              <option key={typeOption} value={typeOption}>
                {typeOption}
              </option>
            ))}
          </select>
        </div>

        {notificationsQuery.isLoading && <PageSkeleton rows={4} />}
        {notificationsQuery.isError && <PageErrorState message="Failed to load notifications." onRetry={() => notificationsQuery.refetch()} />}
        {markAllMutation.isError && <PageErrorState message="Unable to mark all notifications as read." />}
        {deleteMutation.isError && <PageErrorState message="Unable to delete notification." />}

        {notificationsQuery.data && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Unread active alerts: {notificationsQuery.data.unread_count}</p>
            {notificationsQuery.data.results.length === 0 && (
              <EmptyState title="No Notifications Found" message="No notifications match the selected filter right now." />
            )}
            {notificationsQuery.data.results.map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border p-3 ${notification.is_read ? 'border-slate-200 bg-white/80' : 'border-blue-200 bg-blue-50/40'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{notification.title}</p>
                    <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(notification.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${typeBadgeClass(notification.type)}`}>
                      {notification.type}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {notification.notification_type}
                    </span>
                    {!notification.is_read && (
                      <button
                        className="apex-btn-soft !px-2 !py-1 text-[11px]"
                        onClick={() => markOneMutation.mutate(notification.id)}
                        disabled={markOneMutation.isPending}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="apex-btn-soft !px-2 !py-1 text-[11px]"
                      onClick={() => deleteMutation.mutate(notification.id)}
                      disabled={deleteMutation.isPending}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
