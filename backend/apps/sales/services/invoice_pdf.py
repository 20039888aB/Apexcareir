import io
from decimal import Decimal
from typing import Iterable, Optional
from xml.sax.saxutils import escape

from django.core.files.base import ContentFile
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from apps.common.models import CompanySettings
from apps.common.services.company_branding import get_company_branding, get_company_logo_path, invoice_contact_lines

# Target column share of the full table width (normalized to 100% at render time).
COLUMN_WIDTH_FRACTIONS = [0.05, 0.38, 0.16, 0.07, 0.14, 0.10, 0.15]
TABLE_FONT_SIZE_DEFAULT = 10
TABLE_FONT_SIZE_COMPACT = 8
CELL_PADDING_X = 8
CELL_PADDING_Y = 6


def _money(value):
    return f"KES {Decimal(value or 0):,.2f}"


def _escape_paragraph_text(value) -> str:
    return escape(str(value or "").strip())


def _normalize_column_fractions(fractions: Iterable[float]) -> list[float]:
    values = [float(value) for value in fractions]
    total = sum(values) or 1.0
    return [value / total for value in values]


def _available_table_width(doc: SimpleDocTemplate) -> float:
    return doc.width


def _column_widths(table_width: float) -> list[float]:
    fractions = _normalize_column_fractions(COLUMN_WIDTH_FRACTIONS)
    return [table_width * fraction for fraction in fractions]


def _sku_display_value(sku: str, *, compact: bool) -> str:
    cleaned = str(sku or "").strip()
    max_chars = 28 if compact else 36
    if len(cleaned) <= max_chars:
        return cleaned
    return f"{cleaned[: max_chars - 3]}..."


def _line_item_rows(invoice, sale) -> list[dict]:
    line_items = list(invoice.line_items.select_related("product").all())
    rows = []
    if line_items:
        for index, item in enumerate(line_items, start=1):
            rows.append(
                {
                    "index": str(index),
                    "product": (item.description or item.product.name).strip(),
                    "sku": item.product.sku,
                    "quantity": str(item.quantity),
                    "unit_price": _money(item.unit_price),
                    "discount": _money(item.discount),
                    "line_total": _money(item.line_total),
                }
            )
        return rows

    line_total = Decimal(sale.quantity) * sale.price
    rows.append(
        {
            "index": "1",
            "product": sale.product.name,
            "sku": sale.product.sku,
            "quantity": str(sale.quantity),
            "unit_price": _money(sale.price),
            "discount": _money(sale.discount),
            "line_total": _money(line_total),
        }
    )
    return rows


def _choose_table_font_size(rows: list[dict]) -> int:
    if not rows:
        return TABLE_FONT_SIZE_DEFAULT

    max_product_len = max(len(row["product"]) for row in rows)
    max_sku_len = max(len(row["sku"]) for row in rows)
    if len(rows) >= 7 or max_product_len >= 48 or max_sku_len >= 24:
        return TABLE_FONT_SIZE_COMPACT
    return TABLE_FONT_SIZE_DEFAULT


def _table_paragraph_styles(font_size: int) -> dict[str, ParagraphStyle]:
    leading = max(font_size + 2, 10)
    return {
        "header": ParagraphStyle(
            "InvoiceTableHeader",
            fontName="Helvetica-Bold",
            fontSize=font_size,
            leading=leading,
            textColor=colors.white,
            alignment=TA_LEFT,
            wordWrap="LTR",
            splitLongWords=True,
        ),
        "index": ParagraphStyle(
            "InvoiceTableIndex",
            fontName="Helvetica",
            fontSize=font_size,
            leading=leading,
            alignment=TA_CENTER,
            wordWrap="LTR",
        ),
        "product": ParagraphStyle(
            "InvoiceTableProduct",
            fontName="Helvetica",
            fontSize=font_size,
            leading=leading,
            alignment=TA_LEFT,
            wordWrap="LTR",
            splitLongWords=True,
        ),
        "sku": ParagraphStyle(
            "InvoiceTableSku",
            fontName="Helvetica",
            fontSize=font_size,
            leading=leading,
            alignment=TA_LEFT,
            wordWrap="LTR",
            splitLongWords=True,
        ),
        "qty": ParagraphStyle(
            "InvoiceTableQty",
            fontName="Helvetica",
            fontSize=font_size,
            leading=leading,
            alignment=TA_CENTER,
            wordWrap="LTR",
        ),
        "money": ParagraphStyle(
            "InvoiceTableMoney",
            fontName="Helvetica",
            fontSize=font_size,
            leading=leading,
            alignment=TA_RIGHT,
            wordWrap="LTR",
        ),
    }


def _build_invoice_line_items_table(*, doc: SimpleDocTemplate, invoice, sale) -> Table:
    rows = _line_item_rows(invoice, sale)
    font_size = _choose_table_font_size(rows)
    compact = font_size == TABLE_FONT_SIZE_COMPACT
    styles = _table_paragraph_styles(font_size)
    table_width = _available_table_width(doc)
    col_widths = _column_widths(table_width)

    table_data = [
        [
            Paragraph("#", styles["header"]),
            Paragraph("Product", styles["header"]),
            Paragraph("SKU", styles["header"]),
            Paragraph("Qty", styles["header"]),
            Paragraph("Unit Price", styles["header"]),
            Paragraph("Discount", styles["header"]),
            Paragraph("Line Total", styles["header"]),
        ]
    ]

    for row in rows:
        table_data.append(
            [
                Paragraph(_escape_paragraph_text(row["index"]), styles["index"]),
                Paragraph(_escape_paragraph_text(row["product"]), styles["product"]),
                Paragraph(_escape_paragraph_text(_sku_display_value(row["sku"], compact=compact)), styles["sku"]),
                Paragraph(_escape_paragraph_text(row["quantity"]), styles["qty"]),
                Paragraph(_escape_paragraph_text(row["unit_price"]), styles["money"]),
                Paragraph(_escape_paragraph_text(row["discount"]), styles["money"]),
                Paragraph(_escape_paragraph_text(row["line_total"]), styles["money"]),
            ]
        )

    table = Table(table_data, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#6E2C3E")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), font_size),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ALIGN", (0, 1), (0, -1), "CENTER"),
                ("ALIGN", (1, 1), (2, -1), "LEFT"),
                ("ALIGN", (3, 1), (3, -1), "CENTER"),
                ("ALIGN", (4, 1), (-1, -1), "RIGHT"),
                ("LEFTPADDING", (0, 0), (-1, -1), CELL_PADDING_X),
                ("RIGHTPADDING", (0, 0), (-1, -1), CELL_PADDING_X),
                ("TOPPADDING", (0, 0), (-1, -1), CELL_PADDING_Y),
                ("BOTTOMPADDING", (0, 0), (-1, -1), CELL_PADDING_Y),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.lightgrey),
                ("BOX", (0, 0), (-1, -1), 0.25, colors.lightgrey),
            ]
        )
    )
    return table


def build_invoice_pdf_bytes(*, invoice, sale, company: Optional[CompanySettings] = None):
    company = company or CompanySettings.get_solo()
    branding = get_company_branding()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, textColor=colors.HexColor("#6E2C3E"))
    muted_style = ParagraphStyle("Muted", parent=styles["Normal"], fontSize=9, textColor=colors.grey)
    normal = styles["Normal"]

    story = []
    logo_path = branding.get("logo_path") or get_company_logo_path(company)
    if logo_path:
        try:
            from reportlab.platypus import Image

            story.append(Image(logo_path, width=3.5 * cm, height=1.75 * cm))
            story.append(Spacer(1, 0.2 * cm))
        except Exception:
            pass

    story.extend(
        [
            Paragraph(branding["company_name"], title_style),
            Paragraph(company.address or branding.get("address") or "", normal),
            Paragraph(
                " | ".join(
                    filter(
                        None,
                        [
                            branding["email"],
                            branding["phone"],
                            branding.get("website"),
                        ],
                    )
                ),
                muted_style,
            ),
            Spacer(1, 0.4 * cm),
            Paragraph(f"<b>INVOICE</b> {invoice.invoice_number}", styles["Heading2"]),
            Paragraph(f"Invoice Date: {invoice.invoice_date}", normal),
            Paragraph(
                f"Issued At: {timezone.localtime(invoice.issued_at).strftime('%Y-%m-%d %H:%M')}"
                if invoice.issued_at
                else "Issued At: —",
                normal,
            ),
            Paragraph(
                f"Paid At: {timezone.localtime(invoice.paid_at).strftime('%Y-%m-%d %H:%M')}"
                if invoice.paid_at
                else "Paid At: —",
                normal,
            ),
            Paragraph(
                f"Generated By: {(invoice.generated_by.get_full_name() or invoice.generated_by.email) if invoice.generated_by else 'System'}",
                normal,
            ),
            Spacer(1, 0.3 * cm),
        ]
    )

    bill_to_header = Table(
        [[Paragraph("<b>Bill To</b>", normal), ""]],
        colWidths=[10 * cm, 6 * cm],
    )
    story.append(bill_to_header)

    customer_logo_cell = ""
    if invoice.customer and invoice.customer.logo:
        try:
            from reportlab.platypus import Image

            customer_logo_cell = Image(invoice.customer.logo.path, width=2.5 * cm, height=1.5 * cm)
        except Exception:
            customer_logo_cell = ""

    customer_lines = [
        Paragraph(invoice.customer_name, normal),
    ]
    if invoice.customer_company:
        customer_lines.append(Paragraph(invoice.customer_company, normal))
    if invoice.customer_phone:
        customer_lines.append(Paragraph(f"Phone: {invoice.customer_phone}", normal))
    if invoice.customer_email:
        customer_lines.append(Paragraph(f"Email: {invoice.customer_email}", normal))
    if invoice.customer_address:
        customer_lines.append(Paragraph(invoice.customer_address, normal))

    if customer_logo_cell:
        bill_to_table = Table(
            [[customer_lines, customer_logo_cell]],
            colWidths=[10 * cm, 6 * cm],
        )
        story.append(bill_to_table)
    else:
        story.extend(customer_lines)

    story.append(Spacer(1, 0.5 * cm))
    story.append(_build_invoice_line_items_table(doc=doc, invoice=invoice, sale=sale))
    story.append(Spacer(1, 0.4 * cm))

    summary = [
        ["Subtotal", _money(invoice.subtotal)],
        ["Discount", _money(invoice.discount)],
        ["Grand Total", _money(invoice.grand_total)],
        ["Amount Paid", _money(getattr(invoice, "amount_paid", 0))],
        ["Balance Due", _money(invoice.balance_due if hasattr(invoice, "balance_due") else invoice.grand_total)],
        ["Payment Status", invoice.get_payment_status_display()],
        ["Invoice Status", invoice.get_status_display()],
    ]
    summary_table = Table(summary, colWidths=[5 * cm, 5 * cm], hAlign="RIGHT")
    summary_table.setStyle(
        TableStyle([("ALIGN", (1, 0), (1, -1), "RIGHT"), ("FONTNAME", (0, -2), (-1, -2), "Helvetica-Bold")])
    )
    story.extend([summary_table, Spacer(1, 0.6 * cm)])

    footer = branding["invoice_footer_text"] or company.invoice_footer_text or "Thank you for your business."
    story.append(Paragraph(footer, normal))
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph("<b>Contact Us</b>", normal))
    for line in invoice_contact_lines(branding):
        story.append(Paragraph(line, muted_style))
    story.append(
        Paragraph(
            f"Generated: {timezone.localtime().strftime('%Y-%m-%d %H:%M')} | Ref: {invoice.invoice_number}",
            muted_style,
        )
    )

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()


def save_invoice_pdf(invoice, sale):
    pdf_bytes = build_invoice_pdf_bytes(invoice=invoice, sale=sale)
    filename = f"{invoice.invoice_number}.pdf"
    invoice.pdf_file.save(filename, ContentFile(pdf_bytes), save=True)
    invoice.pdf_generated_at = timezone.now()
    invoice.save(update_fields=["pdf_generated_at", "updated_at"])
    return invoice.pdf_file
