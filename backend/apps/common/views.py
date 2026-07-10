from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasBusinessPermission, IsSuperAdmin
from apps.audit_logs.services import log_audit_event

from .models import CompanySettings, TransactionEvent
from .serializers import CompanySettingsSerializer, TransactionEventSerializer


class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        return Response({"status": "ok"})


class CompanySettingsAPIView(APIView):
    def get_permissions(self):
        if self.request.method in {"PATCH", "PUT"}:
            return [IsAuthenticated(), IsSuperAdmin()]
        return [IsAuthenticated(), HasBusinessPermission()]

    required_permission = "dashboard.dashboard"

    def get(self, request):
        settings_obj = CompanySettings.get_solo()
        return Response(CompanySettingsSerializer(settings_obj, context={"request": request}).data)

    def patch(self, request):
        settings_obj = CompanySettings.get_solo()
        serializer = CompanySettingsSerializer(
            settings_obj,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        log_audit_event(
            request=request,
            action="company_settings_update",
            module="settings",
            description="Updated company settings used on invoices and reports.",
            target=settings_obj,
        )
        return Response(serializer.data, status=status.HTTP_200_OK)


class TransactionTimelineAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "dashboard.dashboard"

    def get(self, request):
        reference_number = (request.query_params.get("reference_number") or "").strip()
        module = (request.query_params.get("module") or "").strip()
        if not reference_number:
            return Response({"detail": "reference_number is required."}, status=status.HTTP_400_BAD_REQUEST)

        queryset = TransactionEvent.objects.select_related("user").filter(reference_number=reference_number)
        if module:
            queryset = queryset.filter(module=module)

        events = queryset.order_by("-created_at")[:100]
        serializer = TransactionEventSerializer(events, many=True)
        return Response({"count": queryset.count(), "results": serializer.data})
