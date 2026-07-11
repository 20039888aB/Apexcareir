from unittest.mock import patch

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.common.services.company_branding import get_company_branding, invoice_contact_lines
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
        self.assertTrue(response.data["sale_number"].startswith("SAL-"))
        self.assertTrue(response.data["invoice_number"].startswith("INV-"))
        self.assertIsNotNone(response.data["invoice_id"])

    def test_sale_creation_with_new_product_name_auto_saves_product(self):
        payload = {
            "customer": "Hospital Buyer",
            "new_product_name": "Portable Oxygen Mask",
            "quantity": 4,
            "price": "2500.00",
            "discount": "0.00",
            "tax": "0.00",
            "cost_price": "1800.00",
            "date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/sales/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["product_name"], "Portable Oxygen Mask")

        created_product = Product.objects.get(name="Portable Oxygen Mask")
        self.assertEqual(created_product.current_stock, 0)
        self.assertEqual(Decimal(str(created_product.selling_price)), Decimal("2500.00"))

        repeat_response = self.client.post(
            "/api/v1/sales/",
            {
                **payload,
                "customer": "Repeat Buyer",
                "quantity": 2,
            },
            format="json",
        )
        self.assertEqual(repeat_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Product.objects.filter(name="Portable Oxygen Mask").count(), 1)

    def test_sale_creation_auto_generates_invoice_pdf_record(self):
        payload = {
            "customer": "Invoice Customer",
            "customer_email": "invoice.customer@example.com",
            "product": self.product.id,
            "quantity": 1,
            "price": "150.00",
            "discount": "0.00",
            "tax": "0.00",
            "cost_price": "100.00",
            "date": timezone.localdate().isoformat(),
        }
        response = self.client.post("/api/v1/sales/", payload, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        invoice_id = response.data["invoice_id"]
        pdf_response = self.client.get(f"/api/v1/invoices/{invoice_id}/pdf/")
        self.assertEqual(pdf_response.status_code, status.HTTP_200_OK)
        self.assertEqual(pdf_response["Content-Type"], "application/pdf")

    def test_manual_invoice_create_and_update(self):
        payload = {
            "customer_name": "Hospital Buyer",
            "customer_email": "buyer@hospital.test",
            "customer_phone": "0700000000",
            "product": self.product.id,
            "quantity": 2,
            "unit_price": "150.00",
            "cost_price": "100.00",
            "discount": "0.00",
            "tax": "0.00",
            "invoice_date": timezone.localdate().isoformat(),
            "status": "draft",
        }
        create_response = self.client.post("/api/v1/invoices/", payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        invoice_id = create_response.data["id"]
        self.assertTrue(create_response.data["invoice_number"].startswith("INV-"))

        update_response = self.client.patch(
            f"/api/v1/invoices/{invoice_id}/",
            {"customer_name": "Updated Hospital Buyer", "discount": "10.00"},
            format="json",
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data["customer_name"], "Updated Hospital Buyer")
        self.assertEqual(Decimal(str(update_response.data["discount"])), Decimal("10.00"))

    def test_invoice_pdf_view_logs_activity(self):
        payload = {
            "customer_name": "PDF Viewer",
            "product": self.product.id,
            "quantity": 1,
            "unit_price": "150.00",
            "cost_price": "100.00",
            "invoice_date": timezone.localdate().isoformat(),
        }
        create_response = self.client.post("/api/v1/invoices/", payload, format="json")
        invoice_id = create_response.data["id"]
        pdf_response = self.client.get(f"/api/v1/invoices/{invoice_id}/pdf/")
        self.assertEqual(pdf_response.status_code, status.HTTP_200_OK)

        timeline_response = self.client.get(
            "/api/v1/timeline/",
            {"reference_number": create_response.data["invoice_number"], "module": "invoices"},
        )
        self.assertEqual(timeline_response.status_code, status.HTTP_200_OK)
        event_types = [item["event_type"] for item in timeline_response.data["results"]]
        self.assertIn("viewed", event_types)

    def test_sale_creation_fails_on_insufficient_stock(self):
        payload = {
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

    @patch("django.core.mail.EmailMultiAlternatives.send")
    def test_invoice_email_accepts_custom_recipient(self, mock_send):
        payload = {
            "customer_name": "Email Recipient Test",
            "customer_email": "buyer@hospital.test",
            "product": self.product.id,
            "quantity": 1,
            "unit_price": "150.00",
            "cost_price": "100.00",
            "invoice_date": timezone.localdate().isoformat(),
        }
        create_response = self.client.post("/api/v1/invoices/", payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        invoice_id = create_response.data["id"]

        email_response = self.client.post(
            f"/api/v1/invoices/{invoice_id}/email/",
            {"email": "finance@external.test, accounts@external.test"},
            format="json",
        )
        self.assertEqual(email_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            email_response.data["recipients"],
            ["finance@external.test", "accounts@external.test"],
        )
        mock_send.assert_called_once()

        timeline_response = self.client.get(
            "/api/v1/timeline/",
            {"reference_number": create_response.data["invoice_number"], "module": "invoices"},
        )
        self.assertEqual(timeline_response.status_code, status.HTTP_200_OK)
        descriptions = [item["description"] for item in timeline_response.data["results"]]
        self.assertTrue(any("finance@external.test" in description for description in descriptions))

    def test_invoice_branding_includes_default_contact_details(self):
        branding = get_company_branding()
        self.assertEqual(branding["phone"], "0745902757")
        self.assertEqual(branding["support_email"], "apexcareir@gmail.com")
        self.assertEqual(
            invoice_contact_lines(branding),
            ["Phone: 0745902757", "Email: apexcareir@gmail.com"],
        )
        self.assertTrue(branding["logo_path"])

    def test_sale_reuses_existing_buyer_by_email(self):
        first_payload = {
            "customer": "Hospital Alpha",
            "customer_email": "buyer@hospital.test",
            "customer_phone": "0711111111",
            "customer_company": "Alpha Health",
            "product": self.product.id,
            "quantity": 1,
            "price": "150.00",
            "discount": "0.00",
            "tax": "0.00",
            "cost_price": "100.00",
            "date": timezone.localdate().isoformat(),
        }
        first_response = self.client.post("/api/v1/sales/", first_payload, format="json")
        self.assertEqual(first_response.status_code, status.HTTP_201_CREATED)

        second_payload = {
            **first_payload,
            "customer": "Alpha Hospital",
            "customer_phone": "0722222222",
        }
        second_response = self.client.post("/api/v1/sales/", second_payload, format="json")
        self.assertEqual(second_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(second_response.data["customer_record"], first_response.data["customer_record"])

    @patch("django.core.mail.EmailMultiAlternatives.send")
    def test_record_invoice_payment_updates_status(self, mock_send):
        payload = {
            "customer_name": "Payment Customer",
            "customer_email": "payments@customer.test",
            "product": self.product.id,
            "quantity": 1,
            "unit_price": "200.00",
            "cost_price": "100.00",
            "invoice_date": timezone.localdate().isoformat(),
        }
        create_response = self.client.post("/api/v1/invoices/", payload, format="json")
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        invoice_id = create_response.data["id"]

        payment_response = self.client.post(
            f"/api/v1/invoices/{invoice_id}/payments/",
            {"amount": "100.00", "payment_method": "mpesa", "reference": "ABC123"},
            format="json",
        )
        self.assertEqual(payment_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(payment_response.data["invoice"]["payment_status"], "partially_paid")
        self.assertEqual(Decimal(str(payment_response.data["invoice"]["amount_paid"])), Decimal("100.00"))
