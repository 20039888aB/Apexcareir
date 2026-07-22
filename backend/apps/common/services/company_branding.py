from pathlib import Path
import base64
import mimetypes

from django.conf import settings

from apps.common.models import CompanySettings

DEFAULT_BUSINESS_EMAIL = "apexcareir@gmail.com"
DEFAULT_BUSINESS_PHONE = "0745902757"


def get_media_base_url():
    return (
        getattr(settings, "API_PUBLIC_URL", None)
        or getattr(settings, "BACKEND_PUBLIC_URL", None)
        or "http://127.0.0.1:8000"
    ).rstrip("/")


def get_default_logo_path():
    base = Path(settings.BASE_DIR)
    candidates = [
        base.parent / "public" / "logo.jpeg",
        base.parent / "src" / "images" / "logo.jpeg",
        base / "apps" / "common" / "static" / "branding" / "logo.jpeg",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return str(candidate)
    return None


def materialize_field_file(field_file, *, suffix=""):
    """Return a local filesystem path for a FieldFile (supports database storage)."""
    if not field_file:
        return None
    try:
        path = field_file.path
        if path and Path(path).is_file():
            return path
    except Exception:
        pass

    import tempfile

    name = getattr(field_file, "name", "") or "asset"
    guessed_suffix = Path(name).suffix or suffix or ".bin"
    try:
        field_file.open("rb")
        payload = field_file.read()
    except Exception:
        return None
    finally:
        try:
            field_file.close()
        except Exception:
            pass
    if not payload:
        return None
    handle = tempfile.NamedTemporaryFile(delete=False, suffix=guessed_suffix)
    handle.write(payload if isinstance(payload, (bytes, bytearray)) else bytes(payload))
    handle.close()
    return handle.name


def get_company_logo_path(company=None):
    company = company or CompanySettings.get_solo()
    if company.logo:
        materialized = materialize_field_file(company.logo, suffix=".png")
        if materialized:
            return materialized
    return get_default_logo_path()


def get_logo_email_data_uri(logo_path=None):
    logo_path = logo_path or get_company_logo_path()
    if not logo_path or not Path(logo_path).is_file():
        return None
    mime_type, _ = mimetypes.guess_type(logo_path)
    if not mime_type:
        mime_type = "image/jpeg"
    try:
        encoded = base64.b64encode(Path(logo_path).read_bytes()).decode("ascii")
    except OSError:
        return None
    return f"data:{mime_type};base64,{encoded}"


def resolve_logo_email_src(branding=None):
    branding = branding or get_company_branding()
    return branding.get("logo_email_src") or branding.get("logo_url")


def build_report_email_header_html(*, title: str, subtitle: str = "", branding=None):
    branding = branding or get_company_branding()
    logo_src = resolve_logo_email_src(branding)
    company_name = (
        str(branding["company_name"])
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    safe_title = (
        str(title)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    safe_subtitle = (
        str(subtitle)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )
    contact_bits = [
        branding.get("support_email") or branding.get("email") or DEFAULT_BUSINESS_EMAIL,
        branding.get("phone") or DEFAULT_BUSINESS_PHONE,
        branding.get("website"),
    ]
    contact_line = " · ".join(filter(None, contact_bits))
    logo_html = (
        f'<img src="{logo_src}" alt="{company_name} logo" '
        'style="display:block;width:72px;height:72px;object-fit:contain;'
        'background:#ffffff;border-radius:14px;padding:8px;'
        'border:2px solid rgba(255,255,255,0.85);'
        'box-shadow:0 8px 24px rgba(0,0,0,0.18);" />'
        if logo_src
        else (
            '<div style="display:inline-block;width:72px;height:72px;border-radius:14px;'
            'background:#ffffff;color:#6E2C3E;font-weight:700;line-height:72px;text-align:center;">'
            "AC</div>"
        )
    )
    subtitle_html = (
        f'<p style="margin:8px 0 0;font-size:13px;opacity:0.92;">{safe_subtitle}</p>' if subtitle else ""
    )
    contact_html = (
        f'<p style="margin:6px 0 0;font-size:12px;opacity:0.88;">{contact_line}</p>' if contact_line else ""
    )
    return f"""
    <div style="padding:20px 22px;background:linear-gradient(135deg,#123528 0%,#1B4D3E 35%,#6E2C3E 72%,#B8952F 100%);color:#fff;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="width:88px;vertical-align:top;">{logo_html}</td>
          <td style="vertical-align:top;padding-left:14px;">
            <span style="font-size:20px;font-weight:700;line-height:1.3;">{safe_title}</span>
            {subtitle_html}
            {contact_html}
          </td>
        </tr>
      </table>
    </div>
    """


def get_company_branding():
    company = CompanySettings.get_solo()
    media_base = get_media_base_url()
    logo_path = get_company_logo_path(company)
    logo_email_src = get_logo_email_data_uri(logo_path)
    if company.logo:
        logo_url = f"{media_base}{company.logo.url}"
    else:
        logo_url = f"{getattr(settings, 'FRONTEND_APP_URL', 'http://localhost:5173').rstrip('/')}/logo.jpeg"

    support_email = company.support_email or company.email or DEFAULT_BUSINESS_EMAIL
    business_email = company.email or DEFAULT_BUSINESS_EMAIL
    business_phone = company.phone or DEFAULT_BUSINESS_PHONE

    return {
        "company_name": company.company_name,
        "address": company.address,
        "email": business_email,
        "phone": business_phone,
        "website": company.website,
        "support_email": support_email,
        "invoice_footer_text": company.invoice_footer_text,
        "tax_information": company.tax_information,
        "logo_url": logo_url,
        "logo_path": logo_path,
        "logo_email_src": logo_email_src or logo_url,
    }


def invoice_contact_lines(branding=None):
    branding = branding or get_company_branding()
    return [
        f"Phone: {branding['phone']}",
        f"Email: {branding['support_email']}",
    ]


def branding_contact_line(branding=None):
    branding = branding or get_company_branding()
    return " | ".join(
        filter(
            None,
            [
                branding.get("email"),
                branding.get("phone"),
                branding.get("website"),
                branding.get("address"),
            ],
        )
    )


def branding_header_rows():
    branding = get_company_branding()
    rows = [[branding["company_name"]]]
    contact = branding_contact_line(branding)
    if contact:
        rows.append([contact])
    rows.append([])
    return rows


def write_branded_xlsx_header(worksheet, start_row=1):
    branding = get_company_branding()
    row = start_row
    logo_path = branding.get("logo_path")
    if logo_path:
        try:
            from openpyxl.drawing.image import Image as XLImage

            image = XLImage(logo_path)
            image.width = 110
            image.height = 55
            worksheet.add_image(image, f"A{row}")
            row += 4
        except Exception:
            pass

    worksheet.cell(row=row, column=1, value=branding["company_name"])
    row += 1
    contact = branding_contact_line(branding)
    if contact:
        worksheet.cell(row=row, column=1, value=contact)
        row += 1
    row += 1
    return row


def draw_branded_pdf_header(pdf, height, y):
    branding = get_company_branding()
    logo_path = branding.get("logo_path")
    if logo_path:
        try:
            from reportlab.lib.utils import ImageReader

            pdf.drawImage(ImageReader(logo_path), 40, y - 42, width=90, height=42, preserveAspectRatio=True, mask="auto")
            y -= 50
        except Exception:
            pass

    pdf.setFont("Helvetica-Bold", 12)
    pdf.drawString(40, y, branding["company_name"])
    y -= 14
    contact = branding_contact_line(branding)
    if contact:
        pdf.setFont("Helvetica", 8)
        pdf.drawString(40, y, contact[:120])
        y -= 16
    y -= 6
    return y


def build_branded_email_html(*, subject: str, body_html: str, footer_note: str = ""):
    branding = get_company_branding()
    company_name = branding["company_name"]
    footer = footer_note or f"{company_name} · {branding['support_email']} · Inventory & Business Management System"
    header_html = build_report_email_header_html(
        title=company_name,
        subtitle=subject,
        branding=branding,
    )
    return f"""
    <div style="font-family: Arial, sans-serif; background:#f7fafc; padding:24px; color:#1f2937;">
      <div style="max-width:680px; margin:0 auto; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
        {header_html}
        <div style="padding:20px;">
          {body_html}
        </div>
        <div style="padding:14px 20px; background:#f3f4f6; color:#6b7280; font-size:12px;">
          {footer}
        </div>
      </div>
    </div>
    """
