import { httpClient } from '../api';

export type SystemClock = {
  timezone: string;
  utc_now: string;
  local_now: string;
  local_date: string;
  local_time: string;
  month_start: string;
  month_end: string;
  year: number;
  month: number;
};

export async function getSystemClock() {
  const response = await httpClient.get<SystemClock>('/system/clock/');
  return response.data;
}
