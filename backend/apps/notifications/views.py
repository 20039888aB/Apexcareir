from django.utils import timezone
from django.db.models import Q
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.mixins import SuperAdminDestroyMixin
from apps.accounts.permissions import HasBusinessPermission, IsSuperAdmin
from apps.audit_logs.services import log_audit_event

from .models import (
    EmailNotificationLog,
    Notification,
    NotificationPreference,
    NotificationRecipient,
    ScheduledJob,
    ScheduledJobRunLog,
)
from .serializers import (
    EmailNotificationLogSerializer,
    NotificationPreferenceSerializer,
    NotificationRecipientSerializer,
    NotificationSerializer,
    ScheduledJobRunLogSerializer,
    ScheduledJobSerializer,
)
from .services import (
    ensure_default_scheduled_jobs,
    process_pending_email_logs,
    run_due_scheduled_jobs,
    run_scheduled_job_now,
    sync_user_notifications,
)


class NotificationListAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"

    def get(self, request):
        run_due_scheduled_jobs()
        sync_user_notifications(request.user)
        status_filter = (request.query_params.get("status") or "active").strip().lower()
        query = (request.query_params.get("q") or "").strip()
        type_filter = (request.query_params.get("type") or "").strip().lower()
        queryset = Notification.objects.filter(recipient=request.user)

        if status_filter == "unread":
            queryset = queryset.filter(is_read=False, is_active=True)
        elif status_filter == "all":
            queryset = queryset
        else:
            queryset = queryset.filter(is_active=True)

        if query:
            queryset = queryset.filter(Q(title__icontains=query) | Q(message__icontains=query))
        if type_filter:
            queryset = queryset.filter(notification_type=type_filter)

        notifications = queryset.order_by("-created_at")[:50]
        unread_count = Notification.objects.filter(recipient=request.user, is_read=False, is_active=True).count()
        return Response(
            {
                "unread_count": unread_count,
                "results": NotificationSerializer(notifications, many=True).data,
            }
        )


class NotificationMarkReadAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"

    def post(self, request, notification_id):
        try:
            notification = Notification.objects.get(pk=notification_id, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=404)

        if not notification.is_read:
            notification.is_read = True
            notification.read_at = timezone.now()
            notification.save(update_fields=["is_read", "read_at", "updated_at"])
        return Response({"status": "ok"})

    def delete(self, request, notification_id):
        try:
            notification = Notification.objects.get(pk=notification_id, recipient=request.user)
        except Notification.DoesNotExist:
            return Response({"detail": "Notification not found."}, status=404)
        notification.delete()
        return Response(status=204)


class NotificationMarkAllReadAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"

    def post(self, request):
        now = timezone.now()
        Notification.objects.filter(recipient=request.user, is_read=False, is_active=True).update(
            is_read=True,
            read_at=now,
        )
        return Response({"status": "ok"})


class NotificationPreferenceAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        return Response(NotificationPreferenceSerializer(pref).data)

    def patch(self, request):
        pref, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(pref, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class NotificationRecipientViewSet(viewsets.ModelViewSet):
    queryset = NotificationRecipient.objects.select_related("user").all()
    serializer_class = NotificationRecipientSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"


class EmailNotificationLogViewSet(SuperAdminDestroyMixin, viewsets.ModelViewSet):
    queryset = EmailNotificationLog.objects.select_related("notification").all()
    serializer_class = EmailNotificationLogSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"
    http_method_names = ["get", "head", "options", "delete", "post"]

    def get_queryset(self):
        queryset = super().get_queryset()
        query = (self.request.query_params.get("q") or "").strip()
        status_filter = (self.request.query_params.get("status") or "").strip()
        if query:
            queryset = queryset.filter(Q(recipient__icontains=query) | Q(subject__icontains=query))
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        return queryset.order_by("-created_at")

    def perform_destroy(self, instance):
        log_id = instance.id
        instance.delete()
        log_audit_event(
            request=self.request,
            action="email_log_delete",
            module="notifications",
            description=f"SuperAdmin deleted email notification log #{log_id}.",
            metadata={"deleted_log_id": log_id},
        )

    @action(detail=False, methods=["post"], url_path="purge")
    def purge(self, request):
        queryset = self.get_queryset()
        deleted_count, _ = queryset.delete()
        log_audit_event(
            request=request,
            action="email_log_purge",
            module="notifications",
            description=f"SuperAdmin purged {deleted_count} email notification log record(s).",
            metadata={"deleted_count": deleted_count},
        )
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)


class ScheduledJobViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduledJobSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"
    http_method_names = ["get", "patch", "head", "options", "post"]

    def get_queryset(self):
        ensure_default_scheduled_jobs()
        return ScheduledJob.objects.all()

    @action(detail=True, methods=["post"], url_path="run-now")
    def run_now(self, request, pk=None):
        job = self.get_object()
        run_scheduled_job_now(job)
        job.refresh_from_db()
        return Response(ScheduledJobSerializer(job).data)

    @action(detail=False, methods=["post"], url_path="send-report-now", permission_classes=[IsAuthenticated, HasBusinessPermission])
    def send_report_now(self, request):
        from django.core.management import call_command

        period = (request.data.get("period") or "weekly").strip().lower()
        if period not in {"weekly", "monthly", "both"}:
            return Response({"detail": "period must be weekly, monthly, or both."}, status=status.HTTP_400_BAD_REQUEST)

        call_command("send_report_notifications", period=period)
        log_audit_event(
            request=request,
            action="report_send_now",
            module="notifications",
            description=f"Manual report dispatch triggered for period={period}.",
            metadata={"period": period},
        )
        return Response({"status": "ok", "period": period}, status=status.HTTP_200_OK)


class ScheduledJobRunLogViewSet(SuperAdminDestroyMixin, viewsets.ModelViewSet):
    serializer_class = ScheduledJobRunLogSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"
    http_method_names = ["get", "head", "options", "delete", "post"]

    def get_queryset(self):
        job_key = (self.request.query_params.get("job_key") or "").strip()
        queryset = ScheduledJobRunLog.objects.select_related("job")
        if job_key:
            queryset = queryset.filter(job__key=job_key)
        return queryset.order_by("-created_at")

    def perform_destroy(self, instance):
        log_id = instance.id
        instance.delete()
        log_audit_event(
            request=self.request,
            action="scheduler_run_log_delete",
            module="notifications",
            description=f"SuperAdmin deleted scheduler run log #{log_id}.",
            metadata={"deleted_log_id": log_id},
        )

    @action(detail=False, methods=["post"], url_path="purge")
    def purge(self, request):
        job_key = (request.data.get("job_key") or "").strip()
        queryset = ScheduledJobRunLog.objects.all()
        if job_key:
            queryset = queryset.filter(job__key=job_key)
        deleted_count, _ = queryset.delete()
        log_audit_event(
            request=request,
            action="scheduler_run_log_purge",
            module="notifications",
            description=f"SuperAdmin purged {deleted_count} scheduler run log record(s).",
            metadata={"deleted_count": deleted_count, "job_key": job_key or None},
        )
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)


class NotificationResendEmailAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "notifications.notifications"

    def post(self, request, log_id):
        try:
            log = EmailNotificationLog.objects.get(pk=log_id)
        except EmailNotificationLog.DoesNotExist:
            return Response({"detail": "Email log not found."}, status=404)

        log.status = EmailNotificationLog.Status.QUEUED
        log.error_message = ""
        log.save(update_fields=["status", "error_message", "updated_at"])
        process_pending_email_logs(limit=20)
        log.refresh_from_db()
        return Response({"status": log.status, "sent_time": log.sent_time})
