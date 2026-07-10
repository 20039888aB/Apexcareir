import django_filters
from django.db.models import F

from .models import Product, StockAdjustment, StockReceipt, StockTransfer


class ProductFilterSet(django_filters.FilterSet):
    low_stock = django_filters.BooleanFilter(method="filter_low_stock")

    class Meta:
        model = Product
        fields = {
            "status": ["exact"],
            "category": ["exact"],
            "supplier": ["exact"],
            "is_archived": ["exact"],
        }

    def filter_low_stock(self, queryset, name, value):
        if value:
            return queryset.filter(current_stock__lte=F("minimum_stock"))
        return queryset


class StockReceiptFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date_received", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date_received", lookup_expr="lte")

    class Meta:
        model = StockReceipt
        fields = ["product", "supplier", "invoice_number"]


class StockTransferFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = StockTransfer
        fields = ["product", "destination", "customer"]


class StockAdjustmentFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = StockAdjustment
        fields = ["product", "reason", "operation"]
