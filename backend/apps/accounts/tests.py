from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.audit_logs.models import AuditLog

User = get_user_model()


class AccountsAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="staff@example.com",
            password="StrongPass123!",
            first_name="Staff",
            role=User.Role.STAFF,
            permissions=["dashboard.dashboard"],
        )

    def test_login_returns_tokens_and_creates_audit_log(self):
        response = self.client.post(
            "/api/v1/auth/login/",
            {"email": "staff@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertTrue(
            AuditLog.objects.filter(
                module="accounts",
                action="login",
                target_model="accounts.user",
                target_id=str(self.user.id),
            ).exists()
        )

    def test_me_requires_authentication(self):
        response = self.client.get("/api/v1/auth/me/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_permission_matrix_contains_new_permissions(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get("/api/v1/auth/permission-matrix/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        all_codes = {
            permission["code"]
            for group in response.data["groups"].values()
            for permission in group
        }
        self.assertIn("notifications.notifications", all_codes)
        self.assertIn("audit_logs.audit_logs", all_codes)
