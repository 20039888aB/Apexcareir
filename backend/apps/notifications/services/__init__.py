from datetime import timedelta
from decimal import Decimal
from typing import List, Optional

from django.core.management import call_command
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.db.models import F
from django.utils import timezone

from apps.accounts.models import User
from apps.finance.models import Expense
from apps.inventory.models import Product
from apps.sales.models import Sale

from ..models import (
    EmailNotificationLog,
    Notification,
    NotificationPreference,
    NotificationRecipient,
    ScheduledJob,
    ScheduledJobRunLog,
)

LARGE_SALE_THRESHOLD = Decimal("25000")
LARGE_EXPENSE_THRESHOLD = Decimal("15000")

DEFAULT_SCHEDULED_JOBS = [
    {
        "key": "email_queue_processor",
        "name": "Email Queue Processor",
        "description": "Processes queued and failed notification emails.",
        "command": "process_notification_emails",
        "command_kwargs": {"limit": 200},
        "interval_value": 5,
        "interval_unit": ScheduledJob.IntervalUnit.MINUTES,
    },
    {
        "key": "weekly_reports_dispatch",
        "name": "Weekly Report Dispatch",
        "description": "Sends weekly report summary notifications by email.",
        "command": "send_report_notifications",
        "command_kwargs": {"period": "weekly"},
        "interval_value": 7,
        "interval_unit": ScheduledJob.IntervalUnit.DAYS,
    },
    {
        "key": "monthly_reports_dispatch",
        "name": "Monthly Report Dispatch",
        "description": "Sends monthly report summary notifications by email.",
        "command": "send_report_notifications",
        "command_kwargs": {"period": "monthly"},
        "interval_value": 30,
        "interval_unit": ScheduledJob.IntervalUnit.DAYS,
    },
]


def _safe_subject(subject: str):
    return (subject or "").replace("\n", " ").replace("\r", " ").strip()[:200]


def _build_email_html(*, title: str, message: str, notification: Notification):
    now = timezone.localtime().strftime("%Y-%m-%d %H:%M")
    logo_url = f"{getattr(settings, 'FRONTEND_APP_URL', 'http://localhost:5173')}/logo.jpeg"
    return f"""
    <div style="font-family: Arial, sans-serif; background:#f7fafc; padding:24px; color:#1f2937;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        <div style="padding:16px 20px; background:#6E2C3E; color:#fff;">
          <img src="{logo_url}" alt="Apex Care IR" style="height:36px; vertical-align:middle; margin-right:10px;" />
          <span style="font-size:16px; font-weight:700;">Apex Care IR Notification</span>
        </div>
        <div style="padding:20px;">
          <h2 style="margin:0 0 12px; color:#111827; font-size:20px;">{title}</h2>
          <p style="margin:0 0 16px; line-height:1.6;">{message}</p>
          <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px;">
            <p style="margin:0; font-size:13px;"><strong>Notification Type:</strong> {notification.notification_type}</p>
            <p style="margin:6px 0 0; font-size:13px;"><strong>Priority:</strong> {notification.priority}</p>
            <p style="margin:6px 0 0; font-size:13px;"><strong>Date & Time:</strong> {now}</p>
            <p style="margin:6px 0 0; font-size:13px;"><strong>Action Summary:</strong> {notification.event_code}</p>
          </div>
        </div>
        <div style="padding:14px 20px; background:#f3f4f6; color:#6b7280; font-size:12px;">
          Apex Care IR &middot; Inventory & Business Management System
        </div>
      </div>
    </div>
    """


def _user_pref_allows_notification(user: User, notification_type: str):
    prefs, _ = NotificationPreference.objects.get_or_create(user=user)
    mapping = {
        Notification.NotificationType.INVENTORY: prefs.inventory_emails,
        Notification.NotificationType.SALES: prefs.sales_emails,
        Notification.NotificationType.FINANCE: prefs.finance_emails,
        Notification.NotificationType.REPORT: prefs.reports_emails,
        Notification.NotificationType.SYSTEM: prefs.system_emails,
        Notification.NotificationType.SECURITY: prefs.system_emails,
        Notification.NotificationType.APPOINTMENT: prefs.appointments_emails,
        Notification.NotificationType.SUPPLIER: prefs.inventory_emails,
    }
    return mapping.get(notification_type, True)


def _resolve_recipient_users(notification_type: str):
    configured = NotificationRecipient.objects.filter(notification_type=notification_type, is_active=True).select_related("user")
    users = [entry.user for entry in configured if entry.user and entry.user.is_active]
    if users:
        return users
    return list(User.objects.filter(role=User.Role.SUPERADMIN, is_active=True))


def _resolve_recipient_emails(notification_type: str, fallback_users):
    configured = NotificationRecipient.objects.filter(notification_type=notification_type, is_active=True)
    emails = set()
    for entry in configured:
        if entry.email:
            try:
                validate_email(entry.email)
                emails.add(entry.email.strip().lower())
            except Exception:
                continue
    for user in fallback_users:
        if user.email:
            emails.add(user.email.strip().lower())
    return sorted(emails)


def _enqueue_email(notification: Notification):
    if not notification.recipient_email:
        return None

    subject = _safe_subject(notification.title)
    html_content = _build_email_html(title=notification.title, message=notification.message, notification=notification)
    return EmailNotificationLog.objects.create(
        notification=notification,
        recipient=notification.recipient_email,
        subject=subject,
        html_content=html_content,
        status=EmailNotificationLog.Status.QUEUED,
    )


class NotificationService:
    @staticmethod
    @transaction.atomic
    def send(
        *,
        title: str,
        message: str,
        event_code: str,
        notification_type: str,
        priority: str = Notification.Priority.MEDIUM,
        ui_type: str = Notification.Type.INFO,
        dedup_key: Optional[str] = None,
        related_module: str = "",
        reference_id: str = "",
        source_model: str = "",
        source_id: Optional[int] = None,
        created_by=None,
        direct_users: Optional[List[User]] = None,
        direct_emails: Optional[List[str]] = None,
    ):
        recipient_users = direct_users or _resolve_recipient_users(notification_type)
        recipient_emails = sorted(set(direct_emails or []))
        if not recipient_emails:
            recipient_emails = _resolve_recipient_emails(notification_type, recipient_users)

        created_notifications = []
        for user in recipient_users:
            if not _user_pref_allows_notification(user, notification_type):
                continue
            final_dedup = dedup_key or f"{event_code}-{notification_type}-{reference_id or source_id or timezone.now().timestamp()}"
            final_dedup = f"{final_dedup}-{user.id}"
            try:
                notification, created = Notification.objects.update_or_create(
                    recipient=user,
                    dedup_key=final_dedup,
                    defaults={
                        "recipient_email": user.email,
                        "title": title[:180],
                        "message": message,
                        "notification_type": notification_type,
                        "priority": priority,
                        "type": ui_type,
                        "event_code": event_code,
                        "related_module": related_module[:60],
                        "reference_id": str(reference_id)[:80],
                        "source_model": source_model[:120],
                        "source_id": source_id,
                        "status": Notification.DeliveryStatus.QUEUED,
                        "is_active": True,
                        "created_by": created_by if getattr(created_by, "is_authenticated", False) else None,
                    },
                )
            except IntegrityError:
                continue
            created_notifications.append(notification)
            if created:
                _enqueue_email(notification)

        for email in recipient_emails:
            if not created_notifications:
                subject = _safe_subject(title)
                placeholder = Notification(
                    title=title[:180],
                    message=message,
                    event_code=event_code,
                    notification_type=notification_type,
                    priority=priority,
                    type=ui_type,
                )
                html_content = _build_email_html(title=title, message=message, notification=placeholder)
                EmailNotificationLog.objects.create(
                    recipient=email,
                    subject=subject,
                    html_content=html_content,
                    status=EmailNotificationLog.Status.QUEUED,
                )

        return created_notifications


def process_pending_email_logs(limit=100):
    logs = (
        EmailNotificationLog.objects.select_related("notification")
        .filter(status__in=[EmailNotificationLog.Status.QUEUED, EmailNotificationLog.Status.FAILED])
        .order_by("created_at")[:limit]
    )
    for log in logs:
        try:
            msg = EmailMultiAlternatives(
                subject=_safe_subject(log.subject),
                body="Apex Care IR notification",
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[log.recipient],
            )
            msg.attach_alternative(log.html_content, "text/html")
            msg.send(fail_silently=False)
            log.status = EmailNotificationLog.Status.SENT
            log.error_message = ""
            log.sent_time = timezone.now()
            log.save(update_fields=["status", "error_message", "sent_time", "updated_at"])
            if log.notification:
                log.notification.status = Notification.DeliveryStatus.SENT
                log.notification.sent_at = log.sent_time
                log.notification.save(update_fields=["status", "sent_at", "updated_at"])
        except Exception as exc:  # noqa: BLE001
            log.status = EmailNotificationLog.Status.FAILED
            log.error_message = str(exc)[:4000]
            log.retry_count += 1
            log.save(update_fields=["status", "error_message", "retry_count", "updated_at"])
            if log.notification:
                log.notification.status = Notification.DeliveryStatus.FAILED
                log.notification.save(update_fields=["status", "updated_at"])


def _compute_next_run_at(from_time, interval_value, interval_unit):
    if interval_unit == ScheduledJob.IntervalUnit.MINUTES:
        return from_time + timedelta(minutes=interval_value)
    if interval_unit == ScheduledJob.IntervalUnit.HOURS:
        return from_time + timedelta(hours=interval_value)
    if interval_unit == ScheduledJob.IntervalUnit.DAYS:
        return from_time + timedelta(days=interval_value)
    return from_time + timedelta(weeks=interval_value)


def ensure_default_scheduled_jobs():
    now = timezone.now()
    for item in DEFAULT_SCHEDULED_JOBS:
        job, created = ScheduledJob.objects.get_or_create(
            key=item["key"],
            defaults={
                "name": item["name"],
                "description": item["description"],
                "command": item["command"],
                "command_kwargs": item["command_kwargs"],
                "interval_value": item["interval_value"],
                "interval_unit": item["interval_unit"],
                "is_active": True,
                "next_run_at": _compute_next_run_at(now, item["interval_value"], item["interval_unit"]),
            },
        )
        if job.next_run_at is None:
            job.next_run_at = _compute_next_run_at(now, job.interval_value, job.interval_unit)
            job.save(update_fields=["next_run_at", "updated_at"])
        if created:
            continue


def _run_scheduled_job(job):
    started_at = timezone.now()
    output = ""
    error = ""
    status = ScheduledJobRunLog.Status.SUCCESS
    try:
        kwargs = job.command_kwargs or {}
        call_command(job.command, **kwargs)
        output = f"Executed {job.command} with kwargs={kwargs}"
        job.last_status = ScheduledJob.LastStatus.SUCCESS
        job.last_error = ""
    except Exception as exc:  # noqa: BLE001
        status = ScheduledJobRunLog.Status.FAILED
        error = str(exc)[:4000]
        job.last_status = ScheduledJob.LastStatus.FAILED
        job.last_error = error
    finally:
        finished_at = timezone.now()
        duration_ms = int((finished_at - started_at).total_seconds() * 1000)
        job.last_run_at = started_at
        job.next_run_at = _compute_next_run_at(finished_at, job.interval_value, job.interval_unit)
        job.save(update_fields=["last_status", "last_error", "last_run_at", "next_run_at", "updated_at"])
        ScheduledJobRunLog.objects.create(
            job=job,
            status=status,
            output=output,
            error=error,
            started_at=started_at,
            finished_at=finished_at,
            duration_ms=duration_ms,
        )


def run_due_scheduled_jobs():
    ensure_default_scheduled_jobs()
    now = timezone.now()
    due_jobs = ScheduledJob.objects.filter(is_active=True, next_run_at__lte=now).order_by("next_run_at")
    for job in due_jobs:
        _run_scheduled_job(job)


def run_scheduled_job_now(job):
    _run_scheduled_job(job)


def _upsert_notification(
    *,
    user,
    dedup_key,
    event_code,
    title,
    message,
    notification_type,
    source_model="",
    source_id=None,
    is_active=True,
):
    Notification.objects.update_or_create(
        recipient=user,
        dedup_key=dedup_key,
        defaults={
            "recipient_email": user.email,
            "event_code": event_code,
            "title": title,
            "message": message,
            "type": notification_type,
            "notification_type": Notification.NotificationType.SYSTEM,
            "priority": Notification.Priority.MEDIUM,
            "source_model": source_model,
            "source_id": source_id,
            "is_active": is_active,
        },
    )


@transaction.atomic
def sync_user_notifications(user):
    now = timezone.localtime()
    recent_window_start = now - timedelta(days=7)

    low_stock_products = Product.objects.filter(
        status=Product.Status.ACTIVE,
        current_stock__lte=F("minimum_stock"),
    )
    active_low_stock_keys = set()
    for product in low_stock_products:
        dedup_key = f"low-stock-{product.id}"
        active_low_stock_keys.add(dedup_key)
        _upsert_notification(
            user=user,
            dedup_key=dedup_key,
            event_code="inventory.low_stock",
            title="Low Stock Alert",
            message=(
                f"{product.name} ({product.sku}) stock is {product.current_stock} units, "
                f"below minimum level of {product.minimum_stock}."
            ),
            notification_type=Notification.Type.WARNING,
            source_model="inventory.product",
            source_id=product.id,
            is_active=True,
        )

    Notification.objects.filter(
        recipient=user,
        event_code="inventory.low_stock",
        is_active=True,
    ).exclude(dedup_key__in=active_low_stock_keys).update(is_active=False)

    large_sales = Sale.objects.filter(
        date__gte=recent_window_start.date(),
        total__gte=LARGE_SALE_THRESHOLD,
    ).order_by("-date", "-created_at")[:20]
    for sale in large_sales:
        _upsert_notification(
            user=user,
            dedup_key=f"large-sale-{sale.id}",
            event_code="sales.large_sale",
            title="Large Sale Recorded",
            message=(
                f"Invoice {sale.invoice_number} for {sale.customer} reached "
                f"KES {sale.total}."
            ),
            notification_type=Notification.Type.SUCCESS,
            source_model="sales.sale",
            source_id=sale.id,
            is_active=True,
        )

    large_expenses = Expense.objects.filter(
        date__gte=recent_window_start.date(),
        amount__gte=LARGE_EXPENSE_THRESHOLD,
    ).order_by("-date", "-created_at")[:20]
    for expense in large_expenses:
        _upsert_notification(
            user=user,
            dedup_key=f"large-expense-{expense.id}",
            event_code="finance.large_expense",
            title="Large Expense Logged",
            message=(
                f"Expense category '{expense.category}' recorded at KES {expense.amount} "
                f"using {expense.payment_method}."
            ),
            notification_type=Notification.Type.DANGER,
            source_model="finance.expense",
            source_id=expense.id,
            is_active=True,
        )
