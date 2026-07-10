from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.inventory.models import Product, ProductCategory, StockReceipt, StockReceiptBatch
from apps.suppliers.models import Supplier

SUPPLIER_NAME = "Jiangsu Province Huaxing Medical Apparatus Industry Co., Ltd. (HUAXING)"
DEFAULT_INVOICE_NUMBER = "HUAXING-2026-001"
DEFAULT_USD_RATE = Decimal("129")

INVOICE_LINES = [
    {
        "name": "Semi-automatic Biopsy Needle with Coaxial Needle",
        "model_name": "18G × 200 mm",
        "sku": "HX-BIO-18G-200",
        "category": "Interventional Radiology",
        "quantity": 50,
        "line_total_usd": Decimal("340.00"),
    },
    {
        "name": "Semi-automatic Biopsy Needle with Coaxial Needle",
        "model_name": "16G × 200 mm",
        "sku": "HX-BIO-16G-200",
        "category": "Interventional Radiology",
        "quantity": 50,
        "line_total_usd": Decimal("340.00"),
    },
    {
        "name": "100% Silicone Foley Catheter",
        "model_name": "2-Way 8 Fr",
        "sku": "HX-FOLEY-8FR",
        "category": "Medical Consumables",
        "quantity": 10,
        "line_total_usd": Decimal("10.00"),
    },
    {
        "name": "100% Silicone Foley Catheter",
        "model_name": "2-Way 14 Fr",
        "sku": "HX-FOLEY-14FR",
        "category": "Medical Consumables",
        "quantity": 100,
        "line_total_usd": Decimal("100.00"),
    },
    {
        "name": "100% Silicone Foley Catheter",
        "model_name": "2-Way 18 Fr",
        "sku": "HX-FOLEY-18FR",
        "category": "Medical Consumables",
        "quantity": 40,
        "line_total_usd": Decimal("40.00"),
    },
    {
        "name": "Endotracheal Tube (Cuffed)",
        "model_name": "Size 6",
        "sku": "HX-ETT-CUFF-6",
        "category": "Anaesthesia & Airway",
        "quantity": 10,
        "line_total_usd": Decimal("5.00"),
    },
    {
        "name": "Endotracheal Tube (Cuffed)",
        "model_name": "Size 7.5",
        "sku": "HX-ETT-CUFF-7.5",
        "category": "Anaesthesia & Airway",
        "quantity": 40,
        "line_total_usd": Decimal("20.00"),
    },
    {
        "name": "Endotracheal Tube (Cuffed)",
        "model_name": "Size 8",
        "sku": "HX-ETT-CUFF-8",
        "category": "Anaesthesia & Airway",
        "quantity": 10,
        "line_total_usd": Decimal("5.00"),
    },
    {
        "name": "Endotracheal Tube (Uncuffed)",
        "model_name": "Size 3.5",
        "sku": "HX-ETT-UNCUFF-3.5",
        "category": "Anaesthesia & Airway",
        "quantity": 10,
        "line_total_usd": Decimal("4.00"),
    },
    {
        "name": "Chest Drainage Bottle",
        "model_name": "1600 mL",
        "sku": "HX-CHEST-DRAIN-1600",
        "category": "Medical Consumables",
        "quantity": 10,
        "line_total_usd": Decimal("20.00"),
    },
]


class Command(BaseCommand):
    help = "Import the HUAXING supplier invoice into inventory (supplier, products, stock receiving)."

    def add_arguments(self, parser):
        parser.add_argument("--invoice-number", default=DEFAULT_INVOICE_NUMBER)
        parser.add_argument("--date-received", default=timezone.localdate().isoformat())
        parser.add_argument("--usd-rate", default=str(DEFAULT_USD_RATE))
        parser.add_argument("--additional-expenses-usd", default="0")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        invoice_number = str(options["invoice_number"]).strip()
        date_received = options["date_received"]
        usd_rate = Decimal(str(options["usd_rate"]))
        additional_expenses_usd = Decimal(str(options["additional_expenses_usd"]))
        dry_run = options["dry_run"]

        if StockReceiptBatch.objects.filter(invoice_number=invoice_number).exists():
            self.stdout.write(self.style.WARNING(f"Invoice {invoice_number} already imported. Skipping."))
            return

        total_qty = sum(line["quantity"] for line in INVOICE_LINES)
        goods_total_usd = sum(line["line_total_usd"] for line in INVOICE_LINES)
        if goods_total_usd != Decimal("884.00"):
            raise ValueError(f"Invoice line totals must equal USD 884.00 (got {goods_total_usd}).")
        if total_qty != 330:
            raise ValueError(f"Invoice quantity must equal 330 pieces (got {total_qty}).")

        additional_expenses_kes = (additional_expenses_usd * usd_rate).quantize(Decimal("0.01"))

        summary = []
        with transaction.atomic():
            supplier, supplier_created = Supplier.objects.get_or_create(
                name=SUPPLIER_NAME,
                defaults={
                    "contact_person": "",
                    "products_supplied": "Biopsy needles, Foley catheters, endotracheal tubes, chest drainage bottles",
                    "is_active": True,
                },
            )

            batch = None
            if not dry_run:
                batch = StockReceiptBatch.objects.create(
                    supplier=supplier,
                    invoice_number=invoice_number,
                    date_received=date_received,
                    additional_expenses=additional_expenses_kes,
                    notes=(
                        f"HUAXING invoice import. Goods total USD {goods_total_usd}. "
                        f"Grand total USD {goods_total_usd + additional_expenses_usd}. "
                        f"Exchange rate: 1 USD = {usd_rate} KSH."
                    ),
                )

            for line in INVOICE_LINES:
                category, _ = ProductCategory.objects.get_or_create(name=line["category"])
                unit_usd = (line["line_total_usd"] / Decimal(line["quantity"])).quantize(Decimal("0.0001"))
                unit_kes = (unit_usd * usd_rate).quantize(Decimal("0.01"))
                display_name = f"{line['name']} ({line['model_name']})"

                product, product_created = Product.objects.get_or_create(
                    sku=line["sku"],
                    defaults={
                        "name": line["name"],
                        "model_name": line["model_name"],
                        "category": category,
                        "supplier": supplier,
                        "brand": "HUAXING",
                        "unit": "pcs",
                        "purchase_price": unit_kes,
                        "selling_price": Decimal("0.00"),
                        "current_stock": 0,
                        "minimum_stock": 5,
                        "description": display_name,
                        "status": Product.Status.ACTIVE,
                    },
                )

                if not product_created:
                    product.name = line["name"]
                    product.model_name = line["model_name"]
                    product.category = category
                    product.supplier = supplier
                    product.brand = "HUAXING"
                    product.purchase_price = unit_kes
                    product.description = display_name
                    product.save(
                        update_fields=[
                            "name",
                            "model_name",
                            "category",
                            "supplier",
                            "brand",
                            "purchase_price",
                            "description",
                        ]
                    )

                if dry_run:
                    summary.append(
                        f"[DRY RUN] {line['sku']}: qty={line['quantity']}, "
                        f"unit USD {unit_usd}, unit KSH {unit_kes}"
                    )
                    continue

                StockReceipt.objects.create(
                    supplier=supplier,
                    invoice_number=invoice_number,
                    product=product,
                    quantity=line["quantity"],
                    purchase_price=unit_kes,
                    batch_number="",
                    date_received=date_received,
                    notes=f"Imported from HUAXING invoice. Line total USD {line['line_total_usd']}.",
                    receipt_batch=batch,
                )
                summary.append(
                    f"{line['sku']}: received {line['quantity']} @ KSH {unit_kes} "
                    f"(USD {unit_usd} per unit, line total USD {line['line_total_usd']})"
                )

            if dry_run:
                transaction.set_rollback(True)

        self.stdout.write(self.style.SUCCESS(f"Supplier: {SUPPLIER_NAME} ({'created' if supplier_created else 'existing'})"))
        self.stdout.write(self.style.SUCCESS(f"Invoice: {invoice_number}"))
        self.stdout.write(self.style.SUCCESS(f"Total quantity: {total_qty} pcs"))
        self.stdout.write(self.style.SUCCESS(f"Goods total: USD {goods_total_usd} | KSH {(goods_total_usd * usd_rate).quantize(Decimal('0.01'))}"))
        self.stdout.write(self.style.SUCCESS(f"Additional expenses: USD {additional_expenses_usd} | KSH {additional_expenses_kes}"))
        for row in summary:
            self.stdout.write(row)
        if dry_run:
            self.stdout.write(self.style.WARNING("Dry run complete. No data was saved."))
        else:
            self.stdout.write(self.style.SUCCESS("HUAXING invoice imported successfully."))
