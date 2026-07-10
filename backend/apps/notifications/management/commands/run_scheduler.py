import time

from django.core.management.base import BaseCommand

from apps.notifications.services import run_due_scheduled_jobs


class Command(BaseCommand):
    help = "Runs scheduled jobs from database. Use --once for cron/task scheduler mode."

    def add_arguments(self, parser):
        parser.add_argument("--once", action="store_true", help="Run due jobs once and exit.")
        parser.add_argument("--poll-seconds", type=int, default=60, help="Polling interval for continuous mode.")

    def handle(self, *args, **options):
        once = options["once"]
        poll_seconds = max(5, options["poll_seconds"])

        if once:
            run_due_scheduled_jobs()
            self.stdout.write(self.style.SUCCESS("Scheduler run complete (single pass)."))
            return

        self.stdout.write(self.style.SUCCESS(f"Scheduler started. Polling every {poll_seconds}s"))
        try:
            while True:
                run_due_scheduled_jobs()
                time.sleep(poll_seconds)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING("Scheduler stopped by user."))
