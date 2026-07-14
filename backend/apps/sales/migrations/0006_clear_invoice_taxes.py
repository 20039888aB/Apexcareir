from decimal import Decimal

from django.db import migrations


def clear_invoice_taxes(apps, schema_editor):
    InvoiceLineItem = apps.get_model("sales", "InvoiceLineItem")
    Invoice = apps.get_model("sales", "Invoice")

    for item in InvoiceLineItem.objects.all().iterator():
        subtotal = Decimal(item.quantity) * item.unit_price
        line_total = subtotal - item.discount
        if item.tax != 0 or item.line_total != line_total:
            item.tax = Decimal("0")
            item.line_total = line_total
            item.save(update_fields=["tax", "line_total"])

    for invoice in Invoice.objects.all().iterator():
        grand_total = invoice.subtotal - invoice.discount
        if invoice.tax != 0 or invoice.grand_total != grand_total:
            invoice.tax = Decimal("0")
            invoice.grand_total = grand_total
            invoice.save(update_fields=["tax", "grand_total"])


class Migration(migrations.Migration):
    dependencies = [
        ("sales", "0005_invoice_line_items_payments"),
    ]

    operations = [
        migrations.RunPython(clear_invoice_taxes, migrations.RunPython.noop),
    ]
