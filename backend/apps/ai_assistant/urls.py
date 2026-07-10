from django.urls import path

from .views import (
    AIChatAPIView,
    AIConversationHistoryAPIView,
    AIConversationSessionCreateAPIView,
    AIKnowledgeStatsAPIView,
)

urlpatterns = [
    path("ai-assistant/chat/", AIChatAPIView.as_view(), name="ai-assistant-chat"),
    path("ai-assistant/stats/", AIKnowledgeStatsAPIView.as_view(), name="ai-assistant-stats"),
    path("ai-assistant/sessions/", AIConversationSessionCreateAPIView.as_view(), name="ai-assistant-session-create"),
    path(
        "ai-assistant/sessions/<uuid:session_id>/messages/",
        AIConversationHistoryAPIView.as_view(),
        name="ai-assistant-session-history",
    ),
]
