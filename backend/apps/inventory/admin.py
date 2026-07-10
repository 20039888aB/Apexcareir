from django.contrib import admin
from .models import Product, ProductCategory, StockAdjustment, StockMovement, StockReceipt, StockReceiptBatch, StockTransfer


@admin.register(ProductCategory)
class ProductCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "created_at")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "barcode", "category", "current_stock", "minimum_stock", "status", "is_archived")
    list_filter = ("status", "category", "is_archived")
    search_fields = ("name", "sku", "barcode", "brand", "model_name")


@admin.register(StockReceipt)
class StockReceiptAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "product", "supplier", "quantity", "purchase_price", "date_received", "receipt_batch")
    list_filter = ("date_received", "supplier")
    search_fields = ("invoice_number", "product__name", "product__sku")


@admin.register(StockTransfer)
class StockTransferAdmin(admin.ModelAdmin):
    list_display = ("product", "quantity", "destination", "customer", "selling_price", "date")
    list_filter = ("date", "destination")
    search_fields = ("product__name", "product__sku", "destination", "customer")


@admin.register(StockAdjustment)
class StockAdjustmentAdmin(admin.ModelAdmin):
    list_display = ("product", "reason", "operation", "quantity", "date")
    list_filter = ("reason", "operation", "date")
    search_fields = ("product__name", "product__sku", "notes")


@admin.register(StockReceiptBatch)
class StockReceiptBatchAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "supplier", "date_received", "received_by")
    list_filter = ("date_received", "supplier")
    search_fields = ("invoice_number",)


@admin.register(StockMovement)
class StockMovementAdmin(admin.ModelAdmin):
    list_display = ("product", "movement_type", "quantity_change", "event_date", "reference_model", "reference_id")
    list_filter = ("movement_type", "event_date")
    search_fields = ("product__name", "product__sku", "reference_label", "note")
