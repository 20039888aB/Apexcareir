from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.notifications.models import Notification
from apps.reports.services.detailed_email_report import queue_detailed_period_report


class Command(BaseCommand):
    help = "Queue detailed weekly and monthly report notification emails."

    def add_arguments(self, parser):
        parser.add_argument(
            "--period",
            choices=["weekly", "monthly", "both"],
            default="both",
            help="Which report period notification to send.",
        )

    def handle(self, *args, **options):
        period = options["period"]
        today = timezone.localdate()
        week_start = today - timedelta(days=7)
        month_start = today.replace(day=1)

        if period in {"weekly", "both"}:
            result = queue_detailed_period_report(
                period_label="Weekly",
                start_date=week_start,
                end_date=today,
                event_code="reports.weekly_summary",
                dedup_key=f"weekly-report-{today.isoformat()}",
                priority=Notification.Priority.MEDIUM,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Weekly detailed report queued for {len(result['recipients'])} recipient(s)."
                )
            )

        if period in {"monthly", "both"}:
            result = queue_detailed_period_report(
                period_label="Monthly",
                start_date=month_start,
                end_date=today,
                event_code="reports.monthly_summary",
                dedup_key=f"monthly-report-{today.strftime('%Y-%m')}",
                priority=Notification.Priority.HIGH,
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Monthly detailed report queued for {len(result['recipients'])} recipient(s)."
                )
            )

        self.stdout.write(self.style.SUCCESS(f"Detailed report notifications processed for period={period}."))
