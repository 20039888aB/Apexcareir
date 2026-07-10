from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

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
