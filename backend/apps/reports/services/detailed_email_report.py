from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from apps.common.services.company_branding import build_report_email_header_html, get_company_branding
from apps.finance.models import Expense, Payroll
from apps.inventory.models import Product, StockReceipt
from apps.reports.services import build_report_payload
from apps.reports.services.weekly_insights import build_period_insights
from apps.sales.models import Sale

from apps.notifications.models import EmailNotificationLog, Notification
from apps.notifications.services import NotificationService, _resolve_recipient_emails, _resolve_recipient_users, process_pending_email_logs


def _dec(value):
    return Decimal(str(value or 0))


def _money(value):
    amount = Decimal(str(value or 0))
    return f"KES {amount:,.2f}"


def _escape(value):
    return (
        str(value or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def _table(headers, rows):
    if not rows:
        return '<p style="margin:0;color:#64748b;font-size:13px;">No records for this section.</p>'

    head_html = "".join(
        f'<th style="padding:8px 10px;border-bottom:2px solid #e2e8f0;text-align:left;font-size:12px;color:#475569;">{_escape(h)}</th>'
        for h in headers
    )
    body_html = ""
    for row in rows:
        body_html += "<tr>"
        for cell in row:
            body_html += (
                f'<td style="padding:8px 10px;border-bottom:1px solid #f1f5f9;font-size:12px;color:#0f172a;">{_escape(cell)}</td>'
            )
        body_html += "</tr>"
    return (
        '<table style="width:100%;border-collapse:collapse;margin-top:8px;background:#fff;">'
        f"<thead><tr>{head_html}</tr></thead><tbody>{body_html}</tbody></table>"
    )


def _section(title, content_html):
    return f"""
    <section style="margin-bottom:24px;">
      <h3 style="margin:0 0 8px;font-size:16px;color:#1B4D3E;border-bottom:2px solid #B8952F;padding-bottom:6px;">{title}</h3>
      {content_html}
    </section>
    """


def _percent(value):
    return f"{Decimal(str(value or 0)):.2f}%"


def _bullet_list(items):
    if not items:
        return '<p style="margin:0;color:#64748b;font-size:13px;">No recommendations for this period.</p>'
    bullets = "".join(
        f'<li style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#334155;">{_escape(item)}</li>' for item in items
    )
    return f'<ul style="margin:8px 0 0;padding-left:18px;">{bullets}</ul>'


def _result_banner(label, amount, margin_pct):
    positive = _dec(amount) >= 0
    bg = "#ecfdf5" if positive else "#fef2f2"
    border = "#10b981" if positive else "#ef4444"
    text = "#065f46" if positive else "#991b1b"
    return f"""
    <div style="margin-top:10px;padding:12px 14px;border:1px solid {border};background:{bg};border-radius:10px;">
      <p style="margin:0;font-size:13px;color:{text};"><strong>{_escape(label)}:</strong> {_money(amount)} · Margin {_percent(margin_pct)}</p>
    </div>
    """


def build_detailed_period_report_html(*, period_label: str, start_date, end_date):
    insights = build_period_insights(start_date=start_date, end_date=end_date)
    snapshot = insights["snapshot"]
    sales = build_report_payload("sales", start_date, end_date, "")
    inventory = build_report_payload("inventory", start_date, end_date, "")
    expenses = build_report_payload("expenses", start_date, end_date, "")
    performance = build_report_payload("performance", start_date, end_date, "")

    sales_rows = [
        [
            row.get("date"),
            row.get("invoice_number"),
            row.get("customer"),
            row.get("product__name"),
            row.get("quantity"),
            _money(row.get("total")),
            _money(row.get("profit")),
        ]
        for row in sales["results"]
    ]

    inventory_rows = [
        [
            row.get("sku"),
            row.get("name"),
            row.get("category__name") or "-",
            row.get("current_stock"),
            row.get("minimum_stock"),
            _money(row.get("purchase_price")),
            _money(row.get("selling_price")),
            row.get("status"),
        ]
        for row in inventory["results"]
    ]

    receipt_rows = list(
        StockReceipt.objects.select_related("product", "supplier")
        .filter(date_received__gte=start_date, date_received__lte=end_date)
        .order_by("-date_received", "-created_at")
        .values(
            "date_received",
            "invoice_number",
            "supplier__name",
            "product__name",
            "product__sku",
            "quantity",
            "purchase_price",
        )
    )
    receipt_table_rows = [
        [
            row["date_received"],
            row["invoice_number"],
            row["supplier__name"] or "-",
            f"{row['product__name']} ({row['product__sku']})",
            row["quantity"],
            _money(row["purchase_price"]),
        ]
        for row in receipt_rows
    ]

    expense_rows = []
    expense_by_type = {}
    for row in expenses["results"]:
        expense_type = row.get("expense_type") or row.get("category")
        expense_type_label = dict(Expense.ExpenseType.choices).get(expense_type, expense_type)
        business_area_label = dict(Expense.BusinessArea.choices).get(
            row.get("business_area", Expense.BusinessArea.SHARED),
            row.get("business_area", "shared"),
        )
        expense_rows.append(
            [
                row.get("date"),
                expense_type_label,
                row.get("category"),
                business_area_label,
                _money(row.get("amount")),
                row.get("payment_method"),
                row.get("description") or "-",
            ]
        )
        expense_by_type[expense_type_label] = expense_by_type.get(expense_type_label, Decimal("0")) + Decimal(
            str(row.get("amount") or 0)
        )

    payroll_rows = list(
        Payroll.objects.filter(payment_date__gte=start_date, payment_date__lte=end_date)
        .order_by("-payment_date")
        .values("payment_date", "employee", "salary", "allowances", "deductions", "net_salary", "notes")
    )
    payroll_table_rows = [
        [
            row["payment_date"],
            row["employee"],
            _money(row["salary"]),
            _money(row["allowances"]),
            _money(row["deductions"]),
            _money(row["net_salary"]),
            row["notes"] or "-",
        ]
        for row in payroll_rows
    ]

    summary = performance["summary"]
    now = timezone.localtime().strftime("%Y-%m-%d %H:%M")
    branding = get_company_branding()
    company_name = branding["company_name"]
    header_html = build_report_email_header_html(
        title=f"{company_name} {period_label} Business Report",
        subtitle=f"Period: {start_date} to {end_date} · Generated {now}",
        branding=branding,
    )

    expense_type_summary_rows = [[label, _money(total)] for label, total in sorted(expense_by_type.items())]

    low_stock = [row for row in inventory["results"] if (row.get("current_stock") or 0) <= (row.get("minimum_stock") or 0)]

    stock_movement_rows = [
        [
            row["sku"],
            row["name"],
            row["qty_sold"],
            _money(row["revenue"]),
            _money(row["profit"]),
            _percent(row["margin_pct"]),
            row["remaining_stock"],
            row["stock_status"],
        ]
        for row in insights["stock_movement"]
    ]

    top_seller_rows = [
        [row["sku"], row["name"], row["qty_sold"], _money(row["revenue"]), _money(row["profit"]), _percent(row["margin_pct"]), row["remaining_stock"]]
        for row in insights["top_sellers"]
    ]

    slow_mover_rows = [
        [row["sku"], row["name"], row["qty_sold"], _money(row["revenue"]), row["remaining_stock"]]
        for row in insights["slow_movers"]
    ]

    unsold_rows = [
        [row["sku"], row["name"], row["remaining_stock"], row["minimum_stock"]]
        for row in insights["unsold_products"]
    ]

    high_margin_rows = [
        [row["sku"], row["name"], _percent(row["margin_pct"]), _money(row["profit"]), row["qty_sold"], _money(row["revenue"])]
        for row in insights["highest_margin"]
    ]

    low_margin_rows = [
        [row["sku"], row["name"], _percent(row["margin_pct"]), _money(row["profit"]), row["qty_sold"], _money(row["revenue"])]
        for row in insights["lowest_margin"]
    ]

    return f"""
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
      <div style="max-width:920px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden;">
        {header_html}
        <div style="padding:22px;">
          {_section(
              "Weekly Performance Snapshot" if period_label.lower() == "weekly" else "Period Performance Snapshot",
              _table(
                  ["Metric", "Value"],
                  [
                      ["Money Made (Revenue)", _money(snapshot["revenue"])],
                      ["Units Sold", str(snapshot["units_sold"])],
                      ["Sales Transactions", str(snapshot["transactions"])],
                      ["Stock Received in Period", str(snapshot["stock_received"])],
                      ["Gross Sales Profit", _money(snapshot["gross_profit"])],
                      ["Gross Profit Margin", _percent(snapshot["profit_margin_pct"])],
                      ["Operating Expenses", _money(snapshot["total_expenses"])],
                      ["Payroll", _money(snapshot["total_payroll"])],
                      [f"Net {snapshot['result_label']}", _money(snapshot["net_result"])],
                      ["Net Margin on Revenue", _percent(snapshot["net_margin_pct"])],
                      ["Inventory Value (Remaining Stock Value)", _money(inventory["summary"].get("inventory_value"))],
                  ],
              )
              + _result_banner("Gross Result", snapshot["gross_profit"], snapshot["profit_margin_pct"])
              + _result_banner(f"Net {snapshot['result_label']}", snapshot["net_result"], snapshot["net_margin_pct"]),
          )}
          {_section(
              "What To Do Next — Insights & Recommendations",
              _bullet_list(insights["recommendations"]),
          )}
          {_section(
              "Stock Sold vs Remaining (After This Period)",
              _table(
                  ["SKU", "Product", "Qty Sold", "Revenue", "Profit", "Margin", "Remaining Stock", "Status"],
                  stock_movement_rows,
              ),
          )}
          {_section(
              "Top Sellers / Overselling Items",
              _table(
                  ["SKU", "Product", "Qty Sold", "Revenue", "Profit", "Margin", "Remaining"],
                  top_seller_rows,
              ),
          )}
          {_section(
              "Slow Movers / Not Selling Well",
              _table(
                  ["SKU", "Product", "Qty Sold", "Revenue", "Remaining Stock"],
                  slow_mover_rows,
              ),
          )}
          {_section(
              "Active Products With No Sales This Period",
              _table(
                  ["SKU", "Product", "Remaining Stock", "Minimum Stock"],
                  unsold_rows,
              )
              if unsold_rows
              else '<p style="margin:0;color:#047857;font-size:13px;">All active products recorded at least one sale this period.</p>',
          )}
          {_section(
              "Highest Profit Margin Products",
              _table(
                  ["SKU", "Product", "Margin", "Profit", "Qty Sold", "Revenue"],
                  high_margin_rows,
              ),
          )}
          {_section(
              "Lowest Profit Margin Products",
              _table(
                  ["SKU", "Product", "Margin", "Profit", "Qty Sold", "Revenue"],
                  low_margin_rows,
              ),
          )}
          {_section(
              "Executive Summary",
              _table(
                  ["Metric", "Value"],
                  [
                      ["Total Revenue", _money(summary.get("total_revenue"))],
                      ["Total Operating Expenses", _money(summary.get("total_expenses"))],
                      ["Total Payroll", _money(summary.get("total_payroll"))],
                      ["Net Business Result", _money(summary.get("net_business_result"))],
                      ["Inventory Value (Current)", _money(inventory["summary"].get("inventory_value"))],
                      ["Low Stock Items", str(inventory["summary"].get("low_stock_count", 0))],
                      ["Sales Transactions", str(sales["summary"].get("records", 0))],
                      ["Stock Receipts in Period", str(len(receipt_rows))],
                  ],
              ),
          )}
          {_section(
              "Sales (Every Transaction)",
              _table(
                  ["Date", "Invoice", "Customer", "Product", "Qty", "Total", "Profit"],
                  sales_rows,
              ),
          )}
          {_section(
              "Inventory (Current Stock & Remaining Quantities)",
              _table(
                  ["SKU", "Product", "Category", "In Stock", "Min Stock", "Buy Price", "Sell Price", "Status"],
                  inventory_rows,
              ),
          )}
          {_section(
              "Low Stock Alerts",
              _table(
                  ["SKU", "Product", "In Stock", "Min Stock"],
                  [
                      [row.get("sku"), row.get("name"), row.get("current_stock"), row.get("minimum_stock")]
                      for row in low_stock
                  ],
              )
              if low_stock
              else '<p style="margin:0;color:#047857;font-size:13px;">No low-stock alerts at report time.</p>',
          )}
          {_section(
              "Inventory Received in Period",
              _table(
                  ["Date", "Invoice", "Supplier", "Product", "Qty", "Unit Cost"],
                  receipt_table_rows,
              ),
          )}
          {_section(
              "Expenses by Type (Summary)",
              _table(["Expense Type", "Total"], expense_type_summary_rows),
          )}
          {_section(
              "Expenses (Every Record)",
              _table(
                  ["Date", "Expense Type", "Category", "Business Area", "Amount", "Payment", "Description"],
                  expense_rows,
              ),
          )}
          {_section(
              "Payroll in Period",
              _table(
                  ["Date", "Employee", "Salary", "Allowances", "Deductions", "Net Pay", "Notes"],
                  payroll_table_rows,
              ),
          )}
        </div>
        <div style="padding:14px 22px;background:#f1f5f9;color:#64748b;font-size:12px;">
          {_escape(company_name)} · {_escape(branding['support_email'])} · Detailed automated business report
        </div>
      </div>
    </div>
    """


def build_detailed_period_report_summary(*, period_label: str, start_date, end_date):
    insights = build_period_insights(start_date=start_date, end_date=end_date)
    snapshot = insights["snapshot"]
    top_name = insights["top_sellers"][0]["name"] if insights["top_sellers"] else "N/A"
    return (
        f"{period_label} report ({start_date} to {end_date}): "
        f"Made {_money(snapshot['revenue'])}, sold {snapshot['units_sold']} units, "
        f"gross profit {_money(snapshot['gross_profit'])} ({_percent(snapshot['profit_margin_pct'])}), "
        f"net {snapshot['result_label'].lower()} {_money(snapshot['net_result'])}. "
        f"Top seller: {top_name}. See email for stock remaining, margins, and improvement actions."
    )


def queue_detailed_period_report(*, period_label: str, start_date, end_date, event_code: str, dedup_key: str, priority: str):
    summary_message = build_detailed_period_report_summary(
        period_label=period_label,
        start_date=start_date,
        end_date=end_date,
    )
    html_content = build_detailed_period_report_html(
        period_label=period_label,
        start_date=start_date,
        end_date=end_date,
    )
    subject = f"ApexCareIR {period_label} Business Report ({start_date} to {end_date})"

    NotificationService.send(
        title=f"{period_label} Business Report Ready",
        message=summary_message,
        event_code=event_code,
        notification_type=Notification.NotificationType.REPORT,
        priority=priority,
        ui_type=Notification.Type.INFO,
        dedup_key=dedup_key,
        related_module="reports",
        reference_id=dedup_key,
    )

    recipient_users = _resolve_recipient_users(Notification.NotificationType.REPORT)
    recipient_emails = _resolve_recipient_emails(Notification.NotificationType.REPORT, recipient_users)
    for email in recipient_emails:
        EmailNotificationLog.objects.create(
            recipient=email,
            subject=subject[:200],
            html_content=html_content,
            status=EmailNotificationLog.Status.QUEUED,
        )

    process_pending_email_logs(limit=50)
    return {
        "period_label": period_label,
        "start_date": start_date,
        "end_date": end_date,
        "recipients": recipient_emails,
        "subject": subject,
    }
