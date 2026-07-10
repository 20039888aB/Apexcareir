from apps.common.models import TransactionEvent


def log_transaction_event(
    *,
    module: str,
    reference_number: str,
    event_type: str,
    description: str,
    user=None,
    reference_id: str = "",
):
    return TransactionEvent.objects.create(
        module=module,
        reference_number=reference_number,
        reference_id=str(reference_id or ""),
        event_type=event_type,
        description=description,
        user=user if getattr(user, "is_authenticated", False) else None,
    )
