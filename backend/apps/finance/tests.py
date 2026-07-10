from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.finance.models import Expense, Payroll
from apps.inventory.models import Product, ProductCategory
from apps.sales.models import Sale
from apps.suppliers.models import Supplier

User = get_user_model()


class FinanceAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

    def test_payroll_net_salary_is_computed(self):
        payload = {
            "employee": "Jane Doe",
            "salary": "50000.00",
            "allowances": "5000.00",
            "deductions": "2000.00",
            "payment_date": timezone.localdate().isoformat(),
            "notes": "Monthly payroll",
        }
        response = self.client.post("/api/v1/finance/payroll/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Decimal(str(response.data["net_salary"])), Decimal("53000.00"))

    def test_finance_summary_aggregates_revenue_expenses_and_payroll(self):
        today = timezone.localdate()
        category = ProductCategory.objects.create(name="Finance Category")
        supplier = Supplier.objects.create(name="Finance Supplier")
        product = Product.objects.create(
            name="Gloves",
            sku="GL-100",
            category=category,
            supplier=supplier,
            purchase_price=20,
            selling_price=40,
            current_stock=200,
            minimum_stock=10,
        )
        Sale.objects.create(
            invoice_number="INV-F-1",
            customer="Finance Client",
            product=product,
            quantity=10,
            price=Decimal("40.00"),
            discount=Decimal("0.00"),
            tax=Decimal("0.00"),
            cost_price=Decimal("20.00"),
            date=today,
            salesperson=self.user,
        )
        Expense.objects.create(
            category="Utilities",
            amount=Decimal("100.00"),
            payment_method=Expense.PaymentMethod.CASH,
            date=today,
        )
        Payroll.objects.create(
            employee="John Worker",
            salary=Decimal("1000.00"),
            allowances=Decimal("100.00"),
            deductions=Decimal("50.00"),
            payment_date=today,
        )

        response = self.client.get("/api/v1/finance/summary/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        summary = response.data["summary"]
        self.assertEqual(Decimal(str(summary["monthly_revenue"])), Decimal("400.00"))
        self.assertEqual(Decimal(str(summary["monthly_expenses"])), Decimal("100.00"))
        self.assertEqual(Decimal(str(summary["monthly_payroll"])), Decimal("1050.00"))
        self.assertEqual(Decimal(str(summary["net_cashflow"])), Decimal("-750.00"))

    def test_expense_create_accepts_expense_type_and_business_area(self):
        payload = {
            "category": "Website hosting renewal",
            "expense_type": Expense.ExpenseType.WEBSITE_HOSTING,
            "business_area": Expense.BusinessArea.WEBSITE,
            "amount": "4500.00",
            "description": "Annual domain and hosting",
            "payment_method": Expense.PaymentMethod.BANK,
            "date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/finance/expenses/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["expense_type"], Expense.ExpenseType.WEBSITE_HOSTING)
        self.assertEqual(response.data["business_area"], Expense.BusinessArea.WEBSITE)
