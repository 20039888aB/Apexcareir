from django_filters.rest_framework import DjangoFilterBackend
from django.conf import settings
from rest_framework import filters, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated

from apps.accounts.permissions import HasBusinessPermission
from apps.audit_logs.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .models import Appointment, ContactRequest
from .serializers import (
    AppointmentAdminSerializer,
    AppointmentPublicCreateSerializer,
    ContactRequestAdminSerializer,
    ContactRequestPublicCreateSerializer,
)


class AppointmentViewSet(viewsets.ModelViewSet):
    queryset = Appointment.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status", "preferred_date", "county"]
    search_fields = ["full_name", "phone_number", "email", "county", "procedure_interest"]
    ordering_fields = ["created_at", "preferred_date", "status", "full_name"]
    required_permission = "appointments.appointment_management"

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), HasBusinessPermission()]

    def get_serializer_class(self):
        if self.action == "create":
            return AppointmentPublicCreateSerializer
        return AppointmentAdminSerializer

    def perform_create(self, serializer):
        appointment = serializer.save()
        log_audit_event(
            request=self.request,
            action="appointment_create",
            module="appointments",
            description=f"New appointment request from {appointment.full_name}.",
            target=appointment,
            metadata={"status": appointment.status, "county": appointment.county},
        )
        try:
            NotificationService.send(
                title="New Appointment Booking",
                message=(
                    f"Patient: {appointment.full_name}. Phone: {appointment.phone_number}. "
                    f"Email: {appointment.email or 'N/A'}. "
                    f"County: {appointment.county}. Preferred date: {appointment.preferred_date or 'N/A'}. "
                    f"Preferred time: {appointment.preferred_time or 'N/A'}. "
                    f"Procedure interest: {appointment.procedure_interest or 'N/A'}. "
                    f"Message: {appointment.message or 'N/A'}."
                ),
                event_code="appointments.new_booking",
                notification_type=Notification.NotificationType.APPOINTMENT,
                priority=Notification.Priority.HIGH,
                ui_type=Notification.Type.INFO,
                dedup_key=f"appointment-{appointment.id}",
                related_module="appointments",
                reference_id=str(appointment.id),
                source_model="appointments.appointment",
                source_id=appointment.id,
                created_by=self.request.user if getattr(self.request, "user", None) else None,
                direct_emails=[settings.EMAIL_HOST_USER] if getattr(settings, "EMAIL_HOST_USER", "") else None,
            )
        except Exception:
            # Patient booking must succeed even if notification delivery fails.
            return

    def perform_update(self, serializer):
        appointment = serializer.save()
        log_audit_event(
            request=self.request,
            action="appointment_update",
            module="appointments",
            description=f"Updated appointment #{appointment.id} to {appointment.status}.",
            target=appointment,
            metadata={"status": appointment.status},
        )


class ContactRequestViewSet(viewsets.ModelViewSet):
    queryset = ContactRequest.objects.all()
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ["status"]
    search_fields = ["full_name", "phone_number", "email", "subject", "message"]
    ordering_fields = ["created_at", "status", "full_name"]
    required_permission = "appointments.appointment_management"

    def get_permissions(self):
        if self.action == "create":
            return [AllowAny()]
        return [IsAuthenticated(), HasBusinessPermission()]

    def get_serializer_class(self):
        if self.action == "create":
            return ContactRequestPublicCreateSerializer
        return ContactRequestAdminSerializer

    def perform_create(self, serializer):
        contact = serializer.save()
        log_audit_event(
            request=self.request,
            action="contact_request_create",
            module="appointments",
            description=f"New contact request from {contact.full_name}.",
            target=contact,
            metadata={"status": contact.status},
        )
        try:
            NotificationService.send(
                title="New Contact Request",
                message=(
                    f"Name: {contact.full_name}. Phone: {contact.phone_number}. "
                    f"Email: {contact.email or 'N/A'}. Subject: {contact.subject or 'N/A'}. "
                    f"Message: {contact.message}."
                ),
                event_code="contact.new_request",
                notification_type=Notification.NotificationType.SYSTEM,
                priority=Notification.Priority.HIGH,
                ui_type=Notification.Type.INFO,
                dedup_key=f"contact-{contact.id}",
                related_module="contact",
                reference_id=str(contact.id),
                source_model="appointments.contactrequest",
                source_id=contact.id,
                created_by=self.request.user if getattr(self.request, "user", None) else None,
                direct_emails=[settings.EMAIL_HOST_USER] if getattr(settings, "EMAIL_HOST_USER", "") else None,
            )
        except Exception:
            return

    def perform_update(self, serializer):
        contact = serializer.save()
        log_audit_event(
            request=self.request,
            action="contact_request_update",
            module="appointments",
            description=f"Updated contact request #{contact.id} to {contact.status}.",
            target=contact,
            metadata={"status": contact.status},
        )
