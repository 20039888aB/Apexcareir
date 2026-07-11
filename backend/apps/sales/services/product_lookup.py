import re
from decimal import Decimal
from typing import Optional

from django.db import transaction

from apps.common.services.numbering import allocate_document_number
from apps.common.services.timeline import log_transaction_event
from apps.inventory.models import Product, ProductCategory


def _normalize_name(name: str) -> str:
    return " ".join(name.strip().split())


def _build_sku(name: str) -> str:
    slug = re.sub(r"[^A-Za-z0-9]+", "-", name.strip().upper()).strip("-")
    slug = (slug[:24] if slug else "PRODUCT")
    base = f"CAT-{slug}"
    candidate = base
    counter = 1
    while Product.objects.filter(sku=candidate).exists():
        counter += 1
        candidate = f"{base}-{counter:03d}"
    return candidate


def find_existing_product(*, name: str, sku: str = "") -> Optional[Product]:
    normalized_name = _normalize_name(name)
    if not normalized_name:
        return None

    normalized_sku = sku.strip().upper()
    if normalized_sku:
        product = Product.objects.filter(sku__iexact=normalized_sku).first()
        if product:
            return product

    product = Product.objects.filter(name__iexact=normalized_name).first()
    if product:
        return product

    return Product.objects.filter(name__icontains=normalized_name).order_by("name").first()


def upsert_product_for_sale(
    *,
    name: str,
    unit_price: Decimal,
    cost_price: Decimal,
    quantity: int,
    user=None,
):
    normalized_name = _normalize_name(name)
    if not normalized_name:
        raise ValueError("Product name is required.")

    quantity = max(int(quantity), 1)
    unit_price = Decimal(str(unit_price))
    cost_price = Decimal(str(cost_price))

    existing = find_existing_product(name=normalized_name)
    if existing:
        changed_fields = []
        if unit_price > 0 and existing.selling_price != unit_price:
            existing.selling_price = unit_price
            changed_fields.append("selling_price")
        if cost_price > 0 and existing.purchase_price != cost_price:
            existing.purchase_price = cost_price
            changed_fields.append("purchase_price")
        if existing.current_stock < quantity:
            existing.current_stock = quantity
            changed_fields.append("current_stock")
        if changed_fields:
            existing.save(update_fields=[*changed_fields, "updated_at"])
        return existing

    category, _ = ProductCategory.objects.get_or_create(name="Sales Catalogue")

    with transaction.atomic():
        product = Product.objects.create(
            name=normalized_name,
            sku=_build_sku(normalized_name),
            product_number=allocate_document_number("product"),
            category=category,
            selling_price=unit_price,
            purchase_price=cost_price if cost_price > 0 else unit_price,
            current_stock=quantity,
            minimum_stock=0,
            status=Product.Status.ACTIVE,
        )
        log_transaction_event(
            module="inventory",
            reference_number=product.product_number or product.sku,
            reference_id=product.id,
            event_type="created",
            description=f"Product {product.name} auto-saved from sales entry.",
            user=user,
        )
        return product
