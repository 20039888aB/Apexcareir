from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.inventory.models import Product, ProductCategory
from apps.notifications.models import Notification
from apps.suppliers.models import Supplier

User = get_user_model()


class NotificationsAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

        category = ProductCategory.objects.create(name="Notifications Category")
        supplier = Supplier.objects.create(name="Notifications Supplier")
        Product.objects.create(
            name="Bandage",
            sku="BAND-1",
            category=category,
            supplier=supplier,
            current_stock=1,
            minimum_stock=5,
            purchase_price=10,
            selling_price=15,
            status=Product.Status.ACTIVE,
        )

    def test_notifications_list_returns_generated_alerts(self):
        response = self.client.get("/api/v1/notifications/?status=active")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["unread_count"], 1)
        self.assertGreaterEqual(len(response.data["results"]), 1)

    def test_mark_notification_read(self):
        list_response = self.client.get("/api/v1/notifications/?status=active")
        notification_id = list_response.data["results"][0]["id"]
        response = self.client.post(f"/api/v1/notifications/{notification_id}/mark-read/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(Notification.objects.get(id=notification_id).is_read)
