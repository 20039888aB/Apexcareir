from django.urls import path

from .views import CompanySettingsAPIView, HealthCheckView, TransactionTimelineAPIView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("settings/company/", CompanySettingsAPIView.as_view(), name="company-settings"),
    path("timeline/", TransactionTimelineAPIView.as_view(), name="transaction-timeline"),
]
