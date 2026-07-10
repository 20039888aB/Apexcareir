from django.contrib import admin

from .models import Appointment, ContactRequest


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "phone_number", "county", "status", "preferred_date", "created_at")
    list_filter = ("status", "preferred_date", "county", "created_at")
    search_fields = ("full_name", "phone_number", "email", "county", "procedure_interest")
    readonly_fields = ("created_at", "updated_at")


@admin.register(ContactRequest)
class ContactRequestAdmin(admin.ModelAdmin):
    list_display = ("id", "full_name", "phone_number", "email", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("full_name", "phone_number", "email", "subject", "message")
    readonly_fields = ("created_at", "updated_at")
