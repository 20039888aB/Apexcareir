from calendar import monthrange
from datetime import date
import re
from typing import Optional, Tuple

from django.conf import settings
from django.utils import timezone

MONTH_PARAM_PATTERN = re.compile(r"^\d{4}-(0[1-9]|1[0-2])$")


def get_system_clock_payload() -> dict:
    now = timezone.now()
    local_now = timezone.localtime(now)
    local_date = timezone.localdate()
    month_start = local_date.replace(day=1)
    _, last_day = monthrange(local_date.year, local_date.month)
    month_end = local_date.replace(day=last_day)

    return {
        "timezone": settings.TIME_ZONE,
        "utc_now": now.isoformat(),
        "local_now": local_now.isoformat(),
        "local_date": local_date.isoformat(),
        "local_time": local_now.strftime("%H:%M:%S"),
        "month_start": month_start.isoformat(),
        "month_end": month_end.isoformat(),
        "year": local_date.year,
        "month": local_date.month,
    }


def _month_bounds(year: int, month: int) -> Tuple[date, date]:
    start = date(year, month, 1)
    _, last_day = monthrange(year, month)
    end = date(year, month, last_day)
    return start, end


def resolve_report_date_range(
    *,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    month: Optional[str] = None,
    on_date: Optional[date] = None,
) -> Tuple[date, date, str]:
    today = timezone.localdate()

    if start_date or end_date:
        resolved_start = start_date or today.replace(day=1)
        resolved_end = end_date or today
        if resolved_start > resolved_end:
            resolved_start, resolved_end = resolved_end, resolved_start
        period_label = f"{resolved_start.isoformat()} to {resolved_end.isoformat()}"
        return resolved_start, resolved_end, period_label

    month_value = (month or "").strip()
    if month_value:
        if not MONTH_PARAM_PATTERN.match(month_value):
            raise ValueError("month must use YYYY-MM format.")
        year_str, month_str = month_value.split("-")
        month_start, month_end = _month_bounds(int(year_str), int(month_str))
        if month_start.year == today.year and month_start.month == today.month:
            month_end = today
        period_label = month_start.strftime("%B %Y")
        return month_start, month_end, period_label

    if on_date:
        period_label = on_date.isoformat()
        return on_date, on_date, period_label

    default_start = today.replace(day=1)
    period_label = f"{default_start.strftime('%B %Y')} (month to date)"
    return default_start, today, period_label
