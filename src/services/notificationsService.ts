import { httpClient } from '../api';

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  notification_type: 'inventory' | 'sales' | 'finance' | 'supplier' | 'report' | 'appointment' | 'system' | 'security';
  priority: 'low' | 'medium' | 'high' | 'critical';
  type: 'info' | 'success' | 'warning' | 'danger';
  event_code: string;
  related_module: string;
  reference_id: string;
  source_model: string;
  source_id: number | null;
  status: 'queued' | 'sent' | 'failed';
  is_read: boolean;
  is_active: boolean;
  read_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationListResponse = {
  unread_count: number;
  results: NotificationItem[];
};

export type NotificationStatusFilter = 'active' | 'unread' | 'all';

export async function listNotifications(status: NotificationStatusFilter = 'active') {
  const response = await httpClient.get<NotificationListResponse>('/notifications/', {
    params: { status },
  });
  return response.data;
}

export async function searchNotifications(params: {
  status?: NotificationStatusFilter;
  q?: string;
  type?: string;
}) {
  const response = await httpClient.get<NotificationListResponse>('/notifications/', {
    params: {
      status: params.status ?? 'active',
      q: params.q || undefined,
      type: params.type || undefined,
    },
  });
  return response.data;
}

export async function markNotificationRead(notificationId: number) {
  await httpClient.post(`/notifications/${notificationId}/mark-read/`);
}

export async function markAllNotificationsRead() {
  await httpClient.post('/notifications/mark-all-read/');
}

export async function deleteNotification(notificationId: number) {
  await httpClient.delete(`/notifications/${notificationId}/mark-read/`);
}
