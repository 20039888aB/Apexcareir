from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import Count, DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce, TruncDate, TruncMonth
from django.utils import timezone

from apps.finance.models import Expense
from apps.appointments.models import Appointment, ContactRequest
from apps.inventory.models import Product, StockReceipt
from apps.notifications.models import EmailNotificationLog, ScheduledJob
from apps.sales.models import Invoice, Sale


def _to_float(value):
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _sum_or_zero(queryset, field_name):
    aggregate = queryset.aggregate(total=Coalesce(Sum(field_name), Value(0, output_field=DecimalField())))
    return aggregate["total"] or Decimal("0")


def _normalize_month_key(value):
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    return value


def build_dashboard_overview():
    today = timezone.localdate()
    now = timezone.now()
    month_start = today.replace(day=1)

    today_sales = _sum_or_zero(Sale.objects.filter(date=today), "total")
    today_profit = _sum_or_zero(Sale.objects.filter(date=today), "profit")
    monthly_sales = _sum_or_zero(Sale.objects.filter(date__gte=month_start, date__lte=today), "total")
    monthly_expenses = _sum_or_zero(Expense.objects.filter(date__gte=month_start, date__lte=today), "amount")
    monthly_profit = _sum_or_zero(Sale.objects.filter(date__gte=month_start, date__lte=today), "profit")

    inventory_value = Product.objects.aggregate(
        total=Coalesce(
            Sum(F("current_stock") * F("purchase_price"), output_field=DecimalField(max_digits=18, decimal_places=2)),
            Value(0, output_field=DecimalField(max_digits=18, decimal_places=2)),
        )
    )["total"]

    low_stock_count = Product.objects.filter(current_stock__lte=F("minimum_stock"), status=Product.Status.ACTIVE).count()
    pending_invoices = Invoice.objects.filter(
        payment_status__in=[Invoice.PaymentStatus.UNPAID, Invoice.PaymentStatus.PARTIALLY_PAID],
        status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID],
    ).count()
    outstanding_invoice_amount = Invoice.objects.filter(
        payment_status__in=[Invoice.PaymentStatus.UNPAID, Invoice.PaymentStatus.PARTIALLY_PAID],
        status__in=[Invoice.Status.ISSUED, Invoice.Status.PARTIALLY_PAID, Invoice.Status.DRAFT],
    ).aggregate(
        total=Coalesce(
            Sum(F("grand_total") - F("amount_paid"), output_field=DecimalField(max_digits=14, decimal_places=2)),
            Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
        )
    )["total"]
    top_buyers = list(
        Invoice.objects.filter(customer__isnull=False)
        .values("customer_id", "customer__name", "customer__company_name", "customer__customer_number")
        .annotate(
            total_spent=Coalesce(Sum("grand_total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
            invoice_count=Count("id"),
        )
        .order_by("-total_spent")[:5]
    )
    pending_appointments = Appointment.objects.filter(status=Appointment.Status.PENDING).count()
    pending_contact_requests = ContactRequest.objects.filter(status=ContactRequest.Status.NEW).count()
    failed_email_notifications = EmailNotificationLog.objects.filter(status=EmailNotificationLog.Status.FAILED).count()

    active_scheduler_jobs = ScheduledJob.objects.filter(is_active=True).count()
    overdue_scheduler_jobs = ScheduledJob.objects.filter(is_active=True, next_run_at__lte=now).count()
    failed_scheduler_jobs = ScheduledJob.objects.filter(
        is_active=True, last_status=ScheduledJob.LastStatus.FAILED
    ).count()
    scheduler_health = "healthy"
    if failed_scheduler_jobs > 0 or overdue_scheduler_jobs > 3:
        scheduler_health = "critical"
    elif overdue_scheduler_jobs > 0:
        scheduler_health = "warning"

    recent_sales = list(
        Sale.objects.select_related("product", "salesperson")
        .order_by("-date", "-created_at")[:10]
        .values(
            "id",
            "invoice_number",
            "customer",
            "quantity",
            "total",
            "profit",
            "date",
            "product__name",
            "salesperson__email",
        )
    )

    recent_purchases = list(
        StockReceipt.objects.select_related("product", "supplier")
        .order_by("-date_received", "-created_at")[:10]
        .values(
            "id",
            "invoice_number",
            "date_received",
            "quantity",
            "purchase_price",
            "product__name",
            "supplier__name",
        )
    )

    recent_stock_receipts = list(
        StockReceipt.objects.select_related("product", "received_by")
        .order_by("-date_received", "-created_at")[:10]
        .values(
            "id",
            "invoice_number",
            "date_received",
            "quantity",
            "batch_number",
            "product__name",
            "received_by__email",
        )
    )

    return {
        "cards": {
            "today_sales": _to_float(today_sales),
            "today_profit": _to_float(today_profit),
            "monthly_sales": _to_float(monthly_sales),
            "inventory_value": _to_float(inventory_value),
            "profit": _to_float(monthly_profit),
            "monthly_expenses": _to_float(monthly_expenses),
            "low_stock_count": low_stock_count,
            "pending_invoices": pending_invoices,
            "outstanding_invoice_amount": _to_float(outstanding_invoice_amount),
            "monthly_revenue": _to_float(monthly_sales),
            "pending_appointments": pending_appointments,
            "pending_contact_requests": pending_contact_requests,
            "failed_email_notifications": failed_email_notifications,
            "active_scheduler_jobs": active_scheduler_jobs,
            "overdue_scheduler_jobs": overdue_scheduler_jobs,
            "failed_scheduler_jobs": failed_scheduler_jobs,
            "scheduler_health": scheduler_health,
        },
        "recent_sales": recent_sales,
        "recent_purchases": recent_purchases,
        "recent_stock_receipts": recent_stock_receipts,
        "charts": {
            "sales_trend": build_sales_trend(),
            "revenue_trend": build_revenue_trend(),
            "inventory_trend": build_inventory_trend(),
        },
        "insights": build_business_insights(),
        "top_buyers": top_buyers,
    }


def build_sales_trend(days=7):
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    sale_points = (
        Sale.objects.filter(date__gte=start_date, date__lte=today)
        .annotate(day=TruncDate("date"))
        .values("day")
        .annotate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField())), count=Count("id"))
        .order_by("day")
    )
    mapped_points = {point["day"]: point for point in sale_points}

    results = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        point = mapped_points.get(day)
        results.append(
            {
                "date": day.isoformat(),
                "sales": _to_float(point["total"]) if point else 0.0,
                "count": int(point["count"]) if point else 0,
            }
        )
    return results


def build_revenue_trend(months=6):
    today = timezone.localdate()
    month_cursor = today.replace(day=1)
    month_keys = []
    for _ in range(months):
        month_keys.append(month_cursor)
        previous_month_end = month_cursor - timedelta(days=1)
        month_cursor = previous_month_end.replace(day=1)
    month_keys.reverse()

    sales_data = (
        Sale.objects.filter(date__gte=month_keys[0])
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField())))
    )
    expense_data = (
        Expense.objects.filter(date__gte=month_keys[0])
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField())))
    )

    sales_map = {_normalize_month_key(item["month"]): item["total"] for item in sales_data}
    expense_map = {_normalize_month_key(item["month"]): item["total"] for item in expense_data}

    results = []
    for month in month_keys:
        sales_total = sales_map.get(month, Decimal("0"))
        expenses_total = expense_map.get(month, Decimal("0"))
        results.append(
            {
                "month": month.strftime("%b %Y"),
                "sales": _to_float(sales_total),
                "expenses": _to_float(expenses_total),
                "profit": _to_float(sales_total - expenses_total),
            }
        )
    return results


def build_inventory_trend(months=6):
    today = timezone.localdate()
    month_cursor = today.replace(day=1)
    month_keys = []
    for _ in range(months):
        month_keys.append(month_cursor)
        previous_month_end = month_cursor - timedelta(days=1)
        month_cursor = previous_month_end.replace(day=1)
    month_keys.reverse()

    received_data = (
        StockReceipt.objects.filter(date_received__gte=month_keys[0])
        .annotate(month=TruncMonth("date_received"))
        .values("month")
        .annotate(total=Coalesce(Sum("quantity"), Value(0)))
    )
    sold_data = (
        Sale.objects.filter(date__gte=month_keys[0])
        .annotate(month=TruncMonth("date"))
        .values("month")
        .annotate(total=Coalesce(Sum("quantity"), Value(0)))
    )

    received_map = {_normalize_month_key(item["month"]): int(item["total"]) for item in received_data}
    sold_map = {_normalize_month_key(item["month"]): int(item["total"]) for item in sold_data}

    results = []
    for month in month_keys:
        received_qty = received_map.get(month, 0)
        sold_qty = sold_map.get(month, 0)
        results.append(
            {
                "month": month.strftime("%b %Y"),
                "received": received_qty,
                "sold": sold_qty,
                "net": received_qty - sold_qty,
            }
        )
    return results


def _month_start(current_date):
    return current_date.replace(day=1)


def _previous_month_start(current_month_start):
    return (current_month_start - timedelta(days=1)).replace(day=1)


def _average_daily_sales_by_product(days=30):
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)
    sales_totals = (
        Sale.objects.filter(date__gte=start_date, date__lte=today)
        .values("product_id")
        .annotate(total_qty=Coalesce(Sum("quantity"), Value(0)))
    )
    return {item["product_id"]: float(item["total_qty"]) / float(days) for item in sales_totals if item["product_id"]}


def build_business_insights():
    today = timezone.localdate()
    current_month_start = _month_start(today)
    previous_month_start = _previous_month_start(current_month_start)
    previous_month_end = current_month_start - timedelta(days=1)

    most_sold_products = list(
        Sale.objects.values("product_id", "product__name", "product__sku")
        .annotate(
            total_quantity=Coalesce(Sum("quantity"), Value(0)),
            total_sales=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
        )
        .order_by("-total_quantity", "-total_sales")[:5]
    )

    least_sold_products = list(
        Sale.objects.values("product_id", "product__name", "product__sku")
        .annotate(
            total_quantity=Coalesce(Sum("quantity"), Value(0)),
            total_sales=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
        )
        .filter(total_quantity__gt=0)
        .order_by("total_quantity", "total_sales")[:5]
    )

    average_daily_sales_map = _average_daily_sales_by_product(days=30)
    active_products = Product.objects.filter(status=Product.Status.ACTIVE).values(
        "id",
        "name",
        "sku",
        "current_stock",
        "minimum_stock",
    )

    stockout_risk = []
    reorder_suggestions = []
    for product in active_products:
        average_daily_sales = average_daily_sales_map.get(product["id"], 0.0)
        if average_daily_sales > 0:
            days_left = round(product["current_stock"] / average_daily_sales, 1)
        else:
            days_left = None

        is_low_stock = product["current_stock"] <= product["minimum_stock"]
        is_at_risk_soon = days_left is not None and days_left <= 14

        if is_low_stock or is_at_risk_soon:
            risk_item = {
                "product_name": product["name"],
                "sku": product["sku"],
                "current_stock": product["current_stock"],
                "minimum_stock": product["minimum_stock"],
                "average_daily_sales": round(average_daily_sales, 2),
                "estimated_days_left": days_left,
            }
            stockout_risk.append(risk_item)
            reorder_suggestions.append(risk_item)

    stockout_risk.sort(
        key=lambda item: (
            item["estimated_days_left"] is None,
            item["estimated_days_left"] if item["estimated_days_left"] is not None else 9999,
            item["current_stock"],
        )
    )
    reorder_suggestions.sort(
        key=lambda item: (
            item["current_stock"] - item["minimum_stock"],
            item["estimated_days_left"] if item["estimated_days_left"] is not None else 9999,
        )
    )

    current_month_sales = _sum_or_zero(
        Sale.objects.filter(date__gte=current_month_start, date__lte=today),
        "total",
    )
    previous_month_sales = _sum_or_zero(
        Sale.objects.filter(date__gte=previous_month_start, date__lte=previous_month_end),
        "total",
    )
    current_month_profit = _sum_or_zero(
        Sale.objects.filter(date__gte=current_month_start, date__lte=today),
        "profit",
    )
    previous_month_profit = _sum_or_zero(
        Sale.objects.filter(date__gte=previous_month_start, date__lte=previous_month_end),
        "profit",
    )

    sales_growth_percent = (
        round((_to_float(current_month_sales - previous_month_sales) / _to_float(previous_month_sales)) * 100, 2)
        if previous_month_sales
        else 0.0
    )
    profit_growth_percent = (
        round((_to_float(current_month_profit - previous_month_profit) / _to_float(previous_month_profit)) * 100, 2)
        if previous_month_profit
        else 0.0
    )

    monthly_growth_trend = []
    trend_points = build_revenue_trend(months=6)
    previous_sales = None
    for point in trend_points:
        growth = 0.0
        if previous_sales and previous_sales > 0:
            growth = round(((point["sales"] - previous_sales) / previous_sales) * 100, 2)
        monthly_growth_trend.append(
            {
                "month": point["month"],
                "sales": point["sales"],
                "expenses": point["expenses"],
                "profit": point["profit"],
                "sales_growth_percent": growth,
            }
        )
        previous_sales = point["sales"]

    return {
        "most_sold_products": most_sold_products,
        "least_sold_products": least_sold_products,
        "stockout_risk": stockout_risk[:8],
        "reorder_suggestions": reorder_suggestions[:8],
        "growth_summary": {
            "current_month_sales": _to_float(current_month_sales),
            "previous_month_sales": _to_float(previous_month_sales),
            "sales_growth_percent": sales_growth_percent,
            "current_month_profit": _to_float(current_month_profit),
            "previous_month_profit": _to_float(previous_month_profit),
            "profit_growth_percent": profit_growth_percent,
        },
        "monthly_growth_trend": monthly_growth_trend,
    }
