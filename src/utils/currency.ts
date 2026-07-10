export const DEFAULT_USD_TO_KES_RATE = 129;
export const EXCHANGE_RATE_STORAGE_KEY = 'apexcareir.usd_to_kes_rate';

export function getStoredUsdToKesRate(): number {
  if (typeof window === 'undefined') {
    return DEFAULT_USD_TO_KES_RATE;
  }
  const stored = window.localStorage.getItem(EXCHANGE_RATE_STORAGE_KEY);
  const parsed = Number(stored);
  return parsed > 0 ? parsed : DEFAULT_USD_TO_KES_RATE;
}

export function storeUsdToKesRate(rate: number): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(EXCHANGE_RATE_STORAGE_KEY, String(rate));
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function convertUsdToKes(usd: number, rate: number): number {
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return roundMoney(usd * rate);
}

export function convertKesToUsd(kes: number, rate: number): number {
  if (!Number.isFinite(kes) || !Number.isFinite(rate) || rate <= 0) {
    return 0;
  }
  return roundMoney(kes / rate);
}

export function formatKes(value: number | string): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatUsd(value: number | string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function formatDualCurrency(kesValue: number | string, rate: number): string {
  const kes = Number(kesValue || 0);
  const usd = convertKesToUsd(kes, rate);
  return `${formatKes(kes)} / ${formatUsd(usd)}`;
}
