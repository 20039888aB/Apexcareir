from datetime import date
from unittest.mock import patch

from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APIClient

from apps.common.services.datetime_context import get_system_clock_payload, resolve_report_date_range


class DateTimeContextTests(TestCase):
    @override_settings(TIME_ZONE="Africa/Nairobi", USE_TZ=True)
    def test_get_system_clock_payload(self):
        payload = get_system_clock_payload()
        self.assertEqual(payload["timezone"], "Africa/Nairobi")
        self.assertRegex(payload["local_date"], r"^\d{4}-\d{2}-\d{2}$")
        self.assertRegex(payload["local_now"], r"^\d{4}-\d{2}-\d{2}T")
        self.assertIn("local_time", payload)

    @override_settings(TIME_ZONE="Africa/Nairobi", USE_TZ=True)
    @patch("apps.common.services.datetime_context.timezone.localdate", return_value=date(2026, 7, 11))
    def test_resolve_report_date_range_month(self, _mock_localdate):
        start, end, label = resolve_report_date_range(month="2026-07")
        self.assertEqual(start, date(2026, 7, 1))
        self.assertEqual(end, date(2026, 7, 11))
        self.assertEqual(label, "July 2026")

    @override_settings(TIME_ZONE="Africa/Nairobi", USE_TZ=True)
    @patch("apps.common.services.datetime_context.timezone.localdate", return_value=date(2026, 7, 11))
    def test_resolve_report_date_range_single_date(self, _mock_localdate):
        start, end, label = resolve_report_date_range(on_date=date(2026, 6, 15))
        self.assertEqual(start, date(2026, 6, 15))
        self.assertEqual(end, date(2026, 6, 15))
        self.assertEqual(label, "2026-06-15")

    @override_settings(TIME_ZONE="Africa/Nairobi", USE_TZ=True)
    @patch("apps.common.services.datetime_context.timezone.localdate", return_value=date(2026, 7, 11))
    def test_resolve_report_date_range_custom(self, _mock_localdate):
        start, end, _ = resolve_report_date_range(
            start_date=date(2026, 7, 5),
            end_date=date(2026, 7, 9),
        )
        self.assertEqual(start, date(2026, 7, 5))
        self.assertEqual(end, date(2026, 7, 9))

    def test_resolve_report_date_range_invalid_month(self):
        with self.assertRaises(ValueError):
            resolve_report_date_range(month="2026-13")


class SystemClockAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_system_clock_endpoint(self):
        response = self.client.get("/api/v1/system/clock/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("local_date", response.data)
        self.assertIn("local_now", response.data)
        self.assertIn("timezone", response.data)
