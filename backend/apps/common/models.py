from django.conf import settings
from django.db import models


class CompanySettings(models.Model):
    company_name = models.CharField(max_length=255, default="APEX CARE IR")
    address = models.TextField(blank=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    tax_information = models.CharField(max_length=255, blank=True)
    support_email = models.EmailField(blank=True)
    invoice_footer_text = models.TextField(
        blank=True,
        default="Thank you for choosing Apex Care IR. For support, contact us anytime.",
    )
    logo = models.ImageField(upload_to="company/", null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Company settings"

    def __str__(self):
        return self.company_name

    @classmethod
    def get_solo(cls):
        instance, created = cls.objects.get_or_create(
            pk=1,
            defaults={
                "email": "apexcareir@gmail.com",
                "support_email": "apexcareir@gmail.com",
                "phone": "0745902757",
            },
        )
        if not created:
            updated_fields = []
            if not instance.email:
                instance.email = "apexcareir@gmail.com"
                updated_fields.append("email")
            if not instance.support_email:
                instance.support_email = "apexcareir@gmail.com"
                updated_fields.append("support_email")
            if not instance.phone:
                instance.phone = "0745902757"
                updated_fields.append("phone")
            if updated_fields:
                instance.save(update_fields=updated_fields)
        return instance


class DocumentNumberSequence(models.Model):
    key = models.CharField(max_length=40, unique=True)
    prefix = models.CharField(max_length=20)
    include_year = models.BooleanField(default=False)
    padding = models.PositiveSmallIntegerField(default=6)
    last_number = models.PositiveIntegerField(default=0)
    last_year = models.PositiveIntegerField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["key"]

    def __str__(self):
        return f"{self.key} ({self.prefix})"


class TransactionEvent(models.Model):
    class EventType(models.TextChoices):
        CREATED = "created", "Created"
        UPDATED = "updated", "Updated"
        PAID = "paid", "Paid"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        ADJUSTED = "adjusted", "Adjusted"
        CANCELLED = "cancelled", "Cancelled"
        ISSUED = "issued", "Issued"
        EMAILED = "emailed", "Emailed"
        SENT = "sent", "Sent"
        VIEWED = "viewed", "Viewed"
        REGENERATED = "regenerated", "Regenerated"

    module = models.CharField(max_length=40)
    reference_number = models.CharField(max_length=100, db_index=True)
    reference_id = models.CharField(max_length=64, blank=True)
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    description = models.TextField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transaction_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["module", "reference_number"]),
            models.Index(fields=["reference_id"]),
        ]

    def __str__(self):
        return f"{self.reference_number} - {self.event_type}"
