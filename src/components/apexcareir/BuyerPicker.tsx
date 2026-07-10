import type { Customer } from '../../services';

type BuyerPickerProps = {
  customers: Customer[];
  value: string;
  logoUrl?: string | null;
  onSelect: (customer: Customer) => void;
  onClear?: () => void;
  isLoading?: boolean;
};

function formatBuyerLabel(customer: Customer) {
  return `${customer.customer_number ? `${customer.customer_number} · ` : ''}${customer.name}${
    customer.company_name ? ` (${customer.company_name})` : ''
  }${customer.phone ? ` · ${customer.phone}` : ''}`;
}

export default function BuyerPicker({
  customers,
  value,
  logoUrl = null,
  onSelect,
  onClear,
  isLoading = false,
}: BuyerPickerProps) {
  return (
    <div className="sm:col-span-2">
      <label className="mb-1 block text-xs font-semibold text-slate-700">Select Saved Buyer</label>
      <select
        value={value}
        disabled={isLoading}
        onChange={(event) => {
          const customerId = event.target.value;
          if (!customerId) {
            onClear?.();
            return;
          }
          const customer = customers.find((item) => item.id === Number(customerId));
          if (customer) {
            onSelect(customer);
          }
        }}
      >
        <option value="">Choose a saved buyer to auto-fill details</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {formatBuyerLabel(customer)}
          </option>
        ))}
      </select>
      {logoUrl ? (
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-slate-200 bg-white/80 p-2">
          <img src={logoUrl} alt="Buyer logo" className="h-10 w-10 rounded object-cover" />
          <p className="text-[11px] text-slate-600">Saved buyer logo loaded. Upload a new file below to replace it.</p>
        </div>
      ) : null}
      <p className="mt-1 text-[11px] text-slate-500">
        Buyer details are saved automatically whenever you create a sale or invoice. Pick a saved buyer here to reuse
        their information.
      </p>
    </div>
  );
}
