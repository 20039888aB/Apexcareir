from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, InvoiceViewSet, SaleViewSet

router = DefaultRouter()
router.register("sales", SaleViewSet, basename="sales")
router.register("customers", CustomerViewSet, basename="customers")
router.register("invoices", InvoiceViewSet, basename="invoices")

urlpatterns = [
    path("", include(router.urls)),
]
