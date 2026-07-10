from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    EmailNotificationLogViewSet,
    NotificationListAPIView,
    NotificationMarkAllReadAPIView,
    NotificationMarkReadAPIView,
    NotificationPreferenceAPIView,
    NotificationRecipientViewSet,
    NotificationResendEmailAPIView,
    ScheduledJobRunLogViewSet,
    ScheduledJobViewSet,
)

router = DefaultRouter()
router.register("notification-recipients", NotificationRecipientViewSet, basename="notification-recipients")
router.register("notification-email-logs", EmailNotificationLogViewSet, basename="notification-email-logs")
router.register("scheduled-jobs", ScheduledJobViewSet, basename="scheduled-jobs")
router.register("scheduled-job-runs", ScheduledJobRunLogViewSet, basename="scheduled-job-runs")

urlpatterns = [
    path("notifications/", NotificationListAPIView.as_view(), name="notifications-list"),
    path("notifications/mark-all-read/", NotificationMarkAllReadAPIView.as_view(), name="notifications-mark-all-read"),
    path("notifications/<int:notification_id>/mark-read/", NotificationMarkReadAPIView.as_view(), name="notifications-mark-read"),
    path("notifications/preferences/", NotificationPreferenceAPIView.as_view(), name="notifications-preferences"),
    path("notifications/email-logs/<int:log_id>/resend/", NotificationResendEmailAPIView.as_view(), name="notifications-email-resend"),
]

urlpatterns += router.urls
