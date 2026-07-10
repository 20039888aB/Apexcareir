from django.core.management.base import BaseCommand

from apps.common.models import CompanySettings


class Command(BaseCommand):
    help = "Ensure default Apex Care IR company contact details are present."

    def handle(self, *args, **options):
        company = CompanySettings.get_solo()
        self.stdout.write(self.style.SUCCESS(f"Company settings ready: {company.company_name}"))
        self.stdout.write(f"  Email: {company.email or company.support_email}")
        self.stdout.write(f"  Phone: {company.phone}")
        self.stdout.write(f"  Support: {company.support_email}")
