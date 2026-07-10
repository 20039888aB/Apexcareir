from decimal import Decimal

from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from apps.common.services.timeline import log_transaction_event

from ..models import Invoice, InvoicePayment


def refresh_invoice_payment_state(invoice: Invoice):
    total_paid = invoice.payments.aggregate(total=Sum("amount"))["total"] or Decimal("0")
    invoice.amount_paid = total_paid
    balance = invoice.grand_total - total_paid

    if balance <= 0:
        invoice.payment_status = Invoice.PaymentStatus.PAID
        invoice.status = Invoice.Status.PAID
        if not invoice.paid_at:
            invoice.paid_at = timezone.now()
    elif total_paid > 0:
        invoice.payment_status = Invoice.PaymentStatus.PARTIALLY_PAID
        invoice.status = Invoice.Status.PARTIALLY_PAID
        invoice.paid_at = None
    else:
        invoice.payment_status = Invoice.PaymentStatus.UNPAID
        if invoice.status == Invoice.Status.PAID:
            invoice.status = Invoice.Status.ISSUED
        invoice.paid_at = None

    invoice.save(
        update_fields=[
            "amount_paid",
            "payment_status",
            "status",
            "paid_at",
            "updated_at",
        ]
    )
    return invoice


def record_invoice_payment(
    invoice: Invoice,
    *,
    amount,
    payment_date=None,
    payment_method=InvoicePayment.PaymentMethod.CASH,
    reference: str = "",
    notes: str = "",
    user=None,
):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValueError("Payment amount must be greater than zero.")

    balance_due = invoice.balance_due
    if amount > balance_due:
        raise ValueError(f"Payment amount exceeds balance due (KES {balance_due:,.2f}).")

    payment = InvoicePayment.objects.create(
        invoice=invoice,
        amount=amount,
        payment_date=payment_date or timezone.localdate(),
        payment_method=payment_method,
        reference=reference,
        notes=notes,
        recorded_by=user if getattr(user, "is_authenticated", False) else None,
    )
    refresh_invoice_payment_state(invoice)
    log_transaction_event(
        module="invoices",
        reference_number=invoice.invoice_number,
        reference_id=invoice.id,
        event_type="paid" if invoice.payment_status == Invoice.PaymentStatus.PAID else "partially_paid",
        description=(
            f"Payment of KES {amount:,.2f} recorded for invoice {invoice.invoice_number}"
            f"{f' ({reference})' if reference else ''}."
        ),
        user=user,
    )
    return payment
