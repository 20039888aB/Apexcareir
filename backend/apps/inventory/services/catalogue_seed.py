from django.db import transaction
from django.utils.text import slugify

from apps.inventory.catalogue_data import CATALOGUE_BY_CATEGORY, CATALOGUE_UNIT_OVERRIDES
from apps.inventory.models import Product, ProductCategory


def _build_unique_sku(product_name: str):
    base = slugify(product_name).upper().replace("-", "")[:14] or "ITEM"
    sequence = 1
    candidate = f"CAT-{base}-{sequence:03d}"
    while Product.objects.filter(sku=candidate).exists():
        sequence += 1
        candidate = f"CAT-{base}-{sequence:03d}"
    return candidate


def seed_catalogue_items(*, overwrite: bool = False):
    created_categories = 0
    created_products = 0
    updated_products = 0
    existing_products = 0
    created_names = []
    updated_names = []

    with transaction.atomic():
        for category_name, product_names in CATALOGUE_BY_CATEGORY.items():
            category, category_created = ProductCategory.objects.get_or_create(name=category_name)
            if category_created:
                created_categories += 1

            for product_name in product_names:
                unit = CATALOGUE_UNIT_OVERRIDES.get(product_name, "pcs")
                existing = Product.objects.filter(name__iexact=product_name).first()
                if existing:
                    if overwrite:
                        existing.category = category
                        existing.unit = unit
                        existing.description = f"Catalogue starter item for {category_name}."
                        existing.status = Product.Status.ACTIVE
                        existing.is_archived = False
                        existing.save(
                            update_fields=["category", "unit", "description", "status", "is_archived", "updated_at"]
                        )
                        updated_products += 1
                        updated_names.append(product_name)
                    else:
                        existing_products += 1
                    continue

                Product.objects.create(
                    name=product_name,
                    sku=_build_unique_sku(product_name),
                    category=category,
                    unit=unit,
                    purchase_price=0,
                    selling_price=0,
                    current_stock=0,
                    minimum_stock=5,
                    description=f"Catalogue starter item for {category_name}.",
                    status=Product.Status.ACTIVE,
                )
                created_products += 1
                created_names.append(product_name)

    return {
        "created_categories": created_categories,
        "created_products": created_products,
        "updated_products": updated_products,
        "existing_products": existing_products,
        "created_names": created_names,
        "updated_names": updated_names,
        "total_catalogue_items": sum(len(items) for items in CATALOGUE_BY_CATEGORY.values()),
    }
