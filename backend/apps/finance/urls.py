from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ExpenseViewSet, FinanceSummaryAPIView, PayrollViewSet

router = DefaultRouter()
router.register("finance/expenses", ExpenseViewSet, basename="finance-expenses")
router.register("finance/payroll", PayrollViewSet, basename="finance-payroll")

urlpatterns = [
    path("finance/summary/", FinanceSummaryAPIView.as_view(), name="finance-summary"),
    path("", include(router.urls)),
]
