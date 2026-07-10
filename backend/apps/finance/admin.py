from django.contrib import admin
from .models import Expense, Payroll


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("category", "amount", "payment_method", "date")
    list_filter = ("payment_method", "date")
    search_fields = ("category", "description")


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ("employee", "salary", "allowances", "deductions", "net_salary", "payment_date")
    list_filter = ("payment_date",)
    search_fields = ("employee", "notes")
