from django.contrib import admin

from .models import (
    EmailNotificationLog,
    Notification,
    NotificationPreference,
    NotificationRecipient,
    ScheduledJob,
    ScheduledJobRunLog,
)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "recipient",
        "recipient_email",
        "title",
        "notification_type",
        "priority",
        "type",
        "status",
        "is_read",
        "is_active",
        "created_at",
    )
    list_filter = ("notification_type", "priority", "type", "status", "event_code", "is_read", "is_active", "created_at")
    search_fields = ("title", "message", "recipient__email", "event_code", "dedup_key")
    ordering = ("-created_at",)


@admin.register(NotificationRecipient)
class NotificationRecipientAdmin(admin.ModelAdmin):
    list_display = ("id", "notification_type", "user", "email", "is_active", "created_at")
    list_filter = ("notification_type", "is_active", "created_at")
    search_fields = ("email", "user__email")


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "inventory_emails",
        "sales_emails",
        "finance_emails",
        "reports_emails",
        "system_emails",
        "appointments_emails",
    )
    search_fields = ("user__email",)


@admin.register(EmailNotificationLog)
class EmailNotificationLogAdmin(admin.ModelAdmin):
    list_display = ("id", "recipient", "subject", "status", "retry_count", "sent_time", "created_at")
    list_filter = ("status", "sent_time", "created_at")
    search_fields = ("recipient", "subject", "error_message")


@admin.register(ScheduledJob)
class ScheduledJobAdmin(admin.ModelAdmin):
    list_display = ("id", "key", "name", "interval_value", "interval_unit", "is_active", "next_run_at", "last_status")
    list_filter = ("interval_unit", "is_active", "last_status")
    search_fields = ("key", "name", "description", "command")


@admin.register(ScheduledJobRunLog)
class ScheduledJobRunLogAdmin(admin.ModelAdmin):
    list_display = ("id", "job", "status", "started_at", "finished_at", "duration_ms")
    list_filter = ("status", "started_at")
    search_fields = ("job__key", "job__name", "error")
