from django.db.models import Q
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.mixins import SuperAdminDestroyMixin
from apps.accounts.permissions import HasBusinessPermission
from apps.audit_logs.services import log_audit_event

from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(SuperAdminDestroyMixin, mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    queryset = AuditLog.objects.select_related("user").all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "audit_logs.audit_logs"

    def _filtered_queryset(self):
        queryset = self.get_queryset()
        search = (self.request.query_params.get("search") or "").strip()
        module = (self.request.query_params.get("module") or "").strip()
        action_name = (self.request.query_params.get("action") or "").strip()
        start_date = (self.request.query_params.get("start_date") or "").strip()
        end_date = (self.request.query_params.get("end_date") or "").strip()

        if module:
            queryset = queryset.filter(module=module)
        if action_name:
            queryset = queryset.filter(action=action_name)
        if start_date:
            queryset = queryset.filter(created_at__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__date__lte=end_date)
        if search:
            queryset = queryset.filter(
                Q(description__icontains=search)
                | Q(action__icontains=search)
                | Q(module__icontains=search)
                | Q(target_repr__icontains=search)
                | Q(user__email__icontains=search)
            )
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self._filtered_queryset()
        limit_param = request.query_params.get("limit") or "100"
        try:
            limit = min(max(int(limit_param), 1), 500)
        except ValueError:
            limit = 100

        total_count = queryset.count()
        logs = queryset.order_by("-created_at")[:limit]
        serializer = self.get_serializer(logs, many=True)
        return Response({"count": total_count, "results": serializer.data})

    def perform_destroy(self, instance):
        log_id = instance.id
        instance.delete()
        log_audit_event(
            request=self.request,
            action="audit_log_delete",
            module="audit_logs",
            description=f"SuperAdmin deleted audit log #{log_id}.",
            metadata={"deleted_log_id": log_id},
        )

    @action(detail=False, methods=["post"], url_path="purge")
    def purge(self, request):
        queryset = self._filtered_queryset()
        deleted_count, _ = queryset.delete()
        log_audit_event(
            request=request,
            action="audit_log_purge",
            module="audit_logs",
            description=f"SuperAdmin purged {deleted_count} audit log record(s).",
            metadata={"deleted_count": deleted_count},
        )
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)
