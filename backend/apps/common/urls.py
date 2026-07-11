from django.urls import path

from .views import CompanySettingsAPIView, HealthCheckView, SystemClockAPIView, TransactionTimelineAPIView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health-check"),
    path("system/clock/", SystemClockAPIView.as_view(), name="system-clock"),
    path("settings/company/", CompanySettingsAPIView.as_view(), name="company-settings"),
    path("timeline/", TransactionTimelineAPIView.as_view(), name="transaction-timeline"),
]
