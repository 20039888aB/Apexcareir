from django.contrib import admin

from .models import AIConversationMessage, AIConversationSession


@admin.register(AIConversationSession)
class AIConversationSessionAdmin(admin.ModelAdmin):
    list_display = ("id", "created_at", "updated_at")
    search_fields = ("id",)
    readonly_fields = ("created_at", "updated_at")


@admin.register(AIConversationMessage)
class AIConversationMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "role", "category", "confidence", "created_at")
    list_filter = ("role", "category", "confidence", "evidence", "created_at")
    search_fields = ("session__id", "content")
    readonly_fields = ("created_at",)
