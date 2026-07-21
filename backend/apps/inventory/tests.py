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

    def test_bulk_stock_receipt_creates_product_from_typed_name(self):
        payload = {
            "supplier": self.supplier.id,
            "invoice_number": "INV-NEW-NAME-1",
            "date_received": timezone.localdate().isoformat(),
            "items": [
                {
                    "product_name": "Ultrasound Gel 5L",
                    "quantity": 3,
                    "purchase_price": "450.00",
                    "batch_number": "GEL-1",
                }
            ],
        }
        response = self.client.post("/api/v1/inventory/stock-receipts/bulk-receive/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        created = Product.objects.get(name__iexact="Ultrasound Gel 5L")
        self.assertEqual(created.current_stock, 3)
        self.assertTrue(created.sku.startswith("RCV-"))
        self.assertTrue(StockReceipt.objects.filter(invoice_number="INV-NEW-NAME-1", product=created).exists())

    def test_bulk_stock_receipt_reuses_existing_product_by_name(self):
        payload = {
            "invoice_number": "INV-MATCH-NAME-1",
            "date_received": timezone.localdate().isoformat(),
            "items": [
                {
                    "product_name": "paracetamol",
                    "quantity": 2,
                    "purchase_price": "10.00",
                }
            ],
        }
        response = self.client.post("/api/v1/inventory/stock-receipts/bulk-receive/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.filter(name__iexact="Paracetamol").count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 7)

    def test_bulk_stock_receipt_merges_duplicate_product_lines(self):
        payload = {
            "invoice_number": "INV-MERGE-1",
            "date_received": timezone.localdate().isoformat(),
            "items": [
                {"product_name": "Face Towels", "quantity": 100, "purchase_price": "10.00"},
                {"product_name": "face towels", "quantity": 50, "purchase_price": "11.00"},
            ],
        }
        response = self.client.post("/api/v1/inventory/stock-receipts/bulk-receive/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(Product.objects.filter(name__iexact="Face Towels", is_archived=False).count(), 1)
        product = Product.objects.get(name__iexact="Face Towels", is_archived=False)
        self.assertEqual(product.current_stock, 150)
        self.assertEqual(StockReceipt.objects.filter(invoice_number="INV-MERGE-1").count(), 1)

    def test_stock_receipt_can_be_updated_and_deleted(self):
        create_payload = {
            "supplier": self.supplier.id,
            "invoice_number": "INV-EDIT-1",
            "product": self.product.id,
            "quantity": 5,
            "purchase_price": "10.00",
            "date_received": timezone.localdate().isoformat(),
        }
        created = self.client.post("/api/v1/inventory/stock-receipts/", create_payload, format="json")
        self.assertEqual(created.status_code, status.HTTP_201_CREATED)
        receipt_id = created.data["id"]
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 10)

        updated = self.client.patch(
            f"/api/v1/inventory/stock-receipts/{receipt_id}/",
            {"quantity": 8, "purchase_price": "12.00"},
            format="json",
        )
        self.assertEqual(updated.status_code, status.HTTP_200_OK)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 13)

        deleted = self.client.delete(f"/api/v1/inventory/stock-receipts/{receipt_id}/")
        self.assertEqual(deleted.status_code, status.HTTP_204_NO_CONTENT)
        self.product.refresh_from_db()
        self.assertEqual(self.product.current_stock, 5)

    def test_ensure_product_creates_and_lists_by_name(self):
        create_response = self.client.post(
            "/api/v1/inventory/products/ensure/",
            {"name": "Guidewire 0.035"},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(create_response.data["created"])
        product_id = create_response.data["id"]

        again = self.client.post(
            "/api/v1/inventory/products/ensure/",
            {"name": "guidewire 0.035"},
            format="json",
        )
        self.assertEqual(again.status_code, status.HTTP_200_OK)
        self.assertFalse(again.data["created"])
        self.assertEqual(again.data["id"], product_id)

        listed = self.client.get("/api/v1/inventory/products/", {"page_size": 500})
        self.assertEqual(listed.status_code, status.HTTP_200_OK)
        names = [item["name"] for item in listed.data["results"]]
        self.assertIn("Guidewire 0.035", names)
