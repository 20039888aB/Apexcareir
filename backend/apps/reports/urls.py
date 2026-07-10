from django.urls import path

from .views import ReportAPIView

urlpatterns = [
    path("reports/<str:report_type>/", ReportAPIView.as_view(), name="report-by-type"),
]
