from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers

from .models import Sale


def generate_invoice_number():
    return f"INV-{timezone.now().strftime('%Y%m%d-%H%M%S-%f')[:-3]}"


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    salesperson_email = serializers.CharField(source="salesperson.email", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "invoice_number",
            "customer",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "price",
            "discount",
            "tax",
            "total",
            "cost_price",
            "profit",
            "salesperson",
            "salesperson_email",
            "date",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "total", "profit", "created_at", "updated_at", "salesperson"]

    def validate_invoice_number(self, value):
        if value:
            return value.strip()
        return value

    def create(self, validated_data):
        if not validated_data.get("invoice_number"):
            validated_data["invoice_number"] = generate_invoice_number()

        request = self.context.get("request")
        if request and request.user and request.user.is_authenticated:
            validated_data["salesperson"] = request.user

        try:
            return super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)


class CustomerRecordSerializer(serializers.Serializer):
    customer = serializers.CharField()
    total_sales = serializers.DecimalField(max_digits=14, decimal_places=2)
    sale_count = serializers.IntegerField()
    latest_sale_date = serializers.DateField(allow_null=True)
