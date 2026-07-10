from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.db.models import F
from django.apps import apps

from apps.inventory.models import Product


class Customer(models.Model):
    customer_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    logo = models.ImageField(upload_to="customers/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="customers_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["customer_number"]),
            models.Index(fields=["name"]),
            models.Index(fields=["email"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.customer_number or 'unnumbered'})"


class Invoice(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        ISSUED = "issued", "Issued"
        PAID = "paid", "Paid"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        CANCELLED = "cancelled", "Cancelled"

    class PaymentStatus(models.TextChoices):
        UNPAID = "unpaid", "Unpaid"
        PARTIALLY_PAID = "partially_paid", "Partially Paid"
        PAID = "paid", "Paid"

    invoice_number = models.CharField(max_length=100, unique=True)
    sale = models.OneToOneField("Sale", on_delete=models.CASCADE, related_name="invoice_record")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name="invoices")
    customer_name = models.CharField(max_length=255)
    customer_company = models.CharField(max_length=255, blank=True)
    customer_phone = models.CharField(max_length=50, blank=True)
    customer_email = models.EmailField(blank=True)
    customer_address = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ISSUED)
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.UNPAID)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pdf_file = models.FileField(upload_to="invoices/", null=True, blank=True)
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices_generated",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoices_updated",
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    invoice_date = models.DateField()
    notes = models.TextField(blank=True)
    pdf_generated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-invoice_date", "-created_at"]
        indexes = [
            models.Index(fields=["invoice_number"]),
            models.Index(fields=["status"]),
            models.Index(fields=["payment_status"]),
            models.Index(fields=["invoice_date"]),
        ]

    def __str__(self):
        return self.invoice_number

    @property
    def balance_due(self):
        return max(self.grand_total - (self.amount_paid or Decimal("0")), Decimal("0"))


class InvoiceLineItem(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="line_items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="invoice_line_items")
    description = models.CharField(max_length=255, blank=True)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    sort_order = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["sort_order", "id"]

    def __str__(self):
        return f"{self.invoice.invoice_number} · {self.product.sku} x {self.quantity}"

    def compute_line_total(self):
        subtotal = Decimal(self.quantity) * self.unit_price
        self.line_total = subtotal - self.discount + self.tax
        return self.line_total


class InvoicePayment(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        MPESA = "mpesa", "M-Pesa"
        BANK = "bank", "Bank Transfer"
        CARD = "card", "Card"
        OTHER = "other", "Other"

    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="invoice_payments_recorded",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]

    def __str__(self):
        return f"{self.invoice.invoice_number} · {self.amount}"


class Sale(models.Model):
    sale_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    invoice_number = models.CharField(max_length=100, unique=True)
    customer = models.CharField(max_length=255)
    customer_record = models.ForeignKey(
        Customer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales",
    )
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="sales")
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=12, decimal_places=2)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    salesperson = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="sales_made",
        null=True,
        blank=True,
    )
    date = models.DateField()
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_created",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sales_updated",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["invoice_number"]),
            models.Index(fields=["sale_number"]),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.product.sku}"

    def _compute_financials(self):
        subtotal = Decimal(self.quantity) * self.price
        self.total = subtotal - self.discount + self.tax
        self.profit = self.total - (Decimal(self.quantity) * self.cost_price)

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        self._compute_financials()

        with transaction.atomic():
            if self.pk:
                previous = Sale.objects.select_for_update().get(pk=self.pk)
                previous_product = Product.objects.select_for_update().get(pk=previous.product_id)
                previous_product.current_stock = F("current_stock") + previous.quantity
                previous_product.save(update_fields=["current_stock"])

            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.refresh_from_db(fields=["current_stock"])
            if locked_product.current_stock < self.quantity:
                raise ValidationError({"quantity": "Insufficient stock for this sale."})

            locked_product.current_stock = F("current_stock") - self.quantity
            locked_product.save(update_fields=["current_stock"])
            super().save(*args, **kwargs)
            if is_create:
                StockMovement = apps.get_model("inventory", "StockMovement")
                StockMovement.objects.create(
                    product=self.product,
                    movement_type=StockMovement.Type.SALE,
                    quantity_change=-self.quantity,
                    reference_model="sales.sale",
                    reference_id=str(self.pk),
                    reference_label=self.invoice_number,
                    event_date=self.date,
                    note=f"Sale to {self.customer}",
                )

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.current_stock = F("current_stock") + self.quantity
            locked_product.save(update_fields=["current_stock"])
            StockMovement = apps.get_model("inventory", "StockMovement")
            StockMovement.objects.create(
                product=self.product,
                movement_type=StockMovement.Type.RETURN,
                quantity_change=self.quantity,
                reference_model="sales.sale",
                reference_id=str(self.pk),
                reference_label=f"Delete {self.invoice_number}",
                event_date=self.date,
                note="Sale deleted",
            )
            return super().delete(*args, **kwargs)
