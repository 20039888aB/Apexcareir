from django.contrib import admin

from .models import CompanySettings, TransactionEvent


@admin.register(CompanySettings)
class CompanySettingsAdmin(admin.ModelAdmin):
    list_display = ("company_name", "email", "phone", "updated_at")
    readonly_fields = ("updated_at",)


@admin.register(TransactionEvent)
class TransactionEventAdmin(admin.ModelAdmin):
    list_display = ("reference_number", "module", "event_type", "user", "created_at")
    list_filter = ("module", "event_type")
    search_fields = ("reference_number", "description")
    readonly_fields = ("created_at",)
