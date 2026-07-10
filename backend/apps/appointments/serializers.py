from rest_framework import serializers

from .models import Appointment, ContactRequest


def validate_phone_10_digits(value: str):
    cleaned = "".join(ch for ch in value.strip() if ch.isdigit())
    if len(cleaned) != 10:
        raise serializers.ValidationError("Phone number must be exactly 10 digits.")
    return cleaned


class AppointmentPublicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "county",
            "procedure_interest",
            "preferred_date",
            "preferred_time",
            "message",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_phone_number(self, value):
        return validate_phone_10_digits(value)


class AppointmentAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Appointment
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "county",
            "procedure_interest",
            "preferred_date",
            "preferred_time",
            "message",
            "status",
            "admin_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContactRequestPublicCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "subject",
            "message",
            "status",
            "created_at",
        ]
        read_only_fields = ["id", "status", "created_at"]

    def validate_phone_number(self, value):
        return validate_phone_10_digits(value)


class ContactRequestAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = [
            "id",
            "full_name",
            "phone_number",
            "email",
            "subject",
            "message",
            "status",
            "admin_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
