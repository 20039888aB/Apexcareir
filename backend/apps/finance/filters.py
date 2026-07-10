import django_filters

from .models import Expense, Payroll


class ExpenseFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="date", lookup_expr="lte")

    expense_type = django_filters.CharFilter(field_name="expense_type")
    business_area = django_filters.CharFilter(field_name="business_area")

    class Meta:
        model = Expense
        fields = ["category", "payment_method", "expense_type", "business_area"]


class PayrollFilterSet(django_filters.FilterSet):
    start_date = django_filters.DateFilter(field_name="payment_date", lookup_expr="gte")
    end_date = django_filters.DateFilter(field_name="payment_date", lookup_expr="lte")

    class Meta:
        model = Payroll
        fields = ["employee"]
