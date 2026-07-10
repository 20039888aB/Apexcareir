export const EXPENSE_TYPES = [
  { value: 'website_hosting', label: 'Website & Hosting' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'rent', label: 'Rent & Facilities' },
  { value: 'transport', label: 'Transport & Logistics' },
  { value: 'supplies', label: 'Office & Supplies' },
  { value: 'inventory', label: 'Inventory Purchases' },
  { value: 'payroll', label: 'Payroll & Salaries' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'licenses', label: 'Licenses & Compliance' },
  { value: 'maintenance', label: 'Maintenance & Repairs' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'taxes', label: 'Taxes & Fees' },
  { value: 'other', label: 'Other' },
] as const;

export const BUSINESS_AREAS = [
  { value: 'clinic', label: 'Clinic / IR Services' },
  { value: 'website', label: 'Website & Digital' },
  { value: 'shared', label: 'Shared / General' },
] as const;

export function expenseTypeLabel(value: string) {
  return EXPENSE_TYPES.find((item) => item.value === value)?.label ?? value;
}

export function businessAreaLabel(value: string) {
  return BUSINESS_AREAS.find((item) => item.value === value)?.label ?? value;
}
