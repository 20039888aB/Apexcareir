from django.db.models import Count, DecimalField, Max, Sum, Value
from django.db.models.functions import Coalesce
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import HasBusinessPermission
from apps.audit_logs.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .filters import SaleFilterSet
from .models import Sale
from .serializers import CustomerRecordSerializer, SaleSerializer


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("product", "salesperson").all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "sales.sales_management"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SaleFilterSet
    search_fields = ["invoice_number", "customer", "product__name", "product__sku", "salesperson__email"]
    ordering_fields = ["date", "created_at", "total", "profit", "invoice_number"]

    def perform_create(self, serializer):
        sale = serializer.save()
        log_audit_event(
            request=self.request,
            action="sale_create",
            module="sales",
            description=f"Created sale invoice {sale.invoice_number} for {sale.customer}.",
            target=sale,
            metadata={"total": float(sale.total), "profit": float(sale.profit)},
        )
        NotificationService.send(
            title="New Sale Recorded",
            message=(
                f"Invoice {sale.invoice_number} was recorded for {sale.customer}. "
                f"Total: KES {sale.total}. Profit: KES {sale.profit}. "
                f"Salesperson: {(sale.salesperson.email if sale.salesperson else 'N/A')}. Date: {sale.date}."
            ),
            event_code="sales.new_sale",
            notification_type=Notification.NotificationType.SALES,
            priority=Notification.Priority.MEDIUM,
            ui_type=Notification.Type.SUCCESS,
            dedup_key=f"sale-{sale.id}",
            related_module="sales",
            reference_id=str(sale.id),
            source_model="sales.sale",
            source_id=sale.id,
            created_by=self.request.user,
        )

    @action(detail=False, methods=["get"], url_path="customers")
    def customers(self, request):
        query = (request.query_params.get("q") or "").strip()
        queryset = Sale.objects.all()
        if query:
            queryset = queryset.filter(customer__icontains=query)

        customer_rows = (
            queryset.values("customer")
            .annotate(
                total_sales=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
                sale_count=Count("id"),
                latest_sale_date=Max("date"),
            )
            .order_by("-latest_sale_date", "customer")
        )
        serializer = CustomerRecordSerializer(customer_rows, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})
