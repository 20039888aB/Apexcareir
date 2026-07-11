import { useQuery } from '@tanstack/react-query';
import { getSystemClock } from '../services/serverClockService';

export function browserFallbackDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function shiftIsoDate(baseDate: string, dayOffset: number) {
  const [year, month, day] = baseDate.split('-').map(Number);
  const shifted = new Date(year, month - 1, day + dayOffset);
  const shiftedYear = shifted.getFullYear();
  const shiftedMonth = String(shifted.getMonth() + 1).padStart(2, '0');
  const shiftedDay = String(shifted.getDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

export function monthValueFromDate(isoDate: string) {
  return isoDate.slice(0, 7);
}

export function lastDayOfMonth(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${monthValue}-${String(lastDay).padStart(2, '0')}`;
}

export function previousMonthValue(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number);
  const date = new Date(year, month - 2, 1);
  const prevYear = date.getFullYear();
  const prevMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${prevYear}-${prevMonth}`;
}

export function useServerClock() {
  const query = useQuery({
    queryKey: ['system-clock'],
    queryFn: getSystemClock,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const localDate = query.data?.local_date ?? browserFallbackDate();
  const localTime = query.data?.local_time ?? '';
  const timezone = query.data?.timezone ?? 'Africa/Nairobi';
  const monthStart = query.data?.month_start ?? `${localDate.slice(0, 7)}-01`;
  const monthEnd = query.data?.month_end ?? localDate;

  return {
    clock: query.data,
    isLoading: query.isLoading,
    localDate,
    localTime,
    timezone,
    monthStart,
    monthEnd,
    monthValue: monthValueFromDate(localDate),
  };
}
