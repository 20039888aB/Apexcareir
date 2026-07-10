import { convertKesToUsd, convertUsdToKes } from '../../utils/currency';

type DualCurrencyInputProps = {
  label?: string;
  kesValue: string;
  onKesChange: (value: string) => void;
  usdRate: number;
  kesPlaceholder?: string;
  usdPlaceholder?: string;
  required?: boolean;
  compact?: boolean;
  className?: string;
};

export default function DualCurrencyInput({
  label,
  kesValue,
  onKesChange,
  usdRate,
  kesPlaceholder = 'Amount (KSH)',
  usdPlaceholder = 'Amount (USD)',
  required = false,
  compact = false,
  className = '',
}: DualCurrencyInputProps) {
  const usdValue = kesValue === '' ? '' : String(convertKesToUsd(Number(kesValue), usdRate));

  const handleUsdChange = (raw: string) => {
    if (raw === '') {
      onKesChange('');
      return;
    }
    const usd = Number(raw);
    if (!Number.isFinite(usd)) {
      return;
    }
    onKesChange(String(convertUsdToKes(usd, usdRate)));
  };

  const handleKesChange = (raw: string) => {
    if (raw === '') {
      onKesChange('');
      return;
    }
    const kes = Number(raw);
    if (!Number.isFinite(kes)) {
      return;
    }
    onKesChange(String(kes));
  };

  return (
    <div className={className}>
      {label ? <p className="mb-1 text-[11px] font-medium text-slate-600">{label}</p> : null}
      <div className={compact ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2'}>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={usdPlaceholder}
          value={usdValue}
          onChange={(event) => handleUsdChange(event.target.value)}
          required={required}
        />
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder={kesPlaceholder}
          value={kesValue}
          onChange={(event) => handleKesChange(event.target.value)}
          required={required}
        />
      </div>
    </div>
  );
}
