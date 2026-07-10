from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasBusinessPermission

from .services.metrics import build_dashboard_overview


class DashboardOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "dashboard.dashboard"

    def get(self, request):
        payload = build_dashboard_overview()
        return Response(payload)
