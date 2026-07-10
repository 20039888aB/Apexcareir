import django_filters

from .models import Sale


class SaleFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    class Meta:
        model = Sale
        fields = ["product", "customer", "salesperson", "invoice_number"]
