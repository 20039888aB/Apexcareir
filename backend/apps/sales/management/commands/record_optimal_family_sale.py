from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.common.services.numbering import allocate_document_number
from apps.inventory.models import Product, ProductCategory
from apps.sales.models import Invoice
from apps.sales.services.invoice_service import create_manual_invoice

SALE_DATE = date(2026, 7, 11)
CUSTOMER_NAME = "Optimal Family Hospital"

LINE_ITEMS = [
    {
        "name": "Permanent Hemodialysis Catheter",
        "sku": "APEX-HDC-PERM-001",
        "category": "Interventional Radiology",
        "quantity": 1,
        "unit_price": Decimal("17000"),
        "existing_skus": ["CAT-HAEMODIALYSISC-001", "HX-HDC-PERM"],
    },
    {
        "name": "Drainage Catheter Set (with Wire & Chiba Needle)",
        "sku": "APEX-DRAIN-SET-001",
        "category": "Interventional Radiology",
        "quantity": 5,
        "unit_price": Decimal("11200"),
        "existing_skus": ["CAT-DRAINAGECATHET-001"],
    },
    {
        "name": "Biopsy Gun with Coaxial",
        "sku": "APEX-BIOPSY-GUN-16G",
        "category": "Interventional Radiology",
        "quantity": 15,
        "unit_price": Decimal("2300"),
        "existing_skus": ["HX-BIO-16G-200", "CAT-BIOPSYNEEDLE-001"],
    },
    {
        "name": "16G Needle",
        "sku": "APEX-NEEDLE-16G-001",
        "category": "Consumables",
        "quantity": 5,
        "unit_price": Decimal("1700"),
        "existing_skus": ["CAT-NEEDLES-001"],
    },
    {
        "name": "Sterile Gloves (Box)",
        "sku": "APEX-GLOVES-STERILE-001",
        "category": "Consumables",
        "quantity": 60,
        "unit_price": Decimal("2900"),
        "existing_skus": ["CAT-GLOVES-001"],
    },
    {
        "name": "Ultrasound Thermal Paper",
        "sku": "APEX-US-THERMAL-001",
        "category": "Imaging Equipment",
        "quantity": 100,
        "unit_price": Decimal("1450"),
        "existing_skus": [],
    },
]


class Command(BaseCommand):
    help = "Record Optimal Family Hospital sales for 11 July 2026 and issue a detailed multi-line invoice."

    def handle(self, *args, **options):
        user = get_user_model().objects.filter(is_superuser=True).order_by("id").first()
        if not user:
            raise SystemExit("No superuser found.")

        with transaction.atomic():
            resolved_lines = []
            for entry in LINE_ITEMS:
                product = self._resolve_product(entry)
                self._ensure_stock(product, entry["quantity"])
                resolved_lines.append(
                    {
                        "product": product,
                        "quantity": entry["quantity"],
                        "unit_price": entry["unit_price"],
                        "cost_price": (entry["unit_price"] * Decimal("0.65")).quantize(Decimal("0.01")),
                        "description": entry["name"],
                    }
                )

            invoice = create_manual_invoice(
                user=user,
                customer_name=CUSTOMER_NAME,
                customer_company=CUSTOMER_NAME,
                lines=resolved_lines,
                invoice_date=SALE_DATE,
                status=Invoice.Status.ISSUED,
                payment_status=Invoice.PaymentStatus.UNPAID,
                notes=(
                    "Sales – 11 July 2026\n"
                    "Delivered medical supplies to Optimal Family Hospital.\n"
                    "Line items: hemodialysis catheter, drainage catheter sets, biopsy guns, "
                    "16G needles, sterile gloves, and ultrasound thermal paper.\n"
                    f"Grand Total: KES {sum(line['quantity'] * line['unit_price'] for line in resolved_lines):,.2f}"
                ),
            )

        self.stdout.write(self.style.SUCCESS(f"Invoice created: {invoice.invoice_number}"))
        self.stdout.write(f"Customer: {invoice.customer_name}")
        self.stdout.write(f"Invoice date: {invoice.invoice_date}")
        self.stdout.write(f"Line items: {invoice.line_items.count()}")
        self.stdout.write(f"Grand total: KES {invoice.grand_total:,.2f}")
        self.stdout.write(f"Sale reference: {invoice.sale.sale_number}")

    def _resolve_product(self, entry):
        product = Product.objects.filter(sku=entry["sku"]).first()
        if product:
            product.name = entry["name"]
            product.selling_price = entry["unit_price"]
            product.save(update_fields=["name", "selling_price", "updated_at"])
            return product

        for sku in entry["existing_skus"]:
            product = Product.objects.filter(sku=sku).first()
            if product:
                product.name = entry["name"]
                product.selling_price = entry["unit_price"]
                product.save(update_fields=["name", "selling_price", "updated_at"])
                return product

        category, _ = ProductCategory.objects.get_or_create(name=entry["category"])
        return Product.objects.create(
            name=entry["name"],
            sku=entry["sku"],
            product_number=allocate_document_number("product"),
            category=category,
            selling_price=entry["unit_price"],
            purchase_price=(entry["unit_price"] * Decimal("0.65")).quantize(Decimal("0.01")),
            current_stock=entry["quantity"],
            minimum_stock=0,
            status=Product.Status.ACTIVE,
        )

    def _ensure_stock(self, product, quantity):
        product.refresh_from_db(fields=["current_stock"])
        if product.current_stock < quantity:
            product.current_stock = quantity
            product.save(update_fields=["current_stock", "updated_at"])
