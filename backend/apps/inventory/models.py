from django.db import models
from django.db.models import F
from django.db import transaction
from django.conf import settings
from django.core.exceptions import ValidationError

from apps.suppliers.models import Supplier


class ProductCategory(models.Model):
    name = models.CharField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]
        verbose_name_plural = "Product categories"

    def __str__(self):
        return self.name


class Product(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"
        DISCONTINUED = "discontinued", "Discontinued"

    name = models.CharField(max_length=255)
    product_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    sku = models.CharField(max_length=100, unique=True)
    barcode = models.CharField(max_length=120, blank=True)
    category = models.ForeignKey(
        ProductCategory,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
    )
    brand = models.CharField(max_length=120, blank=True)
    model_name = models.CharField(max_length=120, blank=True)
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        related_name="products",
        null=True,
        blank=True,
    )
    unit = models.CharField(max_length=50, default="pcs")
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_stock = models.PositiveIntegerField(default=0)
    minimum_stock = models.PositiveIntegerField(default=0)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    is_archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["sku"]),
            models.Index(fields=["barcode"]),
            models.Index(fields=["name"]),
            models.Index(fields=["status"]),
            models.Index(fields=["is_archived"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"


class StockReceipt(models.Model):
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        related_name="stock_receipts",
        null=True,
        blank=True,
    )
    invoice_number = models.CharField(max_length=100)
    receipt_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="stock_receipts")
    quantity = models.PositiveIntegerField()
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    batch_number = models.CharField(max_length=100, blank=True)
    date_received = models.DateField()
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="received_stock",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    receipt_batch = models.ForeignKey(
        "StockReceiptBatch",
        on_delete=models.SET_NULL,
        related_name="receipts",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["-date_received", "-created_at"]
        indexes = [
            models.Index(fields=["date_received"]),
            models.Index(fields=["invoice_number"]),
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.product.sku}"

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        with transaction.atomic():
            if self.pk:
                previous = StockReceipt.objects.select_for_update().get(pk=self.pk)
                previous_product = Product.objects.select_for_update().get(pk=previous.product_id)
                previous_product.current_stock = F("current_stock") - previous.quantity
                previous_product.save(update_fields=["current_stock"])

            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.current_stock = F("current_stock") + self.quantity
            locked_product.save(update_fields=["current_stock"])
            super().save(*args, **kwargs)
            if is_create:
                StockMovement.objects.create(
                    product=self.product,
                    movement_type=StockMovement.Type.RECEIVED,
                    quantity_change=self.quantity,
                    reference_model="inventory.stockreceipt",
                    reference_id=str(self.pk),
                    reference_label=self.invoice_number,
                    event_date=self.date_received,
                    note=self.notes,
                )
            else:
                updated = StockMovement.objects.filter(
                    reference_model="inventory.stockreceipt",
                    reference_id=str(self.pk),
                    movement_type=StockMovement.Type.RECEIVED,
                ).update(
                    quantity_change=self.quantity,
                    reference_label=self.invoice_number,
                    event_date=self.date_received,
                    note=self.notes,
                    product=self.product,
                )
                if not updated:
                    StockMovement.objects.create(
                        product=self.product,
                        movement_type=StockMovement.Type.RECEIVED,
                        quantity_change=self.quantity,
                        reference_model="inventory.stockreceipt",
                        reference_id=str(self.pk),
                        reference_label=self.invoice_number,
                        event_date=self.date_received,
                        note=self.notes,
                    )

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.current_stock = F("current_stock") - self.quantity
            locked_product.save(update_fields=["current_stock"])
            StockMovement.objects.create(
                product=self.product,
                movement_type=StockMovement.Type.ADJUSTMENT,
                quantity_change=-self.quantity,
                reference_model="inventory.stockreceipt",
                reference_id=str(self.pk),
                reference_label=f"Delete receipt {self.invoice_number}",
                event_date=self.date_received,
                note="Stock receipt deleted",
            )
            return super().delete(*args, **kwargs)


class StockReceiptBatch(models.Model):
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.SET_NULL,
        related_name="stock_receipt_batches",
        null=True,
        blank=True,
    )
    invoice_number = models.CharField(max_length=100)
    receipt_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    date_received = models.DateField()
    additional_expenses = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    received_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="received_stock_batches",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_received", "-created_at"]
        indexes = [
            models.Index(fields=["invoice_number"]),
            models.Index(fields=["date_received"]),
        ]

    def __str__(self):
        return self.invoice_number


class StockTransfer(models.Model):
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="stock_transfers")
    quantity = models.PositiveIntegerField()
    destination = models.CharField(max_length=255)
    customer = models.CharField(max_length=255, blank=True)
    selling_price = models.DecimalField(max_digits=12, decimal_places=2)
    date = models.DateField()
    sold_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="stock_transfers_made",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["destination"]),
            models.Index(fields=["customer"]),
        ]

    def __str__(self):
        return f"{self.product.sku} -> {self.destination}"

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        with transaction.atomic():
            if self.pk:
                previous = StockTransfer.objects.select_for_update().get(pk=self.pk)
                previous_product = Product.objects.select_for_update().get(pk=previous.product_id)
                previous_product.current_stock = F("current_stock") + previous.quantity
                previous_product.save(update_fields=["current_stock"])

            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.refresh_from_db(fields=["current_stock"])
            if locked_product.current_stock < self.quantity:
                raise ValidationError({"quantity": "Insufficient stock for this transfer."})
            locked_product.current_stock = F("current_stock") - self.quantity
            locked_product.save(update_fields=["current_stock"])
            super().save(*args, **kwargs)
            if is_create:
                StockMovement.objects.create(
                    product=self.product,
                    movement_type=StockMovement.Type.SALE,
                    quantity_change=-self.quantity,
                    reference_model="inventory.stocktransfer",
                    reference_id=str(self.pk),
                    reference_label=self.destination,
                    event_date=self.date,
                    note=self.notes,
                )

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.current_stock = F("current_stock") + self.quantity
            locked_product.save(update_fields=["current_stock"])
            StockMovement.objects.create(
                product=self.product,
                movement_type=StockMovement.Type.RETURN,
                quantity_change=self.quantity,
                reference_model="inventory.stocktransfer",
                reference_id=str(self.pk),
                reference_label=f"Delete transfer {self.destination}",
                event_date=self.date,
                note="Stock transfer deleted",
            )
            return super().delete(*args, **kwargs)


class StockAdjustment(models.Model):
    class Reason(models.TextChoices):
        DAMAGED = "damaged", "Damaged"
        LOST = "lost", "Lost"
        EXPIRED = "expired", "Expired"
        CORRECTION = "correction", "Correction"
        RETURNED = "returned", "Returned"

    class Operation(models.TextChoices):
        INCREASE = "increase", "Increase"
        DECREASE = "decrease", "Decrease"

    adjustment_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="stock_adjustments")
    reason = models.CharField(max_length=20, choices=Reason.choices)
    operation = models.CharField(max_length=10, choices=Operation.choices)
    quantity = models.PositiveIntegerField()
    date = models.DateField()
    adjusted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name="stock_adjustments_made",
        null=True,
        blank=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["reason"]),
            models.Index(fields=["operation"]),
        ]

    def __str__(self):
        return f"{self.product.sku} - {self.reason} ({self.operation})"

    def save(self, *args, **kwargs):
        is_create = self.pk is None
        with transaction.atomic():
            if self.pk:
                previous = StockAdjustment.objects.select_for_update().get(pk=self.pk)
                previous_product = Product.objects.select_for_update().get(pk=previous.product_id)
                if previous.operation == self.Operation.INCREASE:
                    previous_product.current_stock = F("current_stock") - previous.quantity
                else:
                    previous_product.current_stock = F("current_stock") + previous.quantity
                previous_product.save(update_fields=["current_stock"])

            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            locked_product.refresh_from_db(fields=["current_stock"])

            if self.operation == self.Operation.DECREASE and locked_product.current_stock < self.quantity:
                raise ValidationError({"quantity": "Insufficient stock for this adjustment."})

            if self.operation == self.Operation.INCREASE:
                locked_product.current_stock = F("current_stock") + self.quantity
            else:
                locked_product.current_stock = F("current_stock") - self.quantity

            locked_product.save(update_fields=["current_stock"])
            super().save(*args, **kwargs)
            if is_create:
                direction = self.quantity if self.operation == self.Operation.INCREASE else -self.quantity
                movement_type = StockMovement.Type.RETURN if self.reason == self.Reason.RETURNED else StockMovement.Type.ADJUSTMENT
                StockMovement.objects.create(
                    product=self.product,
                    movement_type=movement_type,
                    quantity_change=direction,
                    reference_model="inventory.stockadjustment",
                    reference_id=str(self.pk),
                    reference_label=self.reason,
                    event_date=self.date,
                    note=self.notes,
                )

    def delete(self, *args, **kwargs):
        with transaction.atomic():
            locked_product = Product.objects.select_for_update().get(pk=self.product_id)
            if self.operation == self.Operation.INCREASE:
                locked_product.current_stock = F("current_stock") - self.quantity
            else:
                locked_product.current_stock = F("current_stock") + self.quantity
            locked_product.save(update_fields=["current_stock"])
            return super().delete(*args, **kwargs)


class StockMovement(models.Model):
    class Type(models.TextChoices):
        RECEIVED = "received", "Received"
        SALE = "sale", "Sale"
        ADJUSTMENT = "adjustment", "Adjustment"
        RETURN = "return", "Return"

    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="stock_movements")
    movement_type = models.CharField(max_length=20, choices=Type.choices)
    quantity_change = models.IntegerField()
    reference_model = models.CharField(max_length=120, blank=True)
    reference_id = models.CharField(max_length=64, blank=True)
    reference_label = models.CharField(max_length=160, blank=True)
    event_date = models.DateField()
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-event_date", "-created_at"]
        indexes = [
            models.Index(fields=["product", "event_date"]),
            models.Index(fields=["movement_type"]),
        ]

    def __str__(self):
        return f"{self.product.sku} {self.movement_type} {self.quantity_change}"
