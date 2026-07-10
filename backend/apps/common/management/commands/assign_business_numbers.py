from django.core.management.base import BaseCommand

from apps.common.services.auto_number import (
    assign_adjustment_number,
    assign_employee_number,
    assign_expense_number,
    assign_product_number,
    assign_receipt_number,
    assign_supplier_number,
)
from apps.common.services.numbering import allocate_document_number, ensure_default_sequences
from apps.finance.models import Expense, Payroll
from apps.inventory.models import Product, StockAdjustment, StockReceipt, StockReceiptBatch
from apps.sales.models import Customer, Sale
from apps.sales.services.invoice_service import create_invoice_for_sale
from apps.suppliers.models import Supplier


class Command(BaseCommand):
    help = "Assign business reference numbers to existing records and create missing invoices."

    def handle(self, *args, **options):
        ensure_default_sequences()
        counts = {
            "products": 0,
            "suppliers": 0,
            "customers": 0,
            "sales": 0,
            "receipts": 0,
            "batches": 0,
            "adjustments": 0,
            "expenses": 0,
            "payroll": 0,
            "invoices": 0,
        }

        for product in Product.objects.filter(product_number__isnull=True):
            assign_product_number(product)
            product.save(update_fields=["product_number"])
            counts["products"] += 1

        for supplier in Supplier.objects.filter(supplier_number__isnull=True):
            assign_supplier_number(supplier)
            supplier.save(update_fields=["supplier_number"])
            counts["suppliers"] += 1

        for customer in Customer.objects.filter(customer_number__isnull=True):
            customer.customer_number = allocate_document_number("customer")
            customer.save(update_fields=["customer_number"])
            counts["customers"] += 1

        for sale in Sale.objects.filter(sale_number__isnull=True):
            sale.sale_number = allocate_document_number("sale")
            sale.save(update_fields=["sale_number"])
            counts["sales"] += 1

        for batch in StockReceiptBatch.objects.filter(receipt_number__isnull=True):
            assign_receipt_number(batch)
            batch.save(update_fields=["receipt_number"])
            counts["batches"] += 1

        for receipt in StockReceipt.objects.filter(receipt_number__isnull=True):
            number = allocate_document_number("stock_receipt")
            StockReceipt.objects.filter(pk=receipt.pk).update(receipt_number=number)
            counts["receipts"] += 1

        for adjustment in StockAdjustment.objects.filter(adjustment_number__isnull=True):
            number = allocate_document_number("stock_adjustment")
            StockAdjustment.objects.filter(pk=adjustment.pk).update(adjustment_number=number)
            counts["adjustments"] += 1

        for expense in Expense.objects.filter(expense_number__isnull=True):
            assign_expense_number(expense)
            expense.save(update_fields=["expense_number"])
            counts["expenses"] += 1

        for payroll in Payroll.objects.filter(employee_number__isnull=True):
            assign_employee_number(payroll)
            payroll.save(update_fields=["employee_number"])
            counts["payroll"] += 1

        for sale in Sale.objects.filter(invoice_record__isnull=True):
            create_invoice_for_sale(sale)
            counts["invoices"] += 1

        for key, value in counts.items():
            self.stdout.write(self.style.SUCCESS(f"{key}: {value}"))
        self.stdout.write(self.style.SUCCESS("Business numbering backfill complete."))
