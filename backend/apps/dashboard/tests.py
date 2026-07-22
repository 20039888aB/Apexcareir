from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.inventory.models import Product, ProductCategory
from apps.sales.models import Sale
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

    def test_dashboard_monthly_revenue_respects_backdated_month(self):
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
        Sale.objects.create(
            invoice_number="INV-DASH-PREV",
            customer="Past Client",
            product=product,
            quantity=4,
            price=Decimal("25.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("10.00"),
            date=previous_month,
            salesperson=user,
        )
        Sale.objects.create(
            invoice_number="INV-DASH-CUR",
            customer="Current Client",
            product=product,
            quantity=2,
            price=Decimal("25.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("10.00"),
            date=today,
            salesperson=user,
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
