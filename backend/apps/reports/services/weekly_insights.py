from decimal import Decimal

from django.db.models import Count, DecimalField, F, Sum, Value
from django.db.models.functions import Coalesce

from apps.finance.models import Expense, Payroll
from apps.inventory.models import Product, StockReceipt
from apps.sales.models import Sale


def _dec(value):
    return Decimal(str(value or 0))


def _pct(numerator, denominator):
    if not denominator:
        return Decimal("0")
    return (numerator / denominator * Decimal("100")).quantize(Decimal("0.01"))


def build_period_insights(*, start_date, end_date):
    sales_qs = Sale.objects.filter(date__gte=start_date, date__lte=end_date)
    revenue = _dec(sales_qs.aggregate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField())))["total"])
    gross_profit = _dec(sales_qs.aggregate(total=Coalesce(Sum("profit"), Value(0, output_field=DecimalField())))["total"])
    units_sold = int(sales_qs.aggregate(total=Coalesce(Sum("quantity"), Value(0)))["total"] or 0)
    transaction_count = sales_qs.count()

    total_expenses = _dec(
        Expense.objects.filter(date__gte=start_date, date__lte=end_date).aggregate(
            total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField()))
        )["total"]
    )
    total_payroll = _dec(
        Payroll.objects.filter(payment_date__gte=start_date, payment_date__lte=end_date).aggregate(
            total=Coalesce(Sum("net_salary"), Value(0, output_field=DecimalField()))
        )["total"]
    )
    stock_received = int(
        StockReceipt.objects.filter(date_received__gte=start_date, date_received__lte=end_date).aggregate(
            total=Coalesce(Sum("quantity"), Value(0))
        )["total"]
        or 0
    )

    net_result = gross_profit - total_expenses - total_payroll
    profit_margin_pct = _pct(gross_profit, revenue)
    net_margin_pct = _pct(net_result, revenue)

    product_sales = list(
        sales_qs.values("product_id", "product__name", "product__sku", "product__current_stock", "product__minimum_stock")
        .annotate(
            qty_sold=Coalesce(Sum("quantity"), Value(0)),
            revenue=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
            profit=Coalesce(Sum("profit"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2))),
            cost_total=Coalesce(
                Sum(F("quantity") * F("cost_price"), output_field=DecimalField(max_digits=14, decimal_places=2)),
                Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)),
            ),
            transactions=Count("id"),
        )
        .order_by("-qty_sold")
    )

    stock_movement = []
    for row in product_sales:
        row_revenue = _dec(row["revenue"])
        row_profit = _dec(row["profit"])
        margin_pct = _pct(row_profit, row_revenue)
        remaining = int(row["product__current_stock"] or 0)
        stock_movement.append(
            {
                "sku": row["product__sku"],
                "name": row["product__name"],
                "qty_sold": int(row["qty_sold"] or 0),
                "revenue": row_revenue,
                "profit": row_profit,
                "margin_pct": margin_pct,
                "remaining_stock": remaining,
                "transactions": int(row["transactions"] or 0),
                "stock_status": _stock_status(remaining, int(row["product__minimum_stock"] or 0)),
            }
        )

    sold_product_ids = {row["product_id"] for row in product_sales if int(row["qty_sold"] or 0) > 0}
    active_products = Product.objects.filter(status=Product.Status.ACTIVE, is_archived=False)
    unsold_products = [
        {
            "sku": product.sku,
            "name": product.name,
            "remaining_stock": product.current_stock,
            "minimum_stock": product.minimum_stock,
        }
        for product in active_products
        if product.id not in sold_product_ids
    ]

    sold_rows = [row for row in stock_movement if row["qty_sold"] > 0]
    top_sellers = sorted(sold_rows, key=lambda item: item["qty_sold"], reverse=True)[:5]
    slow_movers = sorted(sold_rows, key=lambda item: (item["qty_sold"], item["revenue"]))[:5]

    margin_rows = [row for row in sold_rows if row["revenue"] > 0]
    highest_margin = sorted(margin_rows, key=lambda item: item["margin_pct"], reverse=True)[:5]
    lowest_margin = sorted(margin_rows, key=lambda item: item["margin_pct"])[:5]

    recommendations = _build_recommendations(
        revenue=revenue,
        gross_profit=gross_profit,
        net_result=net_result,
        profit_margin_pct=profit_margin_pct,
        top_sellers=top_sellers,
        slow_movers=slow_movers,
        unsold_products=unsold_products,
        highest_margin=highest_margin,
        lowest_margin=lowest_margin,
        stock_movement=stock_movement,
        transaction_count=transaction_count,
    )

    return {
        "snapshot": {
            "revenue": revenue,
            "units_sold": units_sold,
            "transactions": transaction_count,
            "gross_profit": gross_profit,
            "profit_margin_pct": profit_margin_pct,
            "total_expenses": total_expenses,
            "total_payroll": total_payroll,
            "net_result": net_result,
            "net_margin_pct": net_margin_pct,
            "stock_received": stock_received,
            "result_label": "Profit" if net_result >= 0 else "Loss",
            "gross_result_label": "Profit" if gross_profit >= 0 else "Loss",
        },
        "stock_movement": stock_movement,
        "top_sellers": top_sellers,
        "slow_movers": slow_movers,
        "unsold_products": unsold_products[:10],
        "highest_margin": highest_margin,
        "lowest_margin": lowest_margin,
        "recommendations": recommendations,
    }


def _stock_status(remaining, minimum):
    if remaining <= 0:
        return "Out of stock"
    if remaining <= minimum:
        return "Low stock"
    return "Healthy"


def _build_recommendations(
    *,
    revenue,
    gross_profit,
    net_result,
    profit_margin_pct,
    top_sellers,
    slow_movers,
    unsold_products,
    highest_margin,
    lowest_margin,
    stock_movement,
    transaction_count,
):
    tips = []

    if transaction_count == 0:
        tips.append("No sales were recorded this period. Confirm stock availability, pricing visibility, and follow up on pending leads.")
    else:
        tips.append(f"Recorded {transaction_count} sale(s). Focus follow-up on customers who purchased during this window.")

    if net_result < 0:
        tips.append(
            "The business posted a net loss after expenses and payroll. Cut non-essential spending and push higher-margin products first."
        )
    elif profit_margin_pct < 15:
        tips.append(
            "Gross profit margin is below 15%. Review supplier costs, discounting, and selling prices on low-margin lines."
        )
    else:
        tips.append(
            f"Gross margin is healthy at {profit_margin_pct}%. Maintain pricing discipline while monitoring fast-moving stock."
        )

    for item in top_sellers[:3]:
        if item["remaining_stock"] <= 0:
            tips.append(f"Reorder urgently: {item['name']} ({item['sku']}) is out of stock but sold {item['qty_sold']} unit(s) this period.")
        elif item["stock_status"] == "Low stock":
            tips.append(f"Restock soon: {item['name']} ({item['sku']}) is selling fast with only {item['remaining_stock']} left.")

    for item in highest_margin[:2]:
        if item["qty_sold"] > 0:
            tips.append(
                f"Promote and keep in stock: {item['name']} ({item['sku']}) delivers a strong {item['margin_pct']}% margin."
            )

    for item in lowest_margin[:2]:
        if item["margin_pct"] < 10 and item["qty_sold"] > 0:
            tips.append(
                f"Review pricing or sourcing for {item['name']} ({item['sku']}) — margin is only {item['margin_pct']}%."
            )

    if slow_movers:
        slowest = slow_movers[0]
        tips.append(
            f"Slow mover: {slowest['name']} ({slowest['sku']}) sold only {slowest['qty_sold']} unit(s). Consider promotions or bundle offers."
        )

    if unsold_products:
        names = ", ".join(f"{item['name']} ({item['sku']})" for item in unsold_products[:3])
        tips.append(f"No sales for active items such as {names}. Evaluate display, pricing, or whether to discontinue.")

    low_stock_sold = [row for row in stock_movement if row["qty_sold"] > 0 and row["stock_status"] != "Healthy"]
    if low_stock_sold and not any("Reorder urgently" in tip for tip in tips):
        tips.append("Several sold items are at or below minimum stock. Plan replenishment before the next sales push.")

    if gross_profit > 0 and net_result > 0:
        tips.append("Reinvest part of this period's profit into restocking bestsellers and marketing the highest-margin lines.")

    return tips[:10]
