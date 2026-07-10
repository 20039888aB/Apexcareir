from django.conf import settings
from django.db import models


class Notification(models.Model):
    class NotificationType(models.TextChoices):
        INVENTORY = "inventory", "Inventory"
        SALES = "sales", "Sales"
        FINANCE = "finance", "Finance"
        SUPPLIER = "supplier", "Supplier"
        REPORT = "report", "Report"
        APPOINTMENT = "appointment", "Appointment"
        SYSTEM = "system", "System"
        SECURITY = "security", "Security"

    class Priority(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"
        CRITICAL = "critical", "Critical"

    class DeliveryStatus(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    class Type(models.TextChoices):
        INFO = "info", "Info"
        SUCCESS = "success", "Success"
        WARNING = "warning", "Warning"
        DANGER = "danger", "Danger"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    recipient_email = models.EmailField(blank=True)
    title = models.CharField(max_length=180)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NotificationType.choices, default=NotificationType.SYSTEM)
    priority = models.CharField(max_length=20, choices=Priority.choices, default=Priority.MEDIUM)
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    event_code = models.CharField(max_length=80)
    dedup_key = models.CharField(max_length=180)
    related_module = models.CharField(max_length=60, blank=True)
    reference_id = models.CharField(max_length=80, blank=True)
    source_model = models.CharField(max_length=120, blank=True)
    source_id = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.QUEUED)
    is_read = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    read_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="created_notifications",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["recipient", "dedup_key"], name="uniq_notification_recipient_dedup"),
        ]
        indexes = [
            models.Index(fields=["recipient", "is_read"]),
            models.Index(fields=["recipient", "is_active"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["event_code"]),
        ]

    def __str__(self):
        return f"{self.recipient_id} - {self.title}"


class NotificationRecipient(models.Model):
    notification_type = models.CharField(
        max_length=20,
        choices=Notification.NotificationType.choices,
        default=Notification.NotificationType.SYSTEM,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="notification_recipient_rules",
        null=True,
        blank=True,
    )
    email = models.EmailField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["notification_type", "-created_at"]

    def __str__(self):
        return self.email or (self.user.email if self.user else f"Recipient #{self.pk}")


class NotificationPreference(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notification_preferences")
    inventory_emails = models.BooleanField(default=True)
    sales_emails = models.BooleanField(default=True)
    finance_emails = models.BooleanField(default=True)
    reports_emails = models.BooleanField(default=True)
    system_emails = models.BooleanField(default=True)
    appointments_emails = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return f"Notification preferences for {self.user.email}"


class EmailNotificationLog(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        FAILED = "failed", "Failed"

    notification = models.ForeignKey(
        Notification,
        on_delete=models.CASCADE,
        related_name="email_logs",
        null=True,
        blank=True,
    )
    recipient = models.EmailField()
    subject = models.CharField(max_length=200)
    html_content = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.QUEUED)
    error_message = models.TextField(blank=True)
    sent_time = models.DateTimeField(null=True, blank=True)
    retry_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["recipient"]),
        ]

    def __str__(self):
        return f"{self.recipient} - {self.subject} ({self.status})"


class ScheduledJob(models.Model):
    class IntervalUnit(models.TextChoices):
        MINUTES = "minutes", "Minutes"
        HOURS = "hours", "Hours"
        DAYS = "days", "Days"
        WEEKS = "weeks", "Weeks"

    class LastStatus(models.TextChoices):
        IDLE = "idle", "Idle"
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    key = models.CharField(max_length=120, unique=True)
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    command = models.CharField(max_length=120)
    command_kwargs = models.JSONField(default=dict, blank=True)
    interval_value = models.PositiveIntegerField(default=1)
    interval_unit = models.CharField(max_length=20, choices=IntervalUnit.choices, default=IntervalUnit.MINUTES)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    next_run_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(max_length=20, choices=LastStatus.choices, default=LastStatus.IDLE)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["is_active", "next_run_at"]),
            models.Index(fields=["key"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.key})"


class ScheduledJobRunLog(models.Model):
    class Status(models.TextChoices):
        SUCCESS = "success", "Success"
        FAILED = "failed", "Failed"

    job = models.ForeignKey(ScheduledJob, on_delete=models.CASCADE, related_name="run_logs")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.SUCCESS)
    output = models.TextField(blank=True)
    error = models.TextField(blank=True)
    started_at = models.DateTimeField()
    finished_at = models.DateTimeField()
    duration_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["job", "created_at"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.job.key} - {self.status} @ {self.started_at}"
