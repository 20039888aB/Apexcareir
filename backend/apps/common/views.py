from django.conf import settings
from django.http import Http404, HttpResponse
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasBusinessPermission, IsSuperAdmin
from apps.audit_logs.services import log_audit_event

from .models import CompanySettings, MediaAsset, TransactionEvent
from .serializers import CompanySettingsSerializer, TransactionEventSerializer
from .services.datetime_context import get_system_clock_payload


class ApiRootView(APIView):
    """Friendly landing page for the API host root URL."""

    permission_classes = []
    authentication_classes = []

    def get(self, request):
        return Response(
            {
                "service": "Apex Care IR API",
                "status": "ok",
                "website": "https://apexcareir.onrender.com",
                "admin_console": "https://apexcareir.onrender.com/admin1",
                "health": request.build_absolute_uri("/api/v1/health/"),
                "api_base": request.build_absolute_uri("/api/v1/"),
                "django_admin": request.build_absolute_uri("/admin/"),
            }
        )


class HealthCheckView(APIView):
    permission_classes = []

    def get(self, request):
        email_configured = bool(settings.EMAIL_HOST_USER and settings.EMAIL_HOST_PASSWORD)
        payload = {
            "status": "ok",
            "email_configured": email_configured,
            "email_host": settings.EMAIL_HOST or "",
            "email_user_set": bool(settings.EMAIL_HOST_USER),
        }
        try:
            from apps.notifications.models import EmailNotificationLog, ScheduledJob

            payload["email_queue"] = {
                "queued": EmailNotificationLog.objects.filter(status=EmailNotificationLog.Status.QUEUED).count(),
                "failed": EmailNotificationLog.objects.filter(status=EmailNotificationLog.Status.FAILED).count(),
                "sent": EmailNotificationLog.objects.filter(status=EmailNotificationLog.Status.SENT).count(),
            }
            payload["scheduler_jobs_active"] = ScheduledJob.objects.filter(is_active=True).count()
        except Exception:  # noqa: BLE001
            pass
        return Response(payload)


class MediaAssetAPIView(APIView):
    """Serve database-backed media files publicly (logos, invoice PDFs, receipts)."""

    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, path):
        name = (path or "").lstrip("/")
        asset = MediaAsset.objects.filter(name=name).first()
        if asset is None:
            # Fallback for older filesystem uploads while migrating.
            file_path = settings.MEDIA_ROOT / name
            if file_path.is_file():
                content_type = "application/octet-stream"
                if name.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".webp")):
                    content_type = f"image/{'jpeg' if name.lower().endswith(('.jpg', '.jpeg')) else name.rsplit('.', 1)[-1]}"
                response = HttpResponse(file_path.read_bytes(), content_type=content_type)
                response["Cache-Control"] = "public, max-age=86400"
                return response
            raise Http404("Media not found.")

        response = HttpResponse(bytes(asset.content), content_type=asset.content_type or "application/octet-stream")
        response["Cache-Control"] = "public, max-age=86400"
        response["Content-Length"] = str(asset.size or len(asset.content))
        return response


class SystemClockAPIView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(get_system_clock_payload())


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
