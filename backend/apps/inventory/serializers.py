from rest_framework import serializers

from .models import Product, ProductCategory, StockAdjustment, StockMovement, StockReceipt, StockTransfer


class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ["id", "name", "description", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProductSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    is_low_stock = serializers.SerializerMethodField()
    availability_status = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "sku",
            "barcode",
            "category",
            "category_name",
            "brand",
            "model_name",
            "supplier",
            "supplier_name",
            "unit",
            "purchase_price",
            "selling_price",
            "current_stock",
            "minimum_stock",
            "is_low_stock",
            "availability_status",
            "description",
            "status",
            "is_archived",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_low_stock(self, obj):
        return obj.current_stock <= obj.minimum_stock

    def get_availability_status(self, obj):
        if obj.is_archived or obj.status in {Product.Status.INACTIVE, Product.Status.DISCONTINUED}:
            return "unavailable"
        if obj.current_stock <= 0:
            return "out_of_stock"
        if obj.current_stock <= obj.minimum_stock:
            return "low_stock"
        return "in_stock"


class StockReceiptSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    received_by_email = serializers.CharField(source="received_by.email", read_only=True)
    batch_additional_expenses = serializers.SerializerMethodField()

    class Meta:
        model = StockReceipt
        fields = [
            "id",
            "supplier",
            "supplier_name",
            "invoice_number",
            "product",
            "product_name",
            "quantity",
            "purchase_price",
            "batch_number",
            "date_received",
            "received_by",
            "received_by_email",
            "batch_additional_expenses",
            "notes",
            "created_at",
            "updated_at",
            "receipt_batch",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "received_by"]

    def get_batch_additional_expenses(self, obj):
        if obj.receipt_batch_id and obj.receipt_batch:
            return obj.receipt_batch.additional_expenses
        return "0.00"

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["received_by"] = request.user
        return super().create(validated_data)


class StockTransferSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sold_by_email = serializers.CharField(source="sold_by.email", read_only=True)

    class Meta:
        model = StockTransfer
        fields = [
            "id",
            "product",
            "product_name",
            "quantity",
            "destination",
            "customer",
            "selling_price",
            "date",
            "sold_by",
            "sold_by_email",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "sold_by"]

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["sold_by"] = request.user
        return super().create(validated_data)


class StockAdjustmentSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    adjusted_by_email = serializers.CharField(source="adjusted_by.email", read_only=True)

    class Meta:
        model = StockAdjustment
        fields = [
            "id",
            "product",
            "product_name",
            "reason",
            "operation",
            "quantity",
            "date",
            "adjusted_by",
            "adjusted_by_email",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "adjusted_by"]

    def validate(self, attrs):
        reason = attrs.get("reason")
        operation = attrs.get("operation")
        reason_to_default_operation = {
            StockAdjustment.Reason.DAMAGED: StockAdjustment.Operation.DECREASE,
            StockAdjustment.Reason.LOST: StockAdjustment.Operation.DECREASE,
            StockAdjustment.Reason.EXPIRED: StockAdjustment.Operation.DECREASE,
            StockAdjustment.Reason.RETURNED: StockAdjustment.Operation.INCREASE,
        }
        expected_operation = reason_to_default_operation.get(reason)
        if expected_operation and operation != expected_operation:
            raise serializers.ValidationError(
                {"operation": f"Operation for reason '{reason}' must be '{expected_operation}'."}
            )
        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["adjusted_by"] = request.user
        return super().create(validated_data)


class StockMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = StockMovement
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "movement_type",
            "quantity_change",
            "reference_model",
            "reference_id",
            "reference_label",
            "event_date",
            "note",
            "created_at",
        ]
        read_only_fields = fields
