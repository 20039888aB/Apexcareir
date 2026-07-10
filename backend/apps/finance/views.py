from datetime import date, datetime, timedelta
from decimal import Decimal

from django.db.models import DecimalField, Sum, Value
from django.db.models.functions import Coalesce, TruncMonth
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import HasBusinessPermission
from apps.audit_logs.services import log_audit_event
from apps.sales.models import Sale

from .filters import ExpenseFilterSet, PayrollFilterSet
from .models import Expense, Payroll
from .serializers import ExpenseSerializer, PayrollSerializer


class PermissionByActionMixin:
    permission_by_action = {}
    any_permissions_by_action = {}

    def get_required_permission(self):
        return self.permission_by_action.get(self.action, self.permission_by_action.get("default"))

    def get_required_any_permissions(self):
        return self.any_permissions_by_action.get(self.action, self.any_permissions_by_action.get("default"))

    def get_permissions(self):
        self.required_permission = self.get_required_permission()
        self.required_any_permissions = self.get_required_any_permissions()
        return [permission() for permission in self.permission_classes]


class ExpenseViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = Expense.objects.all()
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "finance.expense_tracking"}
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ExpenseFilterSet
    search_fields = ["category", "description", "payment_method", "expense_type", "business_area", "expense_number"]
    ordering_fields = ["date", "created_at", "amount", "category", "expense_type", "business_area"]

    def perform_create(self, serializer):
        expense = serializer.save()
        log_audit_event(
            request=self.request,
            action="expense_create",
            module="finance",
            description=f"Added expense in category {expense.category}.",
            target=expense,
            metadata={"amount": float(expense.amount)},
        )


class PayrollViewSet(PermissionByActionMixin, viewsets.ModelViewSet):
    queryset = Payroll.objects.all()
    serializer_class = PayrollSerializer
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    permission_by_action = {"default": "finance.payroll"}
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PayrollFilterSet
    search_fields = ["employee", "notes", "employee_number"]
    ordering_fields = ["payment_date", "created_at", "net_salary", "salary"]

    def perform_create(self, serializer):
        payroll = serializer.save()
        log_audit_event(
            request=self.request,
            action="payroll_create",
            module="finance",
            description=f"Added payroll record for {payroll.employee}.",
            target=payroll,
            metadata={"net_salary": float(payroll.net_salary)},
        )


class FinanceSummaryAPIView(APIView):
    permission_classes = [IsAuthenticated, HasBusinessPermission]
    required_any_permissions = ["finance.expense_tracking", "finance.payroll"]

    def get(self, request):
        today = request.query_params.get("date")
        if today:
            from django.utils.dateparse import parse_date

            base_date = parse_date(today)
        else:
            from django.utils import timezone

            base_date = timezone.localdate()

        if base_date is None:
            from django.utils import timezone

            base_date = timezone.localdate()

        month_start = base_date.replace(day=1)

        monthly_revenue = Sale.objects.filter(date__gte=month_start, date__lte=base_date).aggregate(
            total=Coalesce(Sum("total"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]
        monthly_expenses = Expense.objects.filter(date__gte=month_start, date__lte=base_date).aggregate(
            total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]
        monthly_payroll = Payroll.objects.filter(payment_date__gte=month_start, payment_date__lte=base_date).aggregate(
            total=Coalesce(Sum("net_salary"), Value(0, output_field=DecimalField(max_digits=14, decimal_places=2)))
        )["total"]

        net_cashflow = Decimal(monthly_revenue) - Decimal(monthly_expenses) - Decimal(monthly_payroll)

        monthly_cashflow = self._build_monthly_cashflow(base_date)

        return Response(
            {
                "summary": {
                    "monthly_revenue": float(monthly_revenue),
                    "monthly_expenses": float(monthly_expenses),
                    "monthly_payroll": float(monthly_payroll),
                    "net_cashflow": float(net_cashflow),
                },
                "monthly_cashflow": monthly_cashflow,
            }
        )

    def _build_monthly_cashflow(self, base_date, months=6):
        month_cursor = base_date.replace(day=1)
        month_keys = []
        for _ in range(months):
            month_keys.append(month_cursor)
            previous_month_end = month_cursor - timedelta(days=1)
            month_cursor = previous_month_end.replace(day=1)
        month_keys.reverse()

        revenue_rows = (
            Sale.objects.filter(date__gte=month_keys[0])
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Coalesce(Sum("total"), Value(0, output_field=DecimalField())))
        )
        expense_rows = (
            Expense.objects.filter(date__gte=month_keys[0])
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Coalesce(Sum("amount"), Value(0, output_field=DecimalField())))
        )
        payroll_rows = (
            Payroll.objects.filter(payment_date__gte=month_keys[0])
            .annotate(month=TruncMonth("payment_date"))
            .values("month")
            .annotate(total=Coalesce(Sum("net_salary"), Value(0, output_field=DecimalField())))
        )

        revenue_map = {self._normalize_month_key(item["month"]): item["total"] for item in revenue_rows}
        expense_map = {self._normalize_month_key(item["month"]): item["total"] for item in expense_rows}
        payroll_map = {self._normalize_month_key(item["month"]): item["total"] for item in payroll_rows}

        results = []
        for month in month_keys:
            revenue = revenue_map.get(month, Decimal("0"))
            expenses = expense_map.get(month, Decimal("0"))
            payroll = payroll_map.get(month, Decimal("0"))
            net = revenue - expenses - payroll
            results.append(
                {
                    "month": month.strftime("%b %Y"),
                    "revenue": float(revenue),
                    "expenses": float(expenses),
                    "payroll": float(payroll),
                    "net": float(net),
                }
            )
        return results

    @staticmethod
    def _normalize_month_key(value):
        if isinstance(value, datetime):
            return value.date()
        if isinstance(value, date):
            return value
        return value
