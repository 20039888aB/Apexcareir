from django.db import transaction
from django.utils import timezone

from apps.common.models import DocumentNumberSequence

DEFAULT_SEQUENCES = [
    {"key": "employee", "prefix": "EMP", "include_year": False, "padding": 6},
    {"key": "product", "prefix": "PRD", "include_year": False, "padding": 6},
    {"key": "supplier", "prefix": "SUP", "include_year": False, "padding": 6},
    {"key": "customer", "prefix": "CUS", "include_year": False, "padding": 6},
    {"key": "sale", "prefix": "SAL", "include_year": False, "padding": 6},
    {"key": "invoice", "prefix": "INV", "include_year": True, "padding": 6},
    {"key": "stock_receipt", "prefix": "REC", "include_year": True, "padding": 6},
    {"key": "stock_adjustment", "prefix": "ADJ", "include_year": True, "padding": 6},
    {"key": "expense", "prefix": "EXP", "include_year": True, "padding": 6},
]


def ensure_default_sequences():
    for item in DEFAULT_SEQUENCES:
        DocumentNumberSequence.objects.get_or_create(
            key=item["key"],
            defaults={
                "prefix": item["prefix"],
                "include_year": item["include_year"],
                "padding": item["padding"],
            },
        )


def allocate_document_number(key: str) -> str:
    ensure_default_sequences()
    current_year = timezone.localdate().year

    with transaction.atomic():
        sequence = DocumentNumberSequence.objects.select_for_update().get(key=key)
        if sequence.include_year and sequence.last_year != current_year:
            sequence.last_year = current_year
            sequence.last_number = 0

        sequence.last_number += 1
        sequence.save(update_fields=["last_number", "last_year", "updated_at"])

        padded = str(sequence.last_number).zfill(sequence.padding)
        if sequence.include_year:
            return f"{sequence.prefix}-{current_year}-{padded}"
        return f"{sequence.prefix}-{padded}"
