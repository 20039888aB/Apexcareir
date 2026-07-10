from django.db import models


class Expense(models.Model):
    class PaymentMethod(models.TextChoices):
        CASH = "cash", "Cash"
        BANK = "bank", "Bank Transfer"
        MOBILE = "mobile", "Mobile Money"
        CARD = "card", "Card"

    class ExpenseType(models.TextChoices):
        WEBSITE_HOSTING = "website_hosting", "Website & Hosting"
        MARKETING = "marketing", "Marketing & Advertising"
        UTILITIES = "utilities", "Utilities"
        RENT = "rent", "Rent & Facilities"
        TRANSPORT = "transport", "Transport & Logistics"
        SUPPLIES = "supplies", "Office & Supplies"
        INVENTORY = "inventory", "Inventory Purchases"
        PAYROLL = "payroll", "Payroll & Salaries"
        INSURANCE = "insurance", "Insurance"
        LICENSES = "licenses", "Licenses & Compliance"
        MAINTENANCE = "maintenance", "Maintenance & Repairs"
        PROFESSIONAL = "professional", "Professional Services"
        TAXES = "taxes", "Taxes & Fees"
        OTHER = "other", "Other"

    class BusinessArea(models.TextChoices):
        CLINIC = "clinic", "Clinic / IR Services"
        WEBSITE = "website", "Website & Digital"
        SHARED = "shared", "Shared / General"

    category = models.CharField(max_length=120)
    expense_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    expense_type = models.CharField(
        max_length=40,
        choices=ExpenseType.choices,
        default=ExpenseType.OTHER,
    )
    business_area = models.CharField(
        max_length=20,
        choices=BusinessArea.choices,
        default=BusinessArea.SHARED,
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=20, choices=PaymentMethod.choices, default=PaymentMethod.CASH)
    date = models.DateField()
    receipt = models.ImageField(upload_to="expense_receipts/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["date"]),
            models.Index(fields=["category"]),
            models.Index(fields=["expense_type"]),
            models.Index(fields=["business_area"]),
        ]

    def __str__(self):
        return f"{self.category} - {self.amount}"


class Payroll(models.Model):
    employee_number = models.CharField(max_length=30, unique=True, null=True, blank=True)
    employee = models.CharField(max_length=255)
    salary = models.DecimalField(max_digits=12, decimal_places=2)
    allowances = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_salary = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-payment_date", "-created_at"]
        indexes = [models.Index(fields=["payment_date"]), models.Index(fields=["employee"])]

    def save(self, *args, **kwargs):
        self.net_salary = self.salary + self.allowances - self.deductions
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee} - {self.payment_date}"
