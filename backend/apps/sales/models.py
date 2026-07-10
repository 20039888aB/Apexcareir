from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db import transaction
from django.db.models import F
from django.apps import apps

from apps.inventory.models import Product


class Sale(models.Model):
    invoice_number = models.CharField(max_length=100, unique=True)
    customer = models.CharField(max_length=255)
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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["invoice_number"]),
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
