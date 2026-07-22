from datetime import datetime, time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.inventory.models import Product, ProductCategory
from apps.sales.models import Invoice, InvoiceLineItem, Sale
from apps.suppliers.models import Supplier

User = get_user_model()


class DashboardAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()

    def test_dashboard_requires_permission(self):
        user = User.objects.create_user(
            email="no-dashboard@example.com",
            password="StrongPass123!",
            role=User.Role.STAFF,
            permissions=[],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/dashboard/overview/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_dashboard_overview_returns_expected_sections(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/dashboard/overview/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("cards", response.data)
        self.assertIn("charts", response.data)
        self.assertIn("insights", response.data)
        self.assertIn("period", response.data)
        self.assertTrue(response.data["period"]["is_current_month"])
        self.assertTrue(response.data["period"]["is_current_day"])

    def _aware_day(self, day):
        return timezone.make_aware(datetime.combine(day, time.min))

    def _create_paid_invoice(self, *, user, product, customer, invoice_number, quantity, unit_price, cost_price, day):
        sale = Sale.objects.create(
            invoice_number=invoice_number,
            customer=customer,
            product=product,
            quantity=quantity,
            price=unit_price,
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=cost_price,
            date=day,
            salesperson=user,
        )
        line_total = Decimal(quantity) * unit_price
        invoice = Invoice.objects.create(
            invoice_number=invoice_number,
            sale=sale,
            customer_name=customer,
            status=Invoice.Status.PAID,
            payment_status=Invoice.PaymentStatus.PAID,
            subtotal=line_total,
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            grand_total=line_total,
            amount_paid=line_total,
            invoice_date=day,
            paid_at=self._aware_day(day),
            generated_by=user,
        )
        InvoiceLineItem.objects.create(
            invoice=invoice,
            product=product,
            quantity=quantity,
            unit_price=unit_price,
            cost_price=cost_price,
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            line_total=line_total,
        )
        return invoice

    def test_dashboard_only_counts_paid_invoices_as_recorded_sales(self):
        user = User.objects.create_superuser(
            email="dashboard-admin@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=user)

        today = timezone.localdate()
        previous_month_end = today.replace(day=1) - timedelta(days=1)
        previous_month = previous_month_end.replace(day=15)
        previous_month_key = previous_month.strftime("%Y-%m")

        category = ProductCategory.objects.create(name="Dashboard Cat")
        supplier = Supplier.objects.create(name="Dashboard Supplier")
        product = Product.objects.create(
            name="Dashboard Product",
            sku="DASH-100",
            category=category,
            supplier=supplier,
            purchase_price=10,
            selling_price=25,
            current_stock=100,
            minimum_stock=5,
        )

        unpaid_sale = Sale.objects.create(
            invoice_number="INV-DASH-UNPAID",
            customer="Unpaid Client",
            product=product,
            quantity=10,
            price=Decimal("25.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("10.00"),
            date=today,
            salesperson=user,
        )
        Invoice.objects.create(
            invoice_number="INV-DASH-UNPAID",
            sale=unpaid_sale,
            customer_name="Unpaid Client",
            status=Invoice.Status.ISSUED,
            payment_status=Invoice.PaymentStatus.UNPAID,
            subtotal=Decimal("250.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            grand_total=Decimal("250.00"),
            invoice_date=today,
            generated_by=user,
        )

        self._create_paid_invoice(
            user=user,
            product=product,
            customer="Past Client",
            invoice_number="INV-DASH-PREV",
            quantity=4,
            unit_price=Decimal("25.00"),
            cost_price=Decimal("10.00"),
            day=previous_month,
        )
        self._create_paid_invoice(
            user=user,
            product=product,
            customer="Current Client",
            invoice_number="INV-DASH-CUR",
            quantity=2,
            unit_price=Decimal("25.00"),
            cost_price=Decimal("10.00"),
            day=today,
        )

        current_response = self.client.get("/api/v1/dashboard/overview/")
        self.assertEqual(current_response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(current_response.data["cards"]["monthly_sales"]), 50.0)
        self.assertEqual(float(current_response.data["cards"]["today_sales"]), 50.0)
        self.assertEqual(float(current_response.data["cards"]["today_profit"]), 30.0)

        month_response = self.client.get("/api/v1/dashboard/overview/", {"month": previous_month_key})
        self.assertEqual(month_response.status_code, status.HTTP_200_OK)
        self.assertFalse(month_response.data["period"]["is_current_month"])
        self.assertEqual(float(month_response.data["cards"]["monthly_sales"]), 100.0)

        date_response = self.client.get(
            "/api/v1/dashboard/overview/",
            {"date": previous_month.isoformat()},
        )
        self.assertEqual(date_response.status_code, status.HTTP_200_OK)
        self.assertEqual(float(date_response.data["cards"]["monthly_sales"]), 100.0)
        self.assertEqual(date_response.data["period"]["as_of"], previous_month.isoformat())
