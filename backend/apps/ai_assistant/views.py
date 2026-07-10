from django.db.models import Prefetch
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AIConversationMessage, AIConversationSession
from .services import generate_reply, knowledge_stats


class AIChatRequestSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=4000)
    session_id = serializers.UUIDField(required=False)


class AIConversationMessageSerializer(serializers.ModelSerializer):
    text = serializers.CharField(source="content")

    class Meta:
        model = AIConversationMessage
        fields = ["id", "role", "text", "created_at", "confidence", "evidence", "category"]


class AIConversationSessionSummarySerializer(serializers.Serializer):
    session_id = serializers.UUIDField(source="id")
    title = serializers.CharField()
    last_message_preview = serializers.CharField(allow_blank=True)
    message_count = serializers.IntegerField()
    updated_at = serializers.DateTimeField()


class AIChatAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = AIChatRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        session_id = serializer.validated_data.get("session_id")
        if session_id:
            session, _ = AIConversationSession.objects.get_or_create(id=session_id)
        else:
            session = AIConversationSession.objects.create()

        user_message = AIConversationMessage.objects.create(
            session=session,
            role=AIConversationMessage.Role.USER,
            content=serializer.validated_data["message"],
        )
        context_messages = [
            {"role": msg.role, "content": msg.content}
            for msg in session.messages.order_by("-created_at")[:8]
        ][::-1]
        payload = generate_reply(serializer.validated_data["message"], conversation_context=context_messages)
        assistant_message = AIConversationMessage.objects.create(
            session=session,
            role=AIConversationMessage.Role.ASSISTANT,
            content=payload["reply"],
            confidence=payload.get("confidence", ""),
            evidence=payload.get("evidence", ""),
            category=payload.get("category", ""),
        )
        return Response(
            {
                **payload,
                "session_id": str(session.id),
                "user_message": AIConversationMessageSerializer(user_message).data,
                "assistant_message": AIConversationMessageSerializer(assistant_message).data,
            }
        )


class AIKnowledgeStatsAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(knowledge_stats())


class AIConversationHistoryAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, session_id):
        try:
            session = AIConversationSession.objects.get(id=session_id)
        except AIConversationSession.DoesNotExist:
            return Response({"session_id": str(session_id), "messages": []})
        messages = AIConversationMessageSerializer(session.messages.all(), many=True).data
        return Response({"session_id": str(session.id), "messages": messages})


class AIConversationSessionCreateAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            limit = int(request.query_params.get("limit", 12))
        except (TypeError, ValueError):
            limit = 12
        limit = min(max(limit, 1), 50)
        sessions = (
            AIConversationSession.objects.order_by("-updated_at")
            .prefetch_related(
                Prefetch(
                    "messages",
                    queryset=AIConversationMessage.objects.order_by("created_at"),
                )
            )[:limit]
        )
        summaries = []
        for session in sessions:
            messages = list(session.messages.all())
            first_user = next((msg for msg in messages if msg.role == AIConversationMessage.Role.USER), None)
            last_message = messages[-1] if messages else None
            title = (first_user.content if first_user else "New conversation").strip()[:80]
            last_preview = (last_message.content if last_message else "").strip()[:140]
            summaries.append(
                {
                    "id": session.id,
                    "title": title or "New conversation",
                    "last_message_preview": last_preview,
                    "message_count": len(messages),
                    "updated_at": session.updated_at,
                }
            )
        return Response(AIConversationSessionSummarySerializer(summaries, many=True).data)

    def post(self, request):
        session = AIConversationSession.objects.create()
        return Response({"session_id": str(session.id), "messages": []})
