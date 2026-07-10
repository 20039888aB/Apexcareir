PERMISSION_GROUPS = {
    "Inventory": [
        {"code": "inventory.product_management", "label": "Product Management"},
        {"code": "inventory.stock_receiving", "label": "Stock Receiving"},
        {"code": "inventory.stock_transfers", "label": "Stock Transfers"},
        {"code": "inventory.stock_adjustments", "label": "Stock Adjustments"},
        {"code": "inventory.low_stock_alerts", "label": "Low Stock Alerts"},
    ],
    "Sales": [
        {"code": "sales.sales_management", "label": "Sales Management"},
    ],
    "Finance": [
        {"code": "finance.expense_tracking", "label": "Expense Tracking"},
        {"code": "finance.payroll", "label": "Payroll"},
    ],
    "Suppliers": [
        {"code": "suppliers.supplier_management", "label": "Supplier Management"},
    ],
    "Reports": [
        {"code": "reports.reports", "label": "Reports"},
    ],
    "Dashboard": [
        {"code": "dashboard.dashboard", "label": "Dashboard"},
    ],
    "Notifications": [
        {"code": "notifications.notifications", "label": "Notifications"},
    ],
    "Audit Logs": [
        {"code": "audit_logs.audit_logs", "label": "Audit Logs"},
    ],
    "Appointments": [
        {"code": "appointments.appointment_management", "label": "Appointment Management"},
    ],
}

ALL_PERMISSION_CODES = {
    permission["code"]
    for permissions in PERMISSION_GROUPS.values()
    for permission in permissions
}
