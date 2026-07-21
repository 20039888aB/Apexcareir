from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.db.models import F
from django.utils.text import slugify

from apps.common.services.auto_number import assign_product_number
from apps.inventory.models import Product, StockMovement
from apps.sales.models import Sale


def normalize_product_name(name: str) -> str:
    return " ".join(str(name or "").split()).strip()


def build_unique_sku(product_name: str, *, prefix: str = "RCV") -> str:
    base = slugify(product_name).upper().replace("-", "")[:14] or "ITEM"
    sequence = 1
    candidate = f"{prefix}-{base}-{sequence:03d}"
    while Product.objects.filter(sku=candidate).exists():
        sequence += 1
        candidate = f"{prefix}-{base}-{sequence:03d}"
    return candidate


def merge_duplicate_products_by_name(name: str):
    """Keep the oldest active product for a name; archive extras and fold their stock in."""
    normalized = normalize_product_name(name)
    if not normalized:
        return None

    matches = list(
        Product.objects.filter(name__iexact=normalized, is_archived=False).order_by("id")
    )
    if not matches:
        return None

    canonical = matches[0]
    for duplicate in matches[1:]:
        with transaction.atomic():
            Product.objects.filter(pk=canonical.pk).update(
                current_stock=F("current_stock") + duplicate.current_stock
            )
            duplicate.stock_receipts.all().update(product_id=canonical.id)
            duplicate.stock_transfers.all().update(product_id=canonical.id)
            duplicate.stock_adjustments.all().update(product_id=canonical.id)
            Sale.objects.filter(product=duplicate).update(product_id=canonical.id)
            StockMovement.objects.filter(product=duplicate).update(product_id=canonical.id)

            duplicate.current_stock = 0
            duplicate.is_archived = True
            duplicate.status = Product.Status.INACTIVE
            duplicate.name = f"{normalized} (duplicate {duplicate.id})"
            duplicate.sku = f"DUP-{duplicate.id}-{duplicate.sku}"[:100]
            duplicate.save(
                update_fields=["current_stock", "is_archived", "status", "name", "sku", "updated_at"]
            )

    return Product.objects.get(pk=canonical.pk)


def resolve_product_for_receipt(
    *,
    product_id=None,
    product_name: str = "",
    purchase_price=0,
    supplier_id=None,
):
    """Resolve an existing product by id/name, or create one from a typed name.

    Returns (product, created).
    """
    if product_id not in (None, "", 0, "0"):
        try:
            product = Product.objects.get(pk=int(product_id))
        except (TypeError, ValueError, Product.DoesNotExist) as exc:
            raise ValueError("Unknown product id.") from exc
        merged = merge_duplicate_products_by_name(product.name)
        return merged or product, False

    name = normalize_product_name(product_name)
    if not name:
        raise ValueError("Provide a product id or product name.")

    existing = merge_duplicate_products_by_name(name)
    if existing:
        return existing, False

    try:
        unit_cost = Decimal(str(purchase_price or 0))
    except (InvalidOperation, TypeError, ValueError):
        unit_cost = Decimal("0")

    product = Product(
        name=name,
        sku=build_unique_sku(name),
        supplier_id=supplier_id if supplier_id else None,
        unit="pcs",
        purchase_price=unit_cost,
        selling_price=unit_cost,
        current_stock=0,
        minimum_stock=0,
        status=Product.Status.ACTIVE,
        description="Created automatically while receiving stock.",
    )
    assign_product_number(product)
    try:
        product.save()
    except Exception:
        existing = merge_duplicate_products_by_name(name)
        if existing:
            return existing, False
        raise
    return product, True


def force_delete_product(product: Product):
    with transaction.atomic():
        for sale in list(product.sales.all()):
            sale.delete()
        for transfer in list(product.stock_transfers.all()):
            transfer.delete()
        for adjustment in list(product.stock_adjustments.all()):
            adjustment.delete()
        for receipt in list(product.stock_receipts.all()):
            receipt.delete()
        StockMovement.objects.filter(product=product).delete()
        product.delete()


def purge_product_history(product: Product):
    deleted_count, _ = StockMovement.objects.filter(product=product).delete()
    return deleted_count
