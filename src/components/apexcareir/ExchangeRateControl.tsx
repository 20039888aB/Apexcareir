import { storeUsdToKesRate } from '../../utils/currency';

type ExchangeRateControlProps = {
  rate: number;
  onRateChange: (rate: number) => void;
  className?: string;
};

export default function ExchangeRateControl({ rate, onRateChange, className = '' }: ExchangeRateControlProps) {
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-950 ${className}`}>
      <p className="font-medium">Internal currency converter</p>
      <p className="mt-1 text-amber-900/80">
        Enter prices in USD or KSH — the other amount updates automatically. Stored records use KSH.
      </p>
      <label className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-medium">1 USD =</span>
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={rate}
          onChange={(event) => {
            const nextRate = Number(event.target.value);
            if (!Number.isFinite(nextRate) || nextRate <= 0) {
              return;
            }
            onRateChange(nextRate);
            storeUsdToKesRate(nextRate);
          }}
          className="w-28"
        />
        <span className="font-medium">KSH</span>
      </label>
    </div>
  );
}
