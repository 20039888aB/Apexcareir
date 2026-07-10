from rest_framework import serializers

from .models import (
    EmailNotificationLog,
    Notification,
    NotificationPreference,
    NotificationRecipient,
    ScheduledJob,
    ScheduledJobRunLog,
)


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = [
            "id",
            "title",
            "message",
            "notification_type",
            "priority",
            "type",
            "event_code",
            "related_module",
            "reference_id",
            "source_model",
            "source_id",
            "status",
            "is_read",
            "is_active",
            "read_at",
            "sent_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreference
        fields = [
            "inventory_emails",
            "sales_emails",
            "finance_emails",
            "reports_emails",
            "system_emails",
            "appointments_emails",
            "updated_at",
        ]
        read_only_fields = ["updated_at"]


class NotificationRecipientSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = NotificationRecipient
        fields = ["id", "notification_type", "user", "user_email", "email", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at", "user_email"]


class EmailNotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmailNotificationLog
        fields = [
            "id",
            "notification",
            "recipient",
            "subject",
            "status",
            "error_message",
            "sent_time",
            "retry_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields


class ScheduledJobSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduledJob
        fields = [
            "id",
            "key",
            "name",
            "description",
            "command",
            "command_kwargs",
            "interval_value",
            "interval_unit",
            "is_active",
            "last_run_at",
            "next_run_at",
            "last_status",
            "last_error",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "key",
            "command",
            "command_kwargs",
            "last_run_at",
            "next_run_at",
            "last_status",
            "last_error",
            "created_at",
            "updated_at",
        ]

    def validate_interval_value(self, value):
        if value < 1:
            raise serializers.ValidationError("interval_value must be at least 1.")
        if value > 10080:
            raise serializers.ValidationError("interval_value is too large.")
        return value


class ScheduledJobRunLogSerializer(serializers.ModelSerializer):
    job_key = serializers.CharField(source="job.key", read_only=True)
    job_name = serializers.CharField(source="job.name", read_only=True)

    class Meta:
        model = ScheduledJobRunLog
        fields = [
            "id",
            "job",
            "job_key",
            "job_name",
            "status",
            "output",
            "error",
            "started_at",
            "finished_at",
            "duration_ms",
            "created_at",
        ]
        read_only_fields = fields
