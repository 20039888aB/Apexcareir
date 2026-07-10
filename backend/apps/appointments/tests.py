from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from apps.notifications.models import EmailNotificationLog


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    DEFAULT_FROM_EMAIL="no-reply@example.com",
    EMAIL_HOST_USER="notify@example.com",
)
class AppointmentAndContactNotificationTests(APITestCase):
    def test_contact_request_sends_email_immediately(self):
        response = self.client.post(
            "/api/v1/contact-requests/",
            {
                "full_name": "Felix Example",
                "phone_number": "0712345678",
                "email": "felix@example.com",
                "subject": "Consultation request",
                "message": "I would like more information about IR services.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["notify@example.com"])

        email_log = EmailNotificationLog.objects.latest("created_at")
        self.assertEqual(email_log.status, EmailNotificationLog.Status.SENT)

    def test_appointment_request_sends_email_immediately(self):
        response = self.client.post(
            "/api/v1/appointments/",
            {
                "full_name": "Alice Example",
                "phone_number": "0712345678",
                "email": "alice@example.com",
                "county": "Nairobi",
                "procedure_interest": "Biopsy",
                "preferred_date": "2026-07-10",
                "preferred_time": "Morning",
                "message": "Please confirm the next available slot.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["notify@example.com"])

        email_log = EmailNotificationLog.objects.latest("created_at")
        self.assertEqual(email_log.status, EmailNotificationLog.Status.SENT)
