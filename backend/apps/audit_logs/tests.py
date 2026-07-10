from django.contrib.auth import get_user_model
from django.test.client import RequestFactory
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .services import log_audit_event

User = get_user_model()


class AuditLogsAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.factory = RequestFactory()

    def test_audit_logs_endpoint_requires_permission(self):
        user = User.objects.create_user(
            email="staff@example.com",
            password="StrongPass123!",
            role=User.Role.STAFF,
            permissions=[],
        )
        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/audit-logs/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_audit_logs_endpoint_returns_records(self):
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="StrongPass123!",
        )
        request = self.factory.get("/")
        request.user = user
        log_audit_event(
            request=request,
            action="test_action",
            module="audit_logs",
            description="Audit log test entry",
            target=user,
        )

        self.client.force_authenticate(user=user)
        response = self.client.get("/api/v1/audit-logs/?module=audit_logs")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["count"], 1)
