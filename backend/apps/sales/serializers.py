from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.common.services.numbering import allocate_document_number
from apps.common.services.timeline import log_transaction_event

from .models import Customer, Invoice, InvoiceLineItem, InvoicePayment, Sale
from .services.invoice_service import (
    create_invoice_for_sale,
    create_manual_invoice,
    email_invoice_to_customer,
    get_or_create_customer,
    update_invoice_record,
)
from .services.payment_service import record_invoice_payment


class CustomerSerializer(serializers.ModelSerializer):
    created_by_email = serializers.EmailField(source="created_by.email", read_only=True)
    logo_url = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            "id",
            "customer_number",
            "name",
            "company_name",
            "phone",
            "email",
            "address",
            "logo",
            "logo_url",
            "is_active",
            "created_by",
            "created_by_email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "customer_number", "logo_url", "created_by", "created_at", "updated_at"]

    def get_logo_url(self, obj):
        if not obj.logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.logo.url)
        return obj.logo.url


class CustomerDetailSerializer(CustomerSerializer):
    total_invoices = serializers.IntegerField(read_only=True)
    total_spent = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    latest_invoice_date = serializers.DateField(read_only=True, allow_null=True)

    class Meta(CustomerSerializer.Meta):
        fields = CustomerSerializer.Meta.fields + [
            "total_invoices",
            "total_spent",
            "latest_invoice_date",
        ]
        read_only_fields = CustomerSerializer.Meta.read_only_fields + [
            "total_invoices",
            "total_spent",
            "latest_invoice_date",
        ]


class InvoiceLineItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = InvoiceLineItem
        fields = [
            "id",
            "product",
            "product_name",
            "product_sku",
            "description",
            "quantity",
            "unit_price",
            "cost_price",
            "discount",
            "tax",
            "line_total",
            "sort_order",
        ]
        read_only_fields = fields


class InvoicePaymentSerializer(serializers.ModelSerializer):
    recorded_by_email = serializers.EmailField(source="recorded_by.email", read_only=True)

    class Meta:
        model = InvoicePayment
        fields = [
            "id",
            "amount",
            "payment_date",
            "payment_method",
            "reference",
            "notes",
            "recorded_by",
            "recorded_by_email",
            "created_at",
        ]
        read_only_fields = ["id", "recorded_by", "recorded_by_email", "created_at"]


class InvoiceLineInputSerializer(serializers.Serializer):
    product = serializers.IntegerField()
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2)
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class InvoiceSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="sale.product.name", read_only=True)
    product_sku = serializers.CharField(source="sale.product.sku", read_only=True)
    product = serializers.IntegerField(source="sale.product_id", read_only=True)
    quantity = serializers.IntegerField(source="sale.quantity", read_only=True)
    unit_price = serializers.DecimalField(source="sale.price", max_digits=12, decimal_places=2, read_only=True)
    cost_price = serializers.DecimalField(source="sale.cost_price", max_digits=12, decimal_places=2, read_only=True)
    sale_number = serializers.CharField(source="sale.sale_number", read_only=True)
    generated_by_email = serializers.CharField(source="generated_by.email", read_only=True)
    customer_logo_url = serializers.SerializerMethodField()
    has_stored_pdf = serializers.SerializerMethodField()
    pdf_url = serializers.SerializerMethodField()
    line_items = InvoiceLineItemSerializer(many=True, read_only=True)
    payments = InvoicePaymentSerializer(many=True, read_only=True)
    balance_due = serializers.SerializerMethodField()
    line_count = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "sale",
            "sale_number",
            "customer",
            "customer_name",
            "customer_company",
            "customer_phone",
            "customer_email",
            "customer_address",
            "customer_logo_url",
            "status",
            "payment_status",
            "amount_paid",
            "balance_due",
            "subtotal",
            "discount",
            "tax",
            "grand_total",
            "product",
            "product_name",
            "product_sku",
            "quantity",
            "unit_price",
            "cost_price",
            "line_items",
            "line_count",
            "payments",
            "has_stored_pdf",
            "pdf_url",
            "pdf_generated_at",
            "generated_by",
            "generated_by_email",
            "issued_at",
            "paid_at",
            "invoice_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_line_count(self, obj):
        count = obj.line_items.count()
        return count or 1

    def get_balance_due(self, obj):
        return obj.balance_due

    def get_has_stored_pdf(self, obj):
        return bool(obj.pdf_file)

    def get_customer_logo_url(self, obj):
        if not obj.customer or not obj.customer.logo:
            return None
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.customer.logo.url)
        return obj.customer.logo.url

    def get_pdf_url(self, obj):
        request = self.context.get("request")
        if not obj.pdf_file:
            return None
        if request:
            return request.build_absolute_uri(obj.pdf_file.url)
        return obj.pdf_file.url


class InvoiceWriteSerializer(serializers.Serializer):
    customer_name = serializers.CharField(max_length=255)
    customer_id = serializers.IntegerField(required=False, allow_null=True)
    customer_company = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    customer_phone = serializers.CharField(max_length=50, required=False, allow_blank=True, default="")
    customer_email = serializers.EmailField(required=False, allow_blank=True, default="")
    customer_address = serializers.CharField(required=False, allow_blank=True, default="")
    customer_logo = serializers.ImageField(required=False, allow_null=True)
    lines = InvoiceLineInputSerializer(many=True, required=False)
    product = serializers.IntegerField(required=False)
    quantity = serializers.IntegerField(min_value=1, required=False)
    unit_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    cost_price = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    tax = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0)
    invoice_date = serializers.DateField(required=False)
    status = serializers.ChoiceField(choices=Invoice.Status.choices, required=False)
    payment_status = serializers.ChoiceField(choices=Invoice.PaymentStatus.choices, required=False)
    notes = serializers.CharField(required=False, allow_blank=True, default="")

    def run_validation(self, data=serializers.empty):
        if data is not serializers.empty and hasattr(data, "get"):
            payload = data.copy() if hasattr(data, "copy") else dict(data)
            lines_value = payload.get("lines")
            if isinstance(lines_value, str) and lines_value.strip():
                import json

                payload["lines"] = json.loads(lines_value)
            data = payload
        return super().run_validation(data)

    def validate(self, attrs):
        if self.instance is None:
            lines = attrs.get("lines") or []
            if not lines:
                missing = [field for field in ("product", "quantity", "unit_price") if field not in attrs]
                if missing:
                    raise serializers.ValidationError(
                        {field: "Provide lines[] or product, quantity, and unit_price." for field in missing}
                    )
        return attrs

    def validate_product(self, value):
        from apps.inventory.models import Product

        if value is None:
            return value
        if not Product.objects.filter(pk=value).exists():
            raise serializers.ValidationError("Product not found.")
        return value

    def create(self, validated_data):
        from apps.inventory.models import Product

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        customer_logo = validated_data.pop("customer_logo", None)
        customer_id = validated_data.pop("customer_id", None)
        lines = validated_data.pop("lines", None)
        product_id = validated_data.pop("product", None)
        product = Product.objects.get(pk=product_id) if product_id else None

        invoice = create_manual_invoice(
            user=user,
            customer_name=validated_data["customer_name"],
            customer_company=validated_data.get("customer_company", ""),
            customer_phone=validated_data.get("customer_phone", ""),
            customer_email=validated_data.get("customer_email", ""),
            customer_address=validated_data.get("customer_address", ""),
            customer_logo=customer_logo,
            customer_id=customer_id,
            product=product,
            quantity=validated_data.get("quantity"),
            unit_price=validated_data.get("unit_price"),
            cost_price=validated_data.get("cost_price", product.purchase_price if product else None),
            discount=validated_data.get("discount", 0),
            tax=validated_data.get("tax", 0),
            lines=lines,
            invoice_date=validated_data.get("invoice_date"),
            status=validated_data.get("status", Invoice.Status.DRAFT),
            payment_status=validated_data.get("payment_status", Invoice.PaymentStatus.UNPAID),
            notes=validated_data.get("notes", ""),
        )
        return invoice

    def update(self, instance, validated_data):
        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None
        customer_logo = validated_data.pop("customer_logo", None)
        try:
            return update_invoice_record(instance, user=user, validated_data=validated_data, customer_logo=customer_logo)
        except Exception as exc:
            from django.core.exceptions import ValidationError as DjangoValidationError

            if isinstance(exc, DjangoValidationError):
                raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)
            raise


class InvoicePaymentWriteSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_date = serializers.DateField(required=False)
    payment_method = serializers.ChoiceField(choices=InvoicePayment.PaymentMethod.choices, required=False)
    reference = serializers.CharField(required=False, allow_blank=True, default="")
    notes = serializers.CharField(required=False, allow_blank=True, default="")


class SaleSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_sku = serializers.CharField(source="product.sku", read_only=True)
    salesperson_email = serializers.CharField(source="salesperson.email", read_only=True)
    customer_phone = serializers.CharField(write_only=True, required=False, allow_blank=True)
    customer_email = serializers.EmailField(write_only=True, required=False, allow_blank=True)
    customer_address = serializers.CharField(write_only=True, required=False, allow_blank=True)
    customer_company = serializers.CharField(write_only=True, required=False, allow_blank=True)
    customer_logo = serializers.ImageField(write_only=True, required=False, allow_null=True)
    invoice_id = serializers.IntegerField(source="invoice_record.id", read_only=True)
    invoice_status = serializers.CharField(source="invoice_record.status", read_only=True)
    payment_status = serializers.CharField(source="invoice_record.payment_status", read_only=True)

    class Meta:
        model = Sale
        fields = [
            "id",
            "sale_number",
            "invoice_number",
            "invoice_id",
            "invoice_status",
            "payment_status",
            "customer",
            "customer_record",
            "customer_phone",
            "customer_email",
            "customer_address",
            "customer_company",
            "customer_logo",
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
        read_only_fields = [
            "id",
            "sale_number",
            "invoice_number",
            "invoice_id",
            "invoice_status",
            "payment_status",
            "customer_record",
            "total",
            "profit",
            "created_at",
            "updated_at",
            "salesperson",
        ]

    def create(self, validated_data):
        customer_phone = validated_data.pop("customer_phone", "")
        customer_email = validated_data.pop("customer_email", "")
        customer_address = validated_data.pop("customer_address", "")
        customer_company = validated_data.pop("customer_company", "")
        customer_logo = validated_data.pop("customer_logo", None)

        request = self.context.get("request")
        user = request.user if request and request.user.is_authenticated else None

        customer_record = get_or_create_customer(
            name=validated_data["customer"],
            user=user,
            phone=customer_phone,
            email=customer_email,
            address=customer_address,
            company_name=customer_company,
            logo=customer_logo,
        )
        validated_data["customer_record"] = customer_record
        validated_data["sale_number"] = allocate_document_number("sale")
        validated_data["invoice_number"] = allocate_document_number("invoice")
        if user:
            validated_data["salesperson"] = user
            validated_data["created_by"] = user
            validated_data["updated_by"] = user

        try:
            sale = super().create(validated_data)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict if hasattr(exc, "message_dict") else exc.messages)

        create_invoice_for_sale(sale, user=user)

        log_transaction_event(
            module="sales",
            reference_number=sale.sale_number,
            reference_id=sale.id,
            event_type="created",
            description=f"Sale {sale.sale_number} recorded for {sale.customer}.",
            user=user,
        )
        return sale


class CustomerRecordSerializer(serializers.Serializer):
    customer = serializers.CharField()
    customer_number = serializers.CharField(allow_blank=True)
    customer_id = serializers.IntegerField(allow_null=True)
    total_sales = serializers.DecimalField(max_digits=14, decimal_places=2)
    sale_count = serializers.IntegerField()
    latest_sale_date = serializers.DateField(allow_null=True)
