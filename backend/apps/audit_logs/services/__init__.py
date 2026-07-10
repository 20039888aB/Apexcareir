from apps.audit_logs.models import AuditLog


def _extract_ip_address(request):
    forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit_event(
    *,
    request,
    action,
    module,
    description,
    target=None,
    metadata=None,
):
    try:
        target_model = ""
        target_id = ""
        target_repr = ""
        if target is not None:
            model_meta = getattr(target, "_meta", None)
            target_model = (
                f"{model_meta.app_label}.{model_meta.model_name}" if model_meta else target.__class__.__name__.lower()
            )
            target_id = str(getattr(target, "pk", ""))
            target_repr = str(target)[:255]

        AuditLog.objects.create(
            user=request.user if getattr(request.user, "is_authenticated", False) else None,
            action=action,
            module=module,
            description=description,
            target_model=target_model,
            target_id=target_id,
            target_repr=target_repr,
            ip_address=_extract_ip_address(request),
            metadata=metadata or {},
        )
    except Exception:
        # Audit logging should never block core business operations.
        return
