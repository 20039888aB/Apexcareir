from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.inventory.models import Product, ProductCategory
from apps.suppliers.models import Supplier

User = get_user_model()


class SalesAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

        category = ProductCategory.objects.create(name="Consumables")
        supplier = Supplier.objects.create(name="Sales Supplier")
        self.product = Product.objects.create(
            name="Syringe",
            sku="SYR-01",
            category=category,
            supplier=supplier,
            purchase_price=100,
            selling_price=150,
            current_stock=20,
            minimum_stock=5,
            status=Product.Status.ACTIVE,
        )

    def test_sale_creation_calculates_totals_and_reduces_stock(self):
        payload = {
            "invoice_number": "INV-S-1",
            "customer": "Walk-in Customer",
            "product": self.product.id,
            "quantity": 3,
            "price": "150.00",
            "discount": "10.00",
            "tax": "5.00",
            "cost_price": "100.00",
            "date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/sales/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 17)
        self.assertEqual(Decimal(str(response.data["total"])), Decimal("445.00"))
        self.assertEqual(Decimal(str(response.data["profit"])), Decimal("145.00"))

    def test_sale_creation_fails_on_insufficient_stock(self):
        payload = {
            "invoice_number": "INV-S-2",
            "customer": "Test Customer",
            "product": self.product.id,
            "quantity": 999,
            "price": "150.00",
            "discount": "0.00",
            "tax": "0.00",
            "cost_price": "100.00",
            "date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/sales/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
