from django.contrib import admin
from .models import Sale


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ("invoice_number", "customer", "product", "quantity", "total", "profit", "date")
    list_filter = ("date",)
    search_fields = ("invoice_number", "customer", "product__name", "product__sku")
