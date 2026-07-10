from django.db.models import (
    Count,
    DateField,
    DecimalField,
    ExpressionWrapper,
    F,
    Max,
    Sum,
    Value,
)
from django.db.models.functions import Coalesce
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import HasBusinessPermission
from apps.inventory.models import StockReceipt

from .models import Supplier
from .serializers import SupplierInvoiceSerializer, SupplierSerializer


class SupplierViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    serializer_class = SupplierSerializer
    required_permission = "suppliers.supplier_management"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "contact_person", "phone", "email", "products_supplied", "supplier_number"]
    ordering_fields = ["name", "created_at", "updated_at"]
    ordering = ["name"]

    def get_queryset(self):
        line_total = ExpressionWrapper(
            F("stock_receipts__quantity") * F("stock_receipts__purchase_price"),
            output_field=DecimalField(max_digits=14, decimal_places=2),
        )
        return Supplier.objects.annotate(
            purchase_count=Count("stock_receipts", distinct=True),
            total_items_received=Coalesce(Sum("stock_receipts__quantity"), 0),
            total_purchase_amount=Coalesce(
                Sum(line_total), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))
            ),
            last_purchase_date=Max("stock_receipts__date_received", output_field=DateField()),
        )

    @action(detail=True, methods=["get"], url_path="invoices")
    def invoices(self, request, pk=None):
        supplier = self.get_object()
        invoices = StockReceipt.objects.filter(supplier_id=supplier.id).select_related("product", "supplier").order_by(
            "-date_received", "-created_at"
        )
        serializer = SupplierInvoiceSerializer(invoices, many=True)
        return Response({"count": invoices.count(), "results": serializer.data})
