from decimal import Decimal

from django.core.management.base import BaseCommand

from apps.sales.models import Invoice, InvoiceLineItem
from apps.sales.services.invoice_pdf import save_invoice_pdf


class Command(BaseCommand):
    help = "Clear tax from all invoices and regenerate stored PDFs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-pdf",
            action="store_true",
            help="Only clear tax totals without regenerating PDF files.",
        )

    def handle(self, *args, **options):
        line_updates = 0
        for item in InvoiceLineItem.objects.all().iterator():
            subtotal = Decimal(item.quantity) * item.unit_price
            line_total = subtotal - item.discount
            if item.tax != 0 or item.line_total != line_total:
                item.tax = Decimal("0")
                item.line_total = line_total
                item.save(update_fields=["tax", "line_total"])
                line_updates += 1

        invoice_updates = 0
        for invoice in Invoice.objects.select_related("sale").all().iterator():
            grand_total = invoice.subtotal - invoice.discount
            if invoice.tax != 0 or invoice.grand_total != grand_total:
                invoice.tax = Decimal("0")
                invoice.grand_total = grand_total
                invoice.save(update_fields=["tax", "grand_total"])
                invoice_updates += 1

            if not options["skip_pdf"]:
                save_invoice_pdf(invoice, invoice.sale)
                self.stdout.write(f"Regenerated PDF for {invoice.invoice_number}")

        self.stdout.write(
            self.style.SUCCESS(
                f"Cleared taxes on {line_updates} line item(s) and {invoice_updates} invoice(s)."
            )
        )
