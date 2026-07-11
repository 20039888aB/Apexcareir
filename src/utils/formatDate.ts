export function formatIsoDate(isoDate: string) {
  if (!isoDate) {
    return '—';
  }
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Date(year, month - 1, day).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthValue(monthValue: string) {
  if (!monthValue) {
    return 'Select month';
  }
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) {
    return monthValue;
  }
  return new Date(year, month - 1, 1).toLocaleDateString('en-KE', {
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
