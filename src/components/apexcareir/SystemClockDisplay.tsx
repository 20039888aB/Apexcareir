import { Clock3 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useServerClock } from '../../hooks/useServerClock';

function formatDisplayDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatClockTime(date: Date) {
  return date.toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export default function SystemClockDisplay() {
  const { clock, localDate, timezone } = useServerClock();
  const [displayTime, setDisplayTime] = useState('');

  useEffect(() => {
    if (!clock?.local_now) {
      return;
    }

    const serverNow = new Date(clock.local_now);
    setDisplayTime(formatClockTime(serverNow));

    const intervalId = window.setInterval(() => {
      serverNow.setSeconds(serverNow.getSeconds() + 1);
      setDisplayTime(formatClockTime(serverNow));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [clock?.local_now]);

  return (
    <div
      className="hidden items-center gap-2 rounded-full border border-[rgba(184,149,47,0.16)] bg-white/70 px-3 py-1.5 text-xs text-slate-600 md:flex"
      title={`System timezone: ${timezone}`}
    >
      <Clock3 size={14} className="text-apex-primary" aria-hidden />
      <span className="font-medium text-slate-700">{formatDisplayDate(localDate)}</span>
      <span className="text-slate-400">·</span>
      <span>{displayTime || '--:--:--'}</span>
    </div>
  );
}
