from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ProductCategoryViewSet,
    ProductViewSet,
    StockAdjustmentViewSet,
    StockReceiptViewSet,
    StockTransferViewSet,
)

router = DefaultRouter()
router.register("inventory/categories", ProductCategoryViewSet, basename="inventory-categories")
router.register("inventory/products", ProductViewSet, basename="inventory-products")
router.register("inventory/stock-receipts", StockReceiptViewSet, basename="inventory-stock-receipts")
router.register("inventory/stock-transfers", StockTransferViewSet, basename="inventory-stock-transfers")
router.register("inventory/stock-adjustments", StockAdjustmentViewSet, basename="inventory-stock-adjustments")

urlpatterns = [
    path("", include(router.urls)),
]
