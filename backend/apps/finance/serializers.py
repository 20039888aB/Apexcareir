from rest_framework import serializers

from .models import Expense, Payroll


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "category",
            "expense_type",
            "business_area",
            "amount",
            "description",
            "payment_method",
            "date",
            "receipt",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee",
            "salary",
            "allowances",
            "deductions",
            "net_salary",
            "payment_date",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "net_salary", "created_at", "updated_at"]
