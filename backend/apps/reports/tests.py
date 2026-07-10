from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

User = get_user_model()


class ReportsAPITests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(email="admin@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=self.user)

    def test_sales_report_json_response(self):
        today = timezone.localdate().isoformat()
        response = self.client.get(f"/api/v1/reports/sales/?start_date={today}&end_date={today}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("summary", response.data)
        self.assertIn("columns", response.data)
        self.assertIn("results", response.data)

    def test_sales_report_csv_export(self):
        response = self.client.get("/api/v1/reports/sales/?export=csv")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("text/csv", response["Content-Type"])

    def test_detailed_period_report_html_contains_sections(self):
        from apps.reports.services.detailed_email_report import build_detailed_period_report_html

        today = timezone.localdate()
        html = build_detailed_period_report_html(period_label="Weekly", start_date=today, end_date=today)
        self.assertIn("Weekly Performance Snapshot", html)
        self.assertIn("What To Do Next", html)
        self.assertIn("Stock Sold vs Remaining", html)
        self.assertIn("Top Sellers / Overselling Items", html)
        self.assertIn("Highest Profit Margin Products", html)
        self.assertIn("Lowest Profit Margin Products", html)
