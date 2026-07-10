from apps.common.services.numbering import allocate_document_number


def assign_product_number(instance):
    if not instance.product_number:
        instance.product_number = allocate_document_number("product")
    return instance


def assign_supplier_number(instance):
    if not instance.supplier_number:
        instance.supplier_number = allocate_document_number("supplier")
    return instance


def assign_expense_number(instance):
    if not instance.expense_number:
        instance.expense_number = allocate_document_number("expense")
    return instance


def assign_employee_number(instance):
    if not instance.employee_number:
        instance.employee_number = allocate_document_number("employee")
    return instance


def assign_receipt_number(instance):
    if not instance.receipt_number:
        instance.receipt_number = allocate_document_number("stock_receipt")
    return instance


def assign_adjustment_number(instance):
    if not instance.adjustment_number:
        instance.adjustment_number = allocate_document_number("stock_adjustment")
    return instance
