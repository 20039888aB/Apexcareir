from rest_framework import serializers

from apps.common.services.auto_number import assign_expense_number, assign_employee_number

from .models import Expense, Payroll


class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = [
            "id",
            "expense_number",
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
        read_only_fields = ["id", "expense_number", "created_at", "updated_at"]

    def create(self, validated_data):
        expense = Expense(**validated_data)
        assign_expense_number(expense)
        expense.save()
        return expense


class PayrollSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee_number",
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
        read_only_fields = ["id", "employee_number", "net_salary", "created_at", "updated_at"]

    def create(self, validated_data):
        payroll = Payroll(**validated_data)
        assign_employee_number(payroll)
        payroll.save()
        return payroll
