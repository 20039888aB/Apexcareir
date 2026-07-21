from decimal import Decimal
from typing import Optional

from django.apps import apps
from django.conf import settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.common.services.numbering import allocate_document_number
from apps.common.services.timeline import log_transaction_event

from ..models import Customer, Invoice, InvoiceLineItem, Sale
from .invoice_pdf import save_invoice_pdf


def _normalize_phone(phone: str) -> str:
    return "".join(character for character in phone if character.isdigit())


def find_existing_customer(*, name: str, phone: str = "", email: str = "", company_name: str = ""):
    normalized_name = name.strip()
    normalized_email = email.strip().lower()
    normalized_phone = _normalize_phone(phone)

    if normalized_email:
        customer = Customer.objects.filter(email__iexact=normalized_email).first()
        if customer:
            return customer

    if normalized_phone:
        phone_matches = Customer.objects.exclude(phone="").filter(phone__isnull=False)
        for customer in phone_matches:
            if _normalize_phone(customer.phone) == normalized_phone:
                return customer

    if normalized_name and company_name.strip():
        customer = Customer.objects.filter(
            name__iexact=normalized_name,
            company_name__iexact=company_name.strip(),
        ).first()
        if customer:
            return customer

    if normalized_name:
        return Customer.objects.filter(name__iexact=normalized_name).first()

    return None


def upsert_customer(
    *,
    name: str,
    user=None,
    phone: str = "",
    email: str = "",
    address: str = "",
    company_name: str = "",
    logo=None,
    overwrite: bool = True,
):
    normalized_name = name.strip()
    if not normalized_name:
        raise ValueError("Customer name is required.")

    customer = find_existing_customer(
        name=normalized_name,
        phone=phone,
        email=email,
        company_name=company_name,
    )
    if customer:
        changed = False
        field_values = {
            "name": normalized_name,
            "phone": phone,
            "email": email,
            "address": address,
            "company_name": company_name,
        }
        for field, value in field_values.items():
            current_value = getattr(customer, field) or ""
            if overwrite and value != current_value:
                setattr(customer, field, value)
                changed = True
            elif not overwrite and value and not current_value:
                setattr(customer, field, value)
                changed = True
        if logo:
            customer.logo = logo
            changed = True
        if changed:
            customer.updated_by = user if getattr(user, "is_authenticated", False) else None
            customer.save()
        return customer

    customer = Customer(
        customer_number=allocate_document_number("customer"),
        name=normalized_name,
        phone=phone,
        email=email,
        address=address,
        company_name=company_name,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
    if logo:
        customer.logo = logo
    customer.save()
    log_transaction_event(
        module="customers",
        reference_number=customer.customer_number,
        reference_id=customer.id,
        event_type="created",
        description=f"Customer {customer.name} created.",
        user=user,
    )
    return customer


def get_or_create_customer(*, name: str, user=None, phone: str = "", email: str = "", address: str = "", company_name: str = "", logo=None):
    return upsert_customer(
        name=name,
        user=user,
        phone=phone,
        email=email,
        address=address,
        company_name=company_name,
        logo=logo,
        overwrite=True,
    )


def sync_customer_from_invoice(invoice: Invoice, *, user=None, logo=None, overwrite: bool = True):
    customer = upsert_customer(
        name=invoice.customer_name,
        user=user,
        phone=invoice.customer_phone,
        email=invoice.customer_email,
        address=invoice.customer_address,
        company_name=invoice.customer_company,
        logo=logo,
        overwrite=overwrite,
    )
    if invoice.customer_id != customer.id:
        invoice.customer = customer
        invoice.save(update_fields=["customer", "updated_at"])
    return customer


def _recalculate_invoice_totals(invoice: Invoice, sale: Sale):
    subtotal = sale.quantity * sale.price
    invoice.subtotal = subtotal
    invoice.discount = sale.discount
    invoice.tax = Decimal("0")
    invoice.grand_total = subtotal - sale.discount
    return invoice


def create_invoice_for_sale(sale: Sale, *, user=None, regenerate: bool = False, status=None):
    invoice_number = sale.invoice_number
    if not invoice_number or invoice_number.startswith("PENDING"):
        invoice_number = allocate_document_number("invoice")
        sale.invoice_number = invoice_number
        sale.save(update_fields=["invoice_number", "updated_at"])

    subtotal = sale.quantity * sale.price
    grand_total = subtotal - sale.discount
    customer = sale.customer_record
    invoice, created = Invoice.objects.update_or_create(
        sale=sale,
        defaults={
            "invoice_number": invoice_number,
            "customer": customer,
            "customer_name": sale.customer,
            "customer_company": customer.company_name if customer else "",
            "customer_phone": customer.phone if customer else "",
            "customer_email": customer.email if customer else "",
            "customer_address": customer.address if customer else "",
            "status": status or Invoice.Status.ISSUED,
            "payment_status": Invoice.PaymentStatus.UNPAID,
            "subtotal": subtotal,
            "discount": sale.discount,
            "tax": Decimal("0"),
            "grand_total": grand_total,
            "generated_by": user if getattr(user, "is_authenticated", False) else sale.salesperson,
            "updated_by": user if getattr(user, "is_authenticated", False) else None,
            "issued_at": timezone.now(),
            "invoice_date": sale.date,
        },
    )

    save_invoice_pdf(invoice, sale)

    if created or not invoice.line_items.exists():
        line_item = InvoiceLineItem(
            invoice=invoice,
            product=sale.product,
            quantity=sale.quantity,
            unit_price=sale.price,
            cost_price=sale.cost_price,
            discount=sale.discount,
            tax=Decimal("0"),
            sort_order=0,
        )
        line_item.compute_line_total()
        line_item.save()

    event_type = "regenerated" if regenerate and not created else "issued"
    description = (
        f"Invoice {invoice.invoice_number} regenerated."
        if regenerate and not created
        else f"Invoice {invoice.invoice_number} issued for {sale.customer}."
    )
    log_transaction_event(
        module="invoices",
        reference_number=invoice.invoice_number,
        reference_id=invoice.id,
        event_type=event_type,
        description=description,
        user=user,
    )
    return invoice


def _deduct_product_stock(*, product, quantity: int, reference_label: str, event_date, note: str):
    with transaction.atomic():
        locked_product = product.__class__.objects.select_for_update().get(pk=product.pk)
        locked_product.refresh_from_db(fields=["current_stock"])
        if locked_product.current_stock < quantity:
            raise DjangoValidationError({"quantity": f"Insufficient stock for {product.name}."})
        locked_product.current_stock = F("current_stock") - quantity
        locked_product.save(update_fields=["current_stock"])
        StockMovement = apps.get_model("inventory", "StockMovement")
        StockMovement.objects.create(
            product=product,
            movement_type=StockMovement.Type.SALE,
            quantity_change=-quantity,
            reference_model="sales.invoice",
            reference_id=reference_label,
            reference_label=reference_label,
            event_date=event_date,
            note=note,
        )


def _normalize_manual_lines(lines):
    if not lines:
        raise ValueError("At least one invoice line is required.")
    normalized = []
    for index, line in enumerate(lines):
        normalized.append(
            {
                "product": line["product"],
                "quantity": int(line["quantity"]),
                "unit_price": Decimal(str(line["unit_price"])),
                "cost_price": Decimal(str(line.get("cost_price", line["product"].purchase_price))),
                "discount": Decimal(str(line.get("discount", 0))),
                "tax": Decimal("0"),
                "description": line.get("description", ""),
                "sort_order": index,
            }
        )
    return normalized


def _create_invoice_line_items(invoice: Invoice, lines):
    subtotal = Decimal("0")
    total_discount = Decimal("0")
    created_items = []
    for line in lines:
        item = InvoiceLineItem(
            invoice=invoice,
            product=line["product"],
            description=line.get("description", ""),
            quantity=line["quantity"],
            unit_price=line["unit_price"],
            cost_price=line["cost_price"],
            discount=line["discount"],
            tax=Decimal("0"),
            sort_order=line["sort_order"],
        )
        item.compute_line_total()
        item.save()
        created_items.append(item)
        subtotal += Decimal(line["quantity"]) * line["unit_price"]
        total_discount += line["discount"]
    invoice.subtotal = subtotal
    invoice.discount = total_discount
    invoice.tax = Decimal("0")
    invoice.grand_total = subtotal - total_discount
    invoice.save(update_fields=["subtotal", "discount", "tax", "grand_total", "updated_at"])
    return created_items


def create_manual_invoice(
    *,
    user,
    customer_name: str,
    customer_company: str = "",
    customer_phone: str = "",
    customer_email: str = "",
    customer_address: str = "",
    customer_logo=None,
    customer_id=None,
    product=None,
    quantity: Optional[int] = None,
    unit_price=None,
    cost_price=None,
    discount=0,
    tax=0,
    lines=None,
    invoice_date=None,
    status=Invoice.Status.DRAFT,
    payment_status=Invoice.PaymentStatus.UNPAID,
    notes: str = "",
):
    invoice_date = invoice_date or timezone.localdate()

    if customer_id:
        customer = Customer.objects.filter(pk=customer_id).first()
        if not customer:
            raise ValueError("Selected buyer was not found.")
        if not customer_logo:
            customer = upsert_customer(
                name=customer_name or customer.name,
                user=user,
                phone=customer_phone or customer.phone,
                email=customer_email or customer.email,
                address=customer_address or customer.address,
                company_name=customer_company or customer.company_name,
                logo=None,
                overwrite=True,
            )
        else:
            customer = upsert_customer(
                name=customer_name,
                user=user,
                phone=customer_phone,
                email=customer_email,
                address=customer_address,
                company_name=customer_company,
                logo=customer_logo,
                overwrite=True,
            )
    else:
        customer = upsert_customer(
            name=customer_name,
            user=user,
            phone=customer_phone,
            email=customer_email,
            address=customer_address,
            company_name=customer_company,
            logo=customer_logo,
            overwrite=True,
        )

    if lines:
        from apps.inventory.models import Product

        resolved_lines = []
        for entry in lines:
            product_obj = entry["product"] if hasattr(entry["product"], "pk") else Product.objects.get(pk=entry["product"])
            resolved_lines.append({**entry, "product": product_obj})
        normalized_lines = _normalize_manual_lines(resolved_lines)
    else:
        if product is None or quantity is None or unit_price is None:
            raise ValueError("Product, quantity, and unit price are required.")
        normalized_lines = _normalize_manual_lines(
            [
                {
                    "product": product,
                    "quantity": quantity,
                    "unit_price": unit_price,
                    "cost_price": cost_price or product.purchase_price,
                    "discount": discount,
                }
            ]
        )

    first_line = normalized_lines[0]
    invoice_number = allocate_document_number("invoice")
    sale = Sale(
        sale_number=allocate_document_number("sale"),
        invoice_number=invoice_number,
        customer=customer_name.strip(),
        customer_record=customer,
        product=first_line["product"],
        quantity=first_line["quantity"],
        price=first_line["unit_price"],
        discount=first_line["discount"],
        tax=Decimal("0"),
        cost_price=first_line["cost_price"],
        date=invoice_date,
        salesperson=user if getattr(user, "is_authenticated", False) else None,
        created_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
    )
    try:
        sale.save()
    except DjangoValidationError as exc:
        raise exc

    for extra_line in normalized_lines[1:]:
        _deduct_product_stock(
            product=extra_line["product"],
            quantity=extra_line["quantity"],
            reference_label=invoice_number,
            event_date=invoice_date,
            note=f"Manual invoice line for {customer_name.strip()}",
        )

    subtotal = sum(Decimal(line["quantity"]) * line["unit_price"] for line in normalized_lines)
    total_discount = sum(line["discount"] for line in normalized_lines)
    grand_total = subtotal - total_discount

    invoice = Invoice.objects.create(
        invoice_number=invoice_number,
        sale=sale,
        customer=customer,
        customer_name=customer_name.strip(),
        customer_company=customer_company,
        customer_phone=customer_phone,
        customer_email=customer_email,
        customer_address=customer_address,
        status=status,
        payment_status=payment_status,
        subtotal=subtotal,
        discount=total_discount,
        tax=Decimal("0"),
        grand_total=grand_total,
        generated_by=user if getattr(user, "is_authenticated", False) else None,
        updated_by=user if getattr(user, "is_authenticated", False) else None,
        issued_at=timezone.now() if status != Invoice.Status.DRAFT else None,
        invoice_date=invoice_date,
        notes=notes,
    )
    _create_invoice_line_items(invoice, normalized_lines)
    save_invoice_pdf(invoice, sale)
    log_transaction_event(
        module="invoices",
        reference_number=invoice.invoice_number,
        reference_id=invoice.id,
        event_type="created",
        description=f"Invoice {invoice.invoice_number} manually created for {invoice.customer_name}.",
        user=user,
    )
    log_transaction_event(
        module="sales",
        reference_number=sale.sale_number,
        reference_id=sale.id,
        event_type="created",
        description=f"Sale {sale.sale_number} created from manual invoice.",
        user=user,
    )
    return invoice


def update_invoice_record(invoice: Invoice, *, user=None, validated_data: dict, customer_logo=None):
    sale = invoice.sale
    sale_fields = {}
    field_map = {
        "product": "product",
        "quantity": "quantity",
        "unit_price": "price",
        "cost_price": "cost_price",
        "discount": "discount",
    }
    for payload_field, sale_field in field_map.items():
        if payload_field in validated_data:
            sale_fields[sale_field] = validated_data[payload_field]

    if "invoice_date" in validated_data:
        sale_fields["date"] = validated_data["invoice_date"]

    customer_fields = {
        "customer_name": "customer_name",
        "customer_company": "customer_company",
        "customer_phone": "customer_phone",
        "customer_email": "customer_email",
        "customer_address": "customer_address",
    }
    for payload_field, invoice_field in customer_fields.items():
        if payload_field in validated_data:
            setattr(invoice, invoice_field, validated_data[payload_field])

    if "customer_name" in validated_data:
        sale.customer = validated_data["customer_name"].strip()

    for field in ["status", "payment_status", "notes", "invoice_date"]:
        if field in validated_data:
            setattr(invoice, field, validated_data[field])

    if validated_data.get("status") == Invoice.Status.PAID and not invoice.paid_at:
        invoice.paid_at = timezone.now()
    if validated_data.get("payment_status") == Invoice.PaymentStatus.PAID and not invoice.paid_at:
        invoice.paid_at = timezone.now()

    paid_status_applied = (
        validated_data.get("status") == Invoice.Status.PAID
        or validated_data.get("payment_status") == Invoice.PaymentStatus.PAID
    )

    if sale_fields:
        from django.core.exceptions import ValidationError as DjangoValidationError

        sale.updated_by = user if getattr(user, "is_authenticated", False) else None
        for field, value in sale_fields.items():
            setattr(sale, field, value)
        try:
            sale.save()
        except DjangoValidationError as exc:
            raise exc

    _recalculate_invoice_totals(invoice, sale)
    invoice.updated_by = user if getattr(user, "is_authenticated", False) else None
    invoice.save()

    sync_customer_from_invoice(invoice, user=user, logo=customer_logo, overwrite=True)
    save_invoice_pdf(invoice, sale)

    log_transaction_event(
        module="invoices",
        reference_number=invoice.invoice_number,
        reference_id=invoice.id,
        event_type="updated",
        description=f"Invoice {invoice.invoice_number} updated.",
        user=user,
    )
    if paid_status_applied:
        log_transaction_event(
            module="invoices",
            reference_number=invoice.invoice_number,
            reference_id=invoice.id,
            event_type="paid",
            description=f"Invoice {invoice.invoice_number} marked as paid.",
            user=user,
        )
    return invoice


def email_invoice_to_customer(invoice: Invoice, *, user=None, recipient_emails=None):
    from django.core.mail import EmailMultiAlternatives
    from django.core.validators import validate_email
    from django.core.exceptions import ValidationError

    from apps.common.services.company_branding import build_branded_email_html, get_company_branding

    def normalize_recipient_emails(raw_emails):
        collected = []
        if raw_emails is None:
            raw_emails = []
        elif isinstance(raw_emails, str):
            raw_emails = [raw_emails]
        elif not isinstance(raw_emails, (list, tuple)):
            raw_emails = [str(raw_emails)]

        for entry in raw_emails:
            if not isinstance(entry, str):
                continue
            for part in entry.replace(";", ",").split(","):
                email = part.strip()
                if email:
                    collected.append(email)

        if not collected and invoice.customer_email:
            collected = [invoice.customer_email.strip()]

        deduped = list(dict.fromkeys(collected))
        if not deduped:
            raise ValueError("At least one recipient email is required to send the invoice.")

        validated = []
        for email in deduped:
            try:
                validate_email(email)
            except ValidationError as exc:
                raise ValueError(f"Invalid recipient email: {email}") from exc
            validated.append(email)
        return validated

    branding = get_company_branding()
    recipients = normalize_recipient_emails(recipient_emails)

    save_invoice_pdf(invoice, invoice.sale)

    contact_phone = branding["phone"]
    contact_email = branding["support_email"]
    subject = f"Invoice {invoice.invoice_number} from {branding['company_name']}"
    body_text = (
        f"Dear {invoice.customer_name},\n\n"
        f"Please find attached invoice {invoice.invoice_number}.\n\n"
        f"{branding['invoice_footer_text']}\n\n"
        f"Contact us:\nPhone: {contact_phone}\nEmail: {contact_email}"
    )
    body_html = build_branded_email_html(
        subject=f"Invoice {invoice.invoice_number}",
        body_html=(
            f"<p style='margin:0 0 12px;line-height:1.6;'>Dear {invoice.customer_name},</p>"
            f"<p style='margin:0 0 12px;line-height:1.6;'>Please find attached invoice "
            f"<strong>{invoice.invoice_number}</strong> for <strong>KES {invoice.grand_total:,.2f}</strong>.</p>"
            f"<p style='margin:0;line-height:1.6;'>{branding['invoice_footer_text']}</p>"
            f"<p style='margin:12px 0 0;line-height:1.6;'><strong>Contact us</strong><br>"
            f"Phone: {contact_phone}<br>Email: {contact_email}</p>"
        ),
        footer_note=f"{branding['company_name']} · Invoice attached as PDF with company logo",
    )
    email = EmailMultiAlternatives(
        subject=subject,
        body=body_text,
        from_email=settings.DEFAULT_FROM_EMAIL or settings.EMAIL_HOST_USER,
        to=recipients,
    )
    email.attach_alternative(body_html, "text/html")
    email.attach(invoice.pdf_file.name, invoice.pdf_file.read(), "application/pdf")
    email.send(fail_silently=False)

    recipient_summary = ", ".join(recipients)
    log_transaction_event(
        module="invoices",
        reference_number=invoice.invoice_number,
        reference_id=invoice.id,
        event_type="sent",
        description=f"Invoice {invoice.invoice_number} sent to {recipient_summary}.",
        user=user,
    )
    return recipients
