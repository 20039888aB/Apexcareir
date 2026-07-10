from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasBusinessPermission

from .services import (
    REPORT_TYPES,
    build_report_payload,
    export_as_csv,
    export_as_pdf,
    export_as_xlsx,
)


class ReportAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "reports.reports"

    def get(self, request, report_type):
        if report_type not in REPORT_TYPES:
            return Response({"detail": "Invalid report type."}, status=400)

        today = timezone.localdate()
        parsed_start = parse_date(request.query_params.get("start_date") or "")
        parsed_end = parse_date(request.query_params.get("end_date") or "")
        start_date = parsed_start or today.replace(day=1)
        end_date = parsed_end or today
        search = (request.query_params.get("search") or "").strip()

        payload = build_report_payload(report_type, start_date, end_date, search)
        payload["start_date"] = start_date.isoformat()
        payload["end_date"] = end_date.isoformat()

        export_kind = (request.query_params.get("export") or "").lower().strip()
        if not export_kind:
            return Response(payload)
        if export_kind == "csv":
            return export_as_csv(payload)
        if export_kind == "xlsx":
            return export_as_xlsx(payload)
        if export_kind == "pdf":
            return export_as_pdf(payload)
        return Response({"detail": "Invalid export format."}, status=400)
