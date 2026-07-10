from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.inventory.models import Product, ProductCategory, StockReceipt
from apps.suppliers.models import Supplier

User = get_user_model()


class InventoryAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

        self.category = ProductCategory.objects.create(name="Medicines")
        self.supplier = Supplier.objects.create(name="Apex Supplier")
        self.product = Product.objects.create(
            name="Paracetamol",
            sku="P-100",
            category=self.category,
            supplier=self.supplier,
            purchase_price=10,
            selling_price=15,
            current_stock=5,
            minimum_stock=10,
            status=Product.Status.ACTIVE,
        )

    def test_low_stock_endpoint_returns_flagged_products(self):
        response = self.client.get("/api/v1/inventory/products/low-stock/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["sku"], "P-100")

    def test_stock_receipt_increases_product_stock(self):
        payload = {
            "supplier": self.supplier.id,
            "invoice_number": "INV-REC-1",
            "product": self.product.id,
            "quantity": 7,
            "purchase_price": "11.50",
            "batch_number": "B001",
            "date_received": timezone.localdate().isoformat(),
            "notes": "Initial receiving test",
        }
        response = self.client.post("/api/v1/inventory/stock-receipts/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 12)
        self.assertTrue(StockReceipt.objects.filter(invoice_number="INV-REC-1").exists())

    def test_bulk_stock_receipt_stores_additional_expenses(self):
        payload = {
            "supplier": self.supplier.id,
            "invoice_number": "INV-BULK-1",
            "date_received": timezone.localdate().isoformat(),
            "additional_expenses": "125.50",
            "notes": "Shipment with clearing fees",
            "items": [
                {
                    "product": self.product.id,
                    "quantity": 4,
                    "purchase_price": "12.00",
                    "batch_number": "LOT-9",
                }
            ],
        }
        response = self.client.post("/api/v1/inventory/stock-receipts/bulk-receive/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        receipt = StockReceipt.objects.select_related("receipt_batch").get(invoice_number="INV-BULK-1")
        self.assertEqual(str(receipt.purchase_price), "12.00")
        self.assertIsNotNone(receipt.receipt_batch)
        self.assertEqual(str(receipt.receipt_batch.additional_expenses), "125.50")
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 9)
