from django.core.management.base import BaseCommand

from apps.notifications.services import process_pending_email_logs


class Command(BaseCommand):
    help = "Send queued notification emails and retry failed ones."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=200)

    def handle(self, *args, **options):
        process_pending_email_logs(limit=options["limit"])
        self.stdout.write(self.style.SUCCESS("Notification email queue processed."))
