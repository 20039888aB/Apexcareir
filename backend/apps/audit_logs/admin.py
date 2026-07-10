from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "module", "action", "user", "target_model", "target_id")
    list_filter = ("module", "action", "created_at")
    search_fields = ("description", "target_repr", "user__email", "target_model", "target_id")
    ordering = ("-created_at",)
