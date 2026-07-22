"""
URL configuration for config project.
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

from apps.common.views import MediaAssetAPIView

admin.site.site_header = "Apex Care IR Administration"
admin.site.site_title = "Apexcareir Admin"
admin.site.index_title = "Business Management Console"

# API route modules are mounted under /api/v1/.

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include("apps.common.urls")),
    path("api/v1/", include("apps.accounts.urls")),
    path("api/v1/", include("apps.dashboard.urls")),
    path("api/v1/", include("apps.inventory.urls")),
    path("api/v1/", include("apps.suppliers.urls")),
    path("api/v1/", include("apps.sales.urls")),
    path("api/v1/", include("apps.finance.urls")),
    path("api/v1/", include("apps.reports.urls")),
    path("api/v1/", include("apps.notifications.urls")),
    path("api/v1/", include("apps.audit_logs.urls")),
    path("api/v1/", include("apps.appointments.urls")),
    path("api/v1/", include("apps.ai_assistant.urls")),
    # Production-safe media serving (DB-backed first, filesystem fallback).
    re_path(r"^media/(?P<path>.*)$", MediaAssetAPIView.as_view(), name="media-root"),
]
