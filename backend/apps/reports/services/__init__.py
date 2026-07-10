import csv
import io
from decimal import Decimal

from django.db.models import DecimalField, F, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.http import HttpResponse
from openpyxl import Workbook
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from apps.finance.models import Expense, Payroll
from apps.inventory.models import Product, StockReceipt
from apps.sales.models import Sale

REPORT_TYPES = {"sales", "inventory", "profit", "expenses", "performance"}


def _to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def build_report_payload(report_type, start_date, end_date, search):
    if report_type == "sales":
        return _sales_report(start_date, end_date, search)
    if report_type == "inventory":
        return _inventory_report(start_date, end_date, search)
    if report_type == "profit":
        return _profit_report(start_date, end_date, search)
    if report_type == "expenses":
        return _expense_report(start_date, end_date, search)
    if report_type == "performance":
        return _performance_report(start_date, end_date, search)
    raise ValueError("Invalid report type")


def _sales_report(start_date, end_date, search):
    queryset = Sale.objects.select_related("product", "salesperson").filter(date__gte=start_date, date__lte=end_date)
    if search:
        queryset = queryset.filter(
            Q(invoice_number__icontains=search)
            | Q(customer__icontains=search)
            | Q(product__name__icontains=search)
            | Q(product__sku__icontains=search)
        )

    rows = list(
        queryset.order_by("-date", "-created_at").values(
            "invoice_number",
            "customer",
            "product__name",
            "quantity",
            "price",
            "discount",
            "tax",
            "total",
            "profit",
            "salesperson__email",
            "date",
        )
    )
    total_sales = _to_float(
        queryset.aggregate(
            total=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]
    )
    total_profit = _to_float(
        queryset.aggregate(
            total=Coalesce(Sum("profit"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]
    )

    return {
        "title": "Sales Report",
        "filename": "sales-report",
        "summary": {
            "records": len(rows),
            "total_sales": total_sales,
            "total_profit": total_profit,
        },
        "columns": [
            {"key": "invoice_number", "label": "Invoice"},
            {"key": "customer", "label": "Customer"},
            {"key": "product__name", "label": "Product"},
            {"key": "quantity", "label": "Quantity"},
            {"key": "price", "label": "Price"},
            {"key": "discount", "label": "Discount"},
            {"key": "tax", "label": "Tax"},
            {"key": "total", "label": "Total"},
            {"key": "profit", "label": "Profit"},
            {"key": "salesperson__email", "label": "Salesperson"},
            {"key": "date", "label": "Date"},
        ],
        "results": rows,
    }


def _inventory_report(start_date, end_date, search):
    queryset = Product.objects.select_related("category", "supplier").all()
    if search:
        queryset = queryset.filter(Q(name__icontains=search) | Q(sku__icontains=search))

    rows = list(
        queryset.order_by("name").values(
            "name",
            "sku",
            "category__name",
            "supplier__name",
            "current_stock",
            "minimum_stock",
            "purchase_price",
            "selling_price",
            "status",
        )
    )
    inventory_value = _to_float(
        queryset.aggregate(
            total=Coalesce(
                Sum(F("current_stock") * F("purchase_price"), output_field=DecimalField(max_digits=16, decimal_places=2)),
                Value(0, output_field=DecimalField(max_digits=16, decimal_places=2)),
            )
        )["total"]
    )
    low_stock_count = queryset.filter(current_stock__lte=F("minimum_stock")).count()

    return {
        "title": "Inventory Report",
        "filename": "inventory-report",
        "summary": {
            "records": len(rows),
            "inventory_value": inventory_value,
            "low_stock_count": low_stock_count,
        },
        "columns": [
            {"key": "name", "label": "Product"},
            {"key": "sku", "label": "SKU"},
            {"key": "category__name", "label": "Category"},
            {"key": "supplier__name", "label": "Supplier"},
            {"key": "current_stock", "label": "Current Stock"},
            {"key": "minimum_stock", "label": "Minimum Stock"},
            {"key": "purchase_price", "label": "Purchase Price"},
            {"key": "selling_price", "label": "Selling Price"},
            {"key": "status", "label": "Status"},
        ],
        "results": rows,
    }


def _profit_report(start_date, end_date, search):
    queryset = Sale.objects.select_related("product").filter(date__gte=start_date, date__lte=end_date)
    if search:
        queryset = queryset.filter(Q(invoice_number__icontains=search) | Q(customer__icontains=search))

    rows = list(
        queryset.order_by("-date").values(
            "invoice_number",
            "customer",
            "product__name",
            "quantity",
            "cost_price",
            "price",
            "total",
            "profit",
            "date",
        )
    )
    total_revenue = _to_float(
        queryset.aggregate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )
    total_profit = _to_float(
        queryset.aggregate(total=Coalesce(Sum("profit"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )

    return {
        "title": "Profit Report",
        "filename": "profit-report",
        "summary": {
            "records": len(rows),
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "profit_margin_percent": round((total_profit / total_revenue * 100), 2) if total_revenue else 0,
        },
        "columns": [
            {"key": "invoice_number", "label": "Invoice"},
            {"key": "customer", "label": "Customer"},
            {"key": "product__name", "label": "Product"},
            {"key": "quantity", "label": "Quantity"},
            {"key": "cost_price", "label": "Cost Price"},
            {"key": "price", "label": "Selling Price"},
            {"key": "total", "label": "Total"},
            {"key": "profit", "label": "Profit"},
            {"key": "date", "label": "Date"},
        ],
        "results": rows,
    }


def _expense_report(start_date, end_date, search):
    queryset = Expense.objects.filter(date__gte=start_date, date__lte=end_date)
    if search:
        queryset = queryset.filter(Q(category__icontains=search) | Q(description__icontains=search))

    rows = list(
        queryset.order_by("-date").values(
            "category",
            "expense_type",
            "business_area",
            "amount",
            "description",
            "payment_method",
            "date",
        )
    )
    total_expenses = _to_float(
        queryset.aggregate(total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )

    return {
        "title": "Expense Report",
        "filename": "expense-report",
        "summary": {
            "records": len(rows),
            "total_expenses": total_expenses,
        },
        "columns": [
            {"key": "date", "label": "Date"},
            {"key": "expense_type", "label": "Expense Type"},
            {"key": "category", "label": "Category"},
            {"key": "business_area", "label": "Business Area"},
            {"key": "amount", "label": "Amount"},
            {"key": "payment_method", "label": "Payment Method"},
            {"key": "description", "label": "Description"},
        ],
        "results": rows,
    }


def _performance_report(start_date, end_date, search):
    sales_queryset = Sale.objects.filter(date__gte=start_date, date__lte=end_date)
    expense_queryset = Expense.objects.filter(date__gte=start_date, date__lte=end_date)
    payroll_queryset = Payroll.objects.filter(payment_date__gte=start_date, payment_date__lte=end_date)
    receipts_queryset = StockReceipt.objects.filter(date_received__gte=start_date, date_received__lte=end_date)

    total_revenue = _to_float(
        sales_queryset.aggregate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )
    total_expenses = _to_float(
        expense_queryset.aggregate(total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )
    total_payroll = _to_float(
        payroll_queryset.aggregate(
            total=Coalesce(Sum("net_salary"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]
    )
    total_profit = _to_float(
        sales_queryset.aggregate(total=Coalesce(Sum("profit"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))))[
            "total"
        ]
    )
    net_business_result = total_revenue - total_expenses - total_payroll

    results = [
        {
            "metric": "Total Revenue",
            "value": total_revenue,
        },
        {"metric": "Total Expenses", "value": total_expenses},
        {"metric": "Total Payroll", "value": total_payroll},
        {"metric": "Total Sales Profit", "value": total_profit},
        {"metric": "Net Business Result", "value": net_business_result},
        {"metric": "Sales Transactions", "value": sales_queryset.count()},
        {"metric": "Expense Records", "value": expense_queryset.count()},
        {"metric": "Payroll Records", "value": payroll_queryset.count()},
        {"metric": "Purchase Receipts", "value": receipts_queryset.count()},
    ]

    return {
        "title": "Business Performance Report",
        "filename": "business-performance-report",
        "summary": {
            "total_revenue": total_revenue,
            "total_expenses": total_expenses,
            "total_payroll": total_payroll,
            "net_business_result": net_business_result,
        },
        "columns": [
            {"key": "metric", "label": "Metric"},
            {"key": "value", "label": "Value"},
        ],
        "results": results,
    }


def export_as_csv(payload):
    response = HttpResponse(content_type="text/csv")
    response["Content-Disposition"] = f'attachment; filename="{payload["filename"]}.csv"'

    writer = csv.writer(response)
    writer.writerow([payload["title"]])
    writer.writerow([])
    writer.writerow(["Summary"])
    for key, value in payload["summary"].items():
        writer.writerow([key, value])
    writer.writerow([])
    writer.writerow([column["label"] for column in payload["columns"]])
    for row in payload["results"]:
        writer.writerow([row.get(column["key"], "") for column in payload["columns"]])
    return response


def export_as_xlsx(payload):
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "Report"

    worksheet.append([payload["title"]])
    worksheet.append([])
    worksheet.append(["Summary"])
    for key, value in payload["summary"].items():
        worksheet.append([key, value])
    worksheet.append([])
    worksheet.append([column["label"] for column in payload["columns"]])
    for row in payload["results"]:
        worksheet.append([row.get(column["key"], "") for column in payload["columns"]])

    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)

    response = HttpResponse(
        output.getvalue(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{payload["filename"]}.xlsx"'
    return response


def export_as_pdf(payload):
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    _, height = A4
    y = height - 40

    pdf.setFont("Helvetica-Bold", 14)
    pdf.drawString(40, y, payload["title"])
    y -= 24

    pdf.setFont("Helvetica-Bold", 10)
    pdf.drawString(40, y, "Summary")
    y -= 16
    pdf.setFont("Helvetica", 9)
    for key, value in payload["summary"].items():
        pdf.drawString(40, y, f"{key}: {value}")
        y -= 14
        if y < 80:
            pdf.showPage()
            y = height - 40
            pdf.setFont("Helvetica", 9)

    y -= 8
    pdf.setFont("Helvetica-Bold", 9)
    headers = " | ".join(column["label"] for column in payload["columns"])
    pdf.drawString(40, y, headers[:150])
    y -= 14
    pdf.setFont("Helvetica", 8)

    for row in payload["results"]:
        row_text = " | ".join(str(row.get(column["key"], "")) for column in payload["columns"])
        pdf.drawString(40, y, row_text[:150])
        y -= 12
        if y < 60:
            pdf.showPage()
            y = height - 40
            pdf.setFont("Helvetica", 8)

    pdf.save()
    output.seek(0)
    response = HttpResponse(output.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{payload["filename"]}.pdf"'
    return response
