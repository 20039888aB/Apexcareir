from django.db import models
from django.db.models import Count, DecimalField, Max, Sum, Value
from django.db.models.functions import Coalesce
from django.http import FileResponse
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.permissions import HasBusinessPermission
from apps.audit_logs.services import log_audit_event
from apps.common.services.timeline import log_transaction_event
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .filters import InvoiceFilterSet, SaleFilterSet
from .models import Customer, Invoice, Sale
from .serializers import (
    CustomerDetailSerializer,
    CustomerRecordSerializer,
    CustomerSerializer,
    InvoicePaymentSerializer,
    InvoicePaymentWriteSerializer,
    InvoiceSerializer,
    InvoiceWriteSerializer,
    SaleSerializer,
)
from .services.invoice_pdf import save_invoice_pdf
from .services.invoice_service import create_invoice_for_sale, email_invoice_to_customer
from .services.payment_service import record_invoice_payment


class CustomerViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "sales.sales_management"
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["customer_number", "name", "company_name", "phone", "email"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        queryset = Customer.objects.select_related("created_by").all()
        if self.action in {"retrieve", "invoices", "purchase_history"}:
            queryset = queryset.annotate(
                total_invoices=Count("invoices", distinct=True),
                total_spent=Coalesce(
                    Sum("invoices__grand_total"),
                    Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
                ),
                latest_invoice_date=Max("invoices__invoice_date"),
            )
        return queryset

    def get_serializer_class(self):
        if self.action == "retrieve":
            return CustomerDetailSerializer
        return CustomerSerializer

    def perform_create(self, serializer):
        from apps.common.services.numbering import allocate_document_number

        customer = serializer.save(
            customer_number=allocate_document_number("customer"),
            created_by=self.request.user,
            updated_by=self.request.user,
        )
        log_transaction_event(
            module="customers",
            reference_number=customer.customer_number,
            reference_id=customer.id,
            event_type="created",
            description=f"Customer {customer.name} created.",
            user=self.request.user,
        )

    def perform_update(self, serializer):
        customer = serializer.save(updated_by=self.request.user)
        if "logo" in self.request.FILES:
            customer.logo = self.request.FILES["logo"]
            customer.save(update_fields=["logo", "updated_at"])
        log_transaction_event(
            module="customers",
            reference_number=customer.customer_number,
            reference_id=customer.id,
            event_type="updated",
            description=f"Customer {customer.name} updated.",
            user=self.request.user,
        )

    def perform_destroy(self, instance):
        customer_number = instance.customer_number
        customer_name = instance.name
        customer_id = instance.id
        instance.delete()
        log_audit_event(
            request=self.request,
            action="customer_delete",
            module="sales",
            description=f"Deleted customer {customer_name} ({customer_number}).",
            metadata={"customer_id": customer_id},
        )
        log_transaction_event(
            module="customers",
            reference_number=customer_number,
            reference_id=customer_id,
            event_type="deleted",
            description=f"Customer {customer_name} deleted.",
            user=self.request.user,
        )

    @action(detail=True, methods=["get"], url_path="invoices")
    def invoices(self, request, pk=None):
        customer = self.get_object()
        invoices = (
            Invoice.objects.select_related("sale", "sale__product", "customer", "generated_by")
            .filter(customer=customer)
            .order_by("-invoice_date", "-created_at")
        )
        serializer = InvoiceSerializer(invoices, many=True, context={"request": request})
        return Response({"count": invoices.count(), "results": serializer.data})

    @action(detail=True, methods=["get"], url_path="purchase-history")
    def purchase_history(self, request, pk=None):
        customer = self.get_object()
        sales = (
            Sale.objects.select_related("product", "salesperson", "invoice_record")
            .filter(customer_record=customer)
            .order_by("-date", "-created_at")
        )
        serializer = SaleSerializer(sales, many=True, context={"request": request})
        return Response({"count": sales.count(), "results": serializer.data})


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = (
        Invoice.objects.select_related("sale", "sale__product", "customer", "generated_by")
        .prefetch_related("line_items__product", "payments__recorded_by")
        .all()
    )
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "sales.sales_management"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "invoice_number",
        "customer_name",
        "customer_email",
        "customer_phone",
        "sale__sale_number",
        "sale__product__name",
        "sale__product__sku",
    ]
    filterset_class = InvoiceFilterSet
    ordering_fields = ["invoice_date", "created_at", "grand_total"]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return InvoiceWriteSerializer
        return InvoiceSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        log_audit_event(
            request=request,
            action="invoice_create",
            module="sales",
            description=f"Manually created invoice {invoice.invoice_number} for {invoice.customer_name}.",
            target=invoice,
        )
        return Response(InvoiceSerializer(invoice, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def partial_update(self, request, *args, **kwargs):
        invoice = self.get_object()
        serializer = self.get_serializer(invoice, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()
        log_audit_event(
            request=request,
            action="invoice_update",
            module="sales",
            description=f"Updated invoice {invoice.invoice_number}.",
            target=invoice,
        )
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)

    def update(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)

    def perform_destroy(self, instance):
        invoice_number = instance.invoice_number
        invoice_id = instance.id
        instance.delete()
        log_audit_event(
            request=self.request,
            action="invoice_delete",
            module="sales",
            description=f"Deleted invoice {invoice_number}.",
            metadata={"invoice_id": invoice_id},
        )

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        invoice = self.get_object()
        save_invoice_pdf(invoice, invoice.sale)
        log_transaction_event(
            module="invoices",
            reference_number=invoice.invoice_number,
            reference_id=invoice.id,
            event_type="viewed",
            description=f"Invoice {invoice.invoice_number} PDF downloaded or viewed.",
            user=request.user,
        )
        return FileResponse(invoice.pdf_file.open("rb"), as_attachment=True, filename=f"{invoice.invoice_number}.pdf")

    @action(detail=True, methods=["get"], url_path="timeline")
    def timeline(self, request, pk=None):
        invoice = self.get_object()
        from apps.common.models import TransactionEvent
        from apps.common.serializers import TransactionEventSerializer

        events = (
            TransactionEvent.objects.select_related("user")
            .filter(reference_number=invoice.invoice_number, module="invoices")
            .order_by("-created_at")[:100]
        )
        serializer = TransactionEventSerializer(events, many=True)
        return Response({"count": events.count(), "results": serializer.data})

    @action(detail=True, methods=["post"], url_path="regenerate")
    def regenerate(self, request, pk=None):
        invoice = self.get_object()
        create_invoice_for_sale(invoice.sale, user=request.user, regenerate=True)
        invoice.refresh_from_db()
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="email")
    def email(self, request, pk=None):
        invoice = self.get_object()
        recipient_emails = request.data.get("emails") or request.data.get("email")
        try:
            recipients = email_invoice_to_customer(
                invoice,
                user=request.user,
                recipient_emails=recipient_emails,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            {
                "status": "sent",
                "recipients": recipients,
                "recipient": recipients[0] if recipients else "",
            }
        )

    @action(detail=True, methods=["get", "post"], url_path="payments")
    def payments(self, request, pk=None):
        invoice = self.get_object()
        if request.method.lower() == "get":
            serializer = InvoicePaymentSerializer(invoice.payments.select_related("recorded_by"), many=True)
            return Response({"count": len(serializer.data), "results": serializer.data})

        serializer = InvoicePaymentWriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = record_invoice_payment(
                invoice,
                amount=serializer.validated_data["amount"],
                payment_date=serializer.validated_data.get("payment_date"),
                payment_method=serializer.validated_data.get("payment_method") or "cash",
                reference=serializer.validated_data.get("reference", ""),
                notes=serializer.validated_data.get("notes", ""),
                user=request.user,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        invoice.refresh_from_db()
        return Response(
            {
                "payment": InvoicePaymentSerializer(payment).data,
                "invoice": InvoiceSerializer(invoice, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["patch"], url_path="status")
    def update_status(self, request, pk=None):
        invoice = self.get_object()
        status_value = (request.data.get("status") or "").strip()
        payment_status = (request.data.get("payment_status") or "").strip()

        if status_value and status_value in dict(Invoice.Status.choices):
            invoice.status = status_value
        if payment_status and payment_status in dict(Invoice.PaymentStatus.choices):
            invoice.payment_status = payment_status
        invoice.updated_by = request.user
        invoice.save()

        log_transaction_event(
            module="invoices",
            reference_number=invoice.invoice_number,
            reference_id=invoice.id,
            event_type="updated",
            description=f"Invoice status updated to {invoice.status} / {invoice.payment_status}.",
            user=request.user,
        )
        if invoice.status == Invoice.Status.PAID or invoice.payment_status == Invoice.PaymentStatus.PAID:
            log_transaction_event(
                module="invoices",
                reference_number=invoice.invoice_number,
                reference_id=invoice.id,
                event_type="paid",
                description=f"Invoice {invoice.invoice_number} marked as paid.",
                user=request.user,
            )
        return Response(InvoiceSerializer(invoice, context={"request": request}).data)


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related("product", "salesperson", "customer_record", "invoice_record").all()
    serializer_class = SaleSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_permission = "sales.sales_management"
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SaleFilterSet
    search_fields = [
        "sale_number",
        "invoice_number",
        "customer",
        "customer_record__customer_number",
        "product__name",
        "product__sku",
        "product__product_number",
        "salesperson__email",
    ]
    ordering_fields = ["date", "created_at", "total", "profit", "invoice_number", "sale_number"]

    def perform_create(self, serializer):
        sale = serializer.save()
        log_audit_event(
            request=self.request,
            action="sale_create",
            module="sales",
            description=f"Created sale {sale.sale_number} / invoice {sale.invoice_number} for {sale.customer}.",
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
        queryset = Sale.objects.select_related("customer_record").all()
        if query:
            queryset = queryset.filter(
                models.Q(customer__icontains=query)
                | models.Q(customer_record__customer_number__icontains=query)
                | models.Q(customer_record__name__icontains=query)
            )

        customer_rows = (
            queryset.values("customer", "customer_record", "customer_record__customer_number")
            .annotate(
                total_sales=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
                sale_count=Count("id"),
                latest_sale_date=Max("date"),
            )
            .order_by("-latest_sale_date", "customer")
        )

        results = [
            {
                "customer": row["customer"],
                "customer_number": row["customer_record__customer_number"] or "",
                "customer_id": row["customer_record"],
                "total_sales": row["total_sales"],
                "sale_count": row["sale_count"],
                "latest_sale_date": row["latest_sale_date"],
            }
            for row in customer_rows
        ]
        serializer = CustomerRecordSerializer(results, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})

    @action(detail=True, methods=["get"], url_path="invoice-pdf")
    def invoice_pdf(self, request, pk=None):
        sale = self.get_object()
        invoice = getattr(sale, "invoice_record", None)
        if not invoice:
            invoice = create_invoice_for_sale(sale, user=request.user)
        save_invoice_pdf(invoice, sale)
        log_transaction_event(
            module="invoices",
            reference_number=invoice.invoice_number,
            reference_id=invoice.id,
            event_type="viewed",
            description=f"Invoice {invoice.invoice_number} PDF downloaded or viewed.",
            user=request.user,
        )
        return FileResponse(invoice.pdf_file.open("rb"), as_attachment=True, filename=f"{invoice.invoice_number}.pdf")
