from django.db import transaction
from django.db.models import F
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from apps.accounts.permissions import HasBusinessPermission, IsSuperAdmin
from apps.audit_logs.services import log_audit_event
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

from .filters import (
    ProductFilterSet,
    StockAdjustmentFilterSet,
    StockReceiptFilterSet,
    StockTransferFilterSet,
)
from .models import Product, ProductCategory, StockAdjustment, StockMovement, StockReceipt, StockReceiptBatch, StockTransfer
from .services.catalogue_seed import seed_catalogue_items
from .services.product_admin import force_delete_product, purge_product_history
from .serializers import (
    ProductCategorySerializer,
    ProductSerializer,
    StockAdjustmentSerializer,
    StockMovementSerializer,
    StockReceiptSerializer,
    StockTransferSerializer,
)

def _notify_low_stock_if_needed(*, request, product):
    product.refresh_from_db(fields=["current_stock", "minimum_stock", "name", "sku"])
    if product.current_stock > product.minimum_stock:
        return
    NotificationService.send(
        title="Low Inventory Alert",
        message=(
            f"{product.name} ({product.sku}) is below minimum stock. "
            f"Current quantity: {product.current_stock}. Minimum quantity: {product.minimum_stock}. "
            "Suggested action: reorder from supplier."
        ),
        event_code="inventory.low_stock_immediate",
        notification_type=Notification.NotificationType.INVENTORY,
        priority=Notification.Priority.HIGH,
        ui_type=Notification.Type.WARNING,
        dedup_key=f"low-stock-immediate-{product.id}",
        related_module="inventory",
        reference_id=str(product.id),
        source_model="inventory.product",
        source_id=product.id,
        created_by=request.user,
    )


class PermissionByActionMixin:
    permission_by_action = {}

    def get_required_permission(self):
        return self.permission_by_action.get(self.action, self.permission_by_action.get("default"))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        return [permission() for permission in self.permission_classes]


class ProductCategoryViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = ProductCategory.objects.all()
    serializer_class = ProductCategorySerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "inventory.product_management"}
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "created_at"]

    @action(detail=False, methods=["post"], url_path="seed-defaults")
    def seed_defaults(self, request):
        default_categories = [
            "Consumables",
            "Catheters",
            "Dialysis Equipment",
            "ICU Equipment",
            "Surgical Instruments",
            "Laboratory Equipment",
            "Furniture",
        ]
        created = []
        for category_name in default_categories:
            category, was_created = ProductCategory.objects.get_or_create(name=category_name)
            if was_created:
                created.append(category_name)
        return Response({"created": created, "count": len(created)})

    def perform_create(self, serializer):
        category = serializer.save()
        log_audit_event(
            request=self.request,
            action="category_create",
            module="inventory",
            description=f"Created product category {category.name}.",
            target=category,
        )

    def perform_destroy(self, instance):
        category_name = instance.name
        instance.delete()
        log_audit_event(
            request=self.request,
            action="category_delete",
            module="inventory",
            description=f"Deleted product category {category_name}.",
            metadata={"category_name": category_name},
        )


class ProductViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = Product.objects.select_related("category", "supplier").all()
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {
        "default": "inventory.product_management",
        "low_stock": "inventory.low_stock_alerts",
    }
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ProductFilterSet
    search_fields = ["name", "sku", "barcode", "brand", "model_name", "description"]
    ordering_fields = ["name", "created_at", "current_stock", "selling_price"]

    def get_permissions(self):
        if self.action in {"destroy", "force_delete", "purge_history"}:
            return [IsAuthenticated(), IsSuperAdmin()]
        self.required_permission = self.get_required_permission()
        return [permission() for permission in self.permission_classes]

    def get_queryset(self):
        queryset = super().get_queryset()
        include_archived = (self.request.query_params.get("include_archived") or "").lower() in {"1", "true", "yes"}
        if not include_archived:
            queryset = queryset.filter(is_archived=False)
        return queryset

    def perform_create(self, serializer):
        product = serializer.save()
        log_audit_event(
            request=self.request,
            action="product_create",
            module="inventory",
            description=f"Created product {product.name} ({product.sku}).",
            target=product,
        )

    def perform_update(self, serializer):
        product = serializer.save()
        log_audit_event(
            request=self.request,
            action="product_update",
            module="inventory",
            description=f"Updated product {product.name} ({product.sku}).",
            target=product,
            metadata={
                "current_stock": product.current_stock,
                "minimum_stock": product.minimum_stock,
                "is_archived": product.is_archived,
            },
        )

    @action(detail=True, methods=["post"], url_path="archive")
    def archive(self, request, pk=None):
        product = self.get_object()
        product.is_archived = True
        product.status = Product.Status.INACTIVE
        product.save(update_fields=["is_archived", "status", "updated_at"])
        log_audit_event(
            request=request,
            action="product_archive",
            module="inventory",
            description=f"Archived product {product.name} ({product.sku}).",
            target=product,
        )
        return Response(ProductSerializer(product).data)

    @action(detail=True, methods=["post"], url_path="unarchive")
    def unarchive(self, request, pk=None):
        product = self.get_object()
        product.is_archived = False
        if product.status == Product.Status.INACTIVE:
            product.status = Product.Status.ACTIVE
        product.save(update_fields=["is_archived", "status", "updated_at"])
        log_audit_event(
            request=request,
            action="product_unarchive",
            module="inventory",
            description=f"Unarchived product {product.name} ({product.sku}).",
            target=product,
        )
        return Response(ProductSerializer(product).data)

    def perform_destroy(self, instance):
        product_name = instance.name
        product_sku = instance.sku
        force_delete_product(instance)
        log_audit_event(
            request=self.request,
            action="product_force_delete",
            module="inventory",
            description=f"SuperAdmin permanently deleted product {product_name} ({product_sku}).",
            metadata={"sku": product_sku},
        )

    @action(detail=True, methods=["post"], url_path="force-delete")
    def force_delete(self, request, pk=None):
        product = self.get_object()
        product_name = product.name
        product_sku = product.sku
        force_delete_product(product)
        log_audit_event(
            request=request,
            action="product_force_delete",
            module="inventory",
            description=f"SuperAdmin permanently deleted product {product_name} ({product_sku}).",
            metadata={"sku": product_sku},
        )
        return Response({"status": "deleted", "sku": product_sku}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], url_path="purge-history")
    def purge_history(self, request, pk=None):
        product = self.get_object()
        deleted_count = purge_product_history(product)
        log_audit_event(
            request=request,
            action="product_history_purge",
            module="inventory",
            description=f"SuperAdmin purged {deleted_count} stock movement record(s) for {product.name}.",
            target=product,
            metadata={"deleted_count": deleted_count},
        )
        return Response({"deleted_count": deleted_count}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], url_path="history")
    def history(self, request, pk=None):
        product = self.get_object()
        movements = product.stock_movements.all()[:200]
        serializer = StockMovementSerializer(movements, many=True)
        return Response({"count": len(serializer.data), "results": serializer.data})

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        queryset = self.get_queryset().filter(current_stock__lte=F("minimum_stock"), status=Product.Status.ACTIVE)
        serializer = self.get_serializer(queryset, many=True)
        return Response({"count": queryset.count(), "results": serializer.data})

    @action(detail=False, methods=["post"], url_path="seed-catalogue")
    def seed_catalogue(self, request):
        overwrite = str(request.data.get("overwrite", "")).lower() in {"1", "true", "yes"}
        result = seed_catalogue_items(overwrite=overwrite)

        log_audit_event(
            request=request,
            action="catalogue_seed",
            module="inventory",
            description="Seeded default medical catalogue items for ordering.",
            metadata={
                "created_categories": result["created_categories"],
                "created_products": result["created_products"],
                "updated_products": result.get("updated_products", 0),
                "existing_products": result["existing_products"],
                "overwrite": overwrite,
            },
        )

        return Response(result, status=status.HTTP_200_OK)


class StockReceiptViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = StockReceipt.objects.select_related("product", "supplier", "received_by").all()
    serializer_class = StockReceiptSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "inventory.stock_receiving"}
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StockReceiptFilterSet
    search_fields = ["invoice_number", "product__name", "product__sku", "supplier__name", "batch_number"]
    ordering_fields = ["date_received", "created_at", "quantity", "purchase_price"]

    @action(detail=False, methods=["post"], url_path="bulk-receive")
    def bulk_receive(self, request):
        payload = request.data
        invoice_number = str(payload.get("invoice_number") or "").strip()
        date_received = payload.get("date_received")
        supplier_id = payload.get("supplier")
        notes = str(payload.get("notes") or "").strip()
        additional_expenses = payload.get("additional_expenses") or 0
        items = payload.get("items") or []

        if not invoice_number:
            return Response({"detail": "invoice_number is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not date_received:
            return Response({"detail": "date_received is required."}, status=status.HTTP_400_BAD_REQUEST)
        if not isinstance(items, list) or not items:
            return Response({"detail": "items must contain at least one product line."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            batch = StockReceiptBatch.objects.create(
                supplier_id=supplier_id if supplier_id else None,
                invoice_number=invoice_number,
                date_received=date_received,
                additional_expenses=additional_expenses,
                received_by=request.user if request.user.is_authenticated else None,
                notes=notes,
            )
            created_records = []
            for item in items:
                serializer = self.get_serializer(
                    data={
                        "supplier": supplier_id,
                        "invoice_number": invoice_number,
                        "product": item.get("product"),
                        "quantity": item.get("quantity"),
                        "purchase_price": item.get("purchase_price"),
                        "batch_number": item.get("batch_number") or "",
                        "date_received": date_received,
                        "notes": item.get("notes") or notes,
                        "receipt_batch": batch.id,
                    }
                )
                serializer.is_valid(raise_exception=True)
                receipt = serializer.save(receipt_batch=batch)
                created_records.append(receipt)

        log_audit_event(
            request=request,
            action="stock_receipt_bulk_create",
            module="inventory",
            description=f"Recorded bulk stock receiving for invoice {invoice_number} ({len(created_records)} lines).",
            target=batch,
            metadata={"items_count": len(created_records)},
        )
        NotificationService.send(
            title="New Inventory Received (Bulk)",
            message=(
                f"Invoice {invoice_number} recorded with {len(created_records)} product lines. "
                f"Supplier: {(batch.supplier.name if batch.supplier else 'N/A')}. "
                f"Received by: {(batch.received_by.email if batch.received_by else 'N/A')}. Date: {batch.date_received}."
            ),
            event_code="inventory.new_receipt_bulk",
            notification_type=Notification.NotificationType.INVENTORY,
            priority=Notification.Priority.MEDIUM,
            ui_type=Notification.Type.INFO,
            dedup_key=f"stock-receipt-batch-{batch.id}",
            related_module="inventory",
            reference_id=str(batch.id),
            source_model="inventory.stockreceiptbatch",
            source_id=batch.id,
            created_by=request.user,
        )
        for receipt in created_records:
            _notify_low_stock_if_needed(request=request, product=receipt.product)
        return Response(
            {
                "batch_id": batch.id,
                "invoice_number": batch.invoice_number,
                "count": len(created_records),
                "results": StockReceiptSerializer(created_records, many=True).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def perform_create(self, serializer):
        receipt = serializer.save()
        log_audit_event(
            request=self.request,
            action="stock_receipt_create",
            module="inventory",
            description=f"Recorded stock receipt {receipt.invoice_number} for {receipt.product.name}.",
            target=receipt,
            metadata={"quantity": receipt.quantity},
        )
        NotificationService.send(
            title="New Inventory Received",
            message=(
                f"Product: {receipt.product.name}. Quantity: {receipt.quantity}. "
                f"Supplier: {(receipt.supplier.name if receipt.supplier else 'N/A')}. Received by: {(receipt.received_by.email if receipt.received_by else 'N/A')}. "
                f"Date: {receipt.date_received}."
            ),
            event_code="inventory.new_receipt",
            notification_type=Notification.NotificationType.INVENTORY,
            priority=Notification.Priority.MEDIUM,
            ui_type=Notification.Type.INFO,
            dedup_key=f"stock-receipt-{receipt.id}",
            related_module="inventory",
            reference_id=str(receipt.id),
            source_model="inventory.stockreceipt",
            source_id=receipt.id,
            created_by=self.request.user,
        )
        _notify_low_stock_if_needed(request=self.request, product=receipt.product)


class StockTransferViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = StockTransfer.objects.select_related("product", "sold_by").all()
    serializer_class = StockTransferSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "inventory.stock_transfers"}
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StockTransferFilterSet
    search_fields = ["destination", "customer", "product__name", "product__sku"]
    ordering_fields = ["date", "created_at", "quantity", "selling_price"]

    def perform_create(self, serializer):
        transfer = serializer.save()
        log_audit_event(
            request=self.request,
            action="stock_transfer_create",
            module="inventory",
            description=f"Recorded stock transfer for {transfer.product.name} to {transfer.destination}.",
            target=transfer,
            metadata={"quantity": transfer.quantity},
        )


class StockAdjustmentViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = StockAdjustment.objects.select_related("product", "adjusted_by").all()
    serializer_class = StockAdjustmentSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "inventory.stock_adjustments"}
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StockAdjustmentFilterSet
    search_fields = ["reason", "operation", "product__name", "product__sku", "notes"]
    ordering_fields = ["date", "created_at", "quantity"]

    def perform_create(self, serializer):
        source_product = serializer.validated_data["product"]
        old_stock = source_product.current_stock
        adjustment = serializer.save()
        adjustment.product.refresh_from_db(fields=["current_stock", "minimum_stock"])
        new_stock = adjustment.product.current_stock
        log_audit_event(
            request=self.request,
            action="stock_adjustment_create",
            module="inventory",
            description=f"Recorded stock adjustment ({adjustment.reason}) for {adjustment.product.name}.",
            target=adjustment,
            metadata={"operation": adjustment.operation, "quantity": adjustment.quantity},
        )
        NotificationService.send(
            title="Stock Adjustment Recorded",
            message=(
                f"Product: {adjustment.product.name}. Old quantity: {old_stock}. New quantity: {new_stock}. "
                f"Reason: {adjustment.reason}. Adjusted by: {(adjustment.adjusted_by.email if adjustment.adjusted_by else 'N/A')}."
            ),
            event_code="inventory.stock_adjustment",
            notification_type=Notification.NotificationType.INVENTORY,
            priority=Notification.Priority.MEDIUM,
            ui_type=Notification.Type.WARNING,
            dedup_key=f"stock-adjustment-{adjustment.id}",
            related_module="inventory",
            reference_id=str(adjustment.id),
            source_model="inventory.stockadjustment",
            source_id=adjustment.id,
            created_by=self.request.user,
        )
        _notify_low_stock_if_needed(request=self.request, product=adjustment.product)
