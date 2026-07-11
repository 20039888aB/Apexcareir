from decimal import Decimal
import io
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate

from apps.inventory.models import Product, ProductCategory
from apps.sales.models import Invoice, InvoiceLineItem, Sale
from apps.sales.services.invoice_pdf import (
    COLUMN_WIDTH_FRACTIONS,
    TABLE_FONT_SIZE_COMPACT,
    TABLE_FONT_SIZE_DEFAULT,
    _build_invoice_line_items_table,
    _choose_table_font_size,
    _column_widths,
    _normalize_column_fractions,
    _sku_display_value,
    build_invoice_pdf_bytes,
)
from apps.suppliers.models import Supplier

User = get_user_model()


class InvoicePdfLayoutTests(SimpleTestCase):
    def test_column_widths_use_full_available_width(self):
        table_width = 500.0
        widths = _column_widths(table_width)
        self.assertAlmostEqual(sum(widths), table_width, places=2)
        product_fraction = COLUMN_WIDTH_FRACTIONS[1] / sum(COLUMN_WIDTH_FRACTIONS)
        self.assertAlmostEqual(widths[1] / table_width, product_fraction, places=2)

    def test_column_fractions_normalize_to_one(self):
        normalized = _normalize_column_fractions(COLUMN_WIDTH_FRACTIONS)
        self.assertAlmostEqual(sum(normalized), 1.0, places=6)

    def test_sku_truncates_when_extremely_long(self):
        long_sku = "SUPER-LONG-SKU-CODE-WITHOUT-SPACES-1234567890"
        truncated = _sku_display_value(long_sku, compact=False)
        self.assertTrue(truncated.endswith("..."))
        self.assertLessEqual(len(truncated), 36)

    def test_compact_font_selected_for_long_product_names(self):
        rows = [
            {
                "product": "A" * 60,
                "sku": "SHORT",
            }
        ]
        self.assertEqual(_choose_table_font_size(rows), TABLE_FONT_SIZE_COMPACT)

    def test_default_font_selected_for_short_rows(self):
        rows = [{"product": "Gloves", "sku": "CAT-GLOVES-001"}]
        self.assertEqual(_choose_table_font_size(rows), TABLE_FONT_SIZE_DEFAULT)


class InvoicePdfIntegrationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_superuser(email="pdf-layout@example.com", password="StrongPass123!")
        category = ProductCategory.objects.create(name="Consumables")
        supplier = Supplier.objects.create(name="PDF Supplier")
        self.products = [
            Product.objects.create(
                name="Permanent Hemodialysis Catheter with Extended Clinical Description for PDF Wrapping",
                sku="APEX-HDC-PERM-001-EXTRA-LONG-SKU-CODE",
                category=category,
                supplier=supplier,
                purchase_price=10000,
                selling_price=17000,
                current_stock=10,
            ),
            Product.objects.create(
                name="Drainage Catheter Set (with Wire & Chiba Needle)",
                sku="APEX-DRAIN-SET-001",
                category=category,
                supplier=supplier,
                purchase_price=7000,
                selling_price=11200,
                current_stock=10,
            ),
        ]

    def _build_invoice_with_lines(self):
        sale = Sale.objects.create(
            sale_number="SAL-PDF-TEST",
            invoice_number="INV-PDF-TEST",
            customer="Optimal Family Hospital",
            product=self.products[0],
            quantity=1,
            price=Decimal("17000"),
            discount=Decimal("0"),
            tax=Decimal("0"),
            cost_price=Decimal("10000"),
            date=timezone.localdate(),
            salesperson=self.user,
            created_by=self.user,
            updated_by=self.user,
        )
        invoice = Invoice.objects.create(
            invoice_number="INV-PDF-TEST",
            sale=sale,
            customer_name="Optimal Family Hospital",
            customer_company="Optimal Family Hospital",
            status=Invoice.Status.ISSUED,
            payment_status=Invoice.PaymentStatus.UNPAID,
            subtotal=Decimal("72600"),
            discount=Decimal("0"),
            tax=Decimal("0"),
            grand_total=Decimal("72600"),
            generated_by=self.user,
            invoice_date=timezone.localdate(),
        )
        for index, product in enumerate(self.products):
            item = InvoiceLineItem(
                invoice=invoice,
                product=product,
                description=product.name,
                quantity=index + 1,
                unit_price=product.selling_price,
                cost_price=product.purchase_price,
                discount=Decimal("0"),
                tax=Decimal("0"),
                sort_order=index,
            )
            item.compute_line_total()
            item.save()
        return invoice, sale

    def test_build_invoice_pdf_bytes_with_long_line_items(self):
        invoice, sale = self._build_invoice_with_lines()
        pdf_bytes = build_invoice_pdf_bytes(invoice=invoice, sale=sale)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 1000)

    def test_line_items_table_uses_paragraph_cells(self):
        invoice, sale = self._build_invoice_with_lines()
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=42, rightMargin=42, topMargin=42, bottomMargin=42)
        table = _build_invoice_line_items_table(doc=doc, invoice=invoice, sale=sale)
        self.assertEqual(len(table._cellvalues), 3)
        self.assertEqual(len(table._colWidths), 7)
        self.assertAlmostEqual(sum(table._colWidths), doc.width, places=1)

        from reportlab.platypus import Paragraph

        product_cell = table._cellvalues[1][1]
        self.assertIsInstance(product_cell, Paragraph)

    @patch("apps.sales.services.invoice_pdf.save_invoice_pdf")
    def test_regenerated_pdf_for_existing_invoice(self, _mock_save):
        invoice, sale = self._build_invoice_with_lines()
        pdf_bytes = build_invoice_pdf_bytes(invoice=invoice, sale=sale)
        self.assertTrue(pdf_bytes.startswith(b"%PDF"))
        self.assertGreater(len(pdf_bytes), 1000)
