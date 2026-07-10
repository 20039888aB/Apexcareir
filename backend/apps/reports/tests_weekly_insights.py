from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.finance.models import Expense
from apps.inventory.models import Product, ProductCategory
from apps.reports.services.detailed_email_report import build_detailed_period_report_html
from apps.reports.services.weekly_insights import build_period_insights
from apps.sales.models import Sale
from apps.suppliers.models import Supplier

User = get_user_model()


class WeeklyInsightsTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)
        self.today = timezone.localdate()
        self.category = ProductCategory.objects.create(name="Insights Category")
        self.supplier = Supplier.objects.create(name="Insights Supplier")
        self.fast_product = Product.objects.create(
            name="Fast Seller",
            sku="FAST-1",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal("50.00"),
            selling_price=Decimal("120.00"),
            current_stock=20,
            minimum_stock=5,
        )
        self.slow_product = Product.objects.create(
            name="Slow Seller",
            sku="SLOW-1",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal("20.00"),
            selling_price=Decimal("30.00"),
            current_stock=40,
            minimum_stock=5,
        )
        self.unsold_product = Product.objects.create(
            name="Unsold Item",
            sku="NONE-1",
            category=self.category,
            supplier=self.supplier,
            purchase_price=Decimal("10.00"),
            selling_price=Decimal("25.00"),
            current_stock=15,
            minimum_stock=3,
        )
        Sale.objects.create(
            invoice_number="INV-W-1",
            customer="Weekly Client",
            product=self.fast_product,
            quantity=8,
            price=Decimal("120.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("50.00"),
            date=self.today,
            salesperson=self.user,
        )
        Sale.objects.create(
            invoice_number="INV-W-2",
            customer="Weekly Client",
            product=self.slow_product,
            quantity=1,
            price=Decimal("30.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("20.00"),
            date=self.today,
            salesperson=self.user,
        )
        Expense.objects.create(
            category="Website hosting",
            expense_type=Expense.ExpenseType.WEBSITE_HOSTING,
            business_area=Expense.BusinessArea.WEBSITE,
            amount=Decimal("100.00"),
            payment_method=Expense.PaymentMethod.BANK,
            date=self.today,
        )

    def test_period_insights_include_margin_and_recommendations(self):
        insights = build_period_insights(start_date=self.today, end_date=self.today)
        self.assertEqual(insights["snapshot"]["units_sold"], 9)
        self.assertGreater(insights["snapshot"]["revenue"], 0)
        self.assertEqual(insights["top_sellers"][0]["sku"], "FAST-1")
        self.assertTrue(any(item["sku"] == "NONE-1" for item in insights["unsold_products"]))
        self.assertTrue(len(insights["recommendations"]) > 0)

    def test_weekly_report_html_contains_insight_sections(self):
        html = build_detailed_period_report_html(period_label="Weekly", start_date=self.today, end_date=self.today)
        self.assertIn("Weekly Performance Snapshot", html)
        self.assertIn("What To Do Next", html)
        self.assertIn("Stock Sold vs Remaining", html)
        self.assertIn("Top Sellers / Overselling Items", html)
        self.assertIn("Highest Profit Margin Products", html)
        self.assertIn("Lowest Profit Margin Products", html)