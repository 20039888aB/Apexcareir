from rest_framework import serializers

from apps.inventory.models import StockReceipt

from .models import Supplier


class SupplierSerializer(serializers.ModelSerializer):
    purchase_count = serializers.IntegerField(read_only=True)
    total_items_received = serializers.IntegerField(read_only=True)
    total_purchase_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    last_purchase_date = serializers.DateField(read_only=True)

    class Meta:
        model = Supplier
        fields = [
            "id",
            "name",
            "contact_person",
            "phone",
            "email",
            "address",
            "products_supplied",
            "is_active",
            "created_at",
            "updated_at",
            "purchase_count",
            "total_items_received",
            "total_purchase_amount",
            "last_purchase_date",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SupplierInvoiceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "invoice_number",
            "product",
            "product_name",
            "supplier",
            "supplier_name",
            "quantity",
            "purchase_price",
            "batch_number",
            "date_received",
            "notes",
            "created_at",
        ]
