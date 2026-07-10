import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type DashboardCollapsiblePanelProps = {
  title: string;
  subtitle?: string;
  count?: number;
  tone?: 'sales' | 'purchases' | 'receipts';
  children: ReactNode;
};

export default function DashboardCollapsiblePanel({
  title,
  subtitle,
  count = 0,
  tone = 'sales',
  children,
}: DashboardCollapsiblePanelProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article className={`apex-dashboard-collapsible apex-dashboard-collapsible--${tone}`}>
      <button
        type="button"
        className="apex-dashboard-collapsible-toggle"
        onClick={() => setExpanded((previous) => !previous)}
        aria-expanded={expanded}
      >
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-[11px] text-slate-500">
            {expanded ? subtitle ?? 'Click to collapse' : `${count} record${count === 1 ? '' : 's'} · Click to expand`}
          </span>
        </span>
        <span className="flex items-center gap-2">
          <span className="apex-dashboard-collapsible-count">{count}</span>
          <ChevronDown
            size={16}
            className={`apex-dashboard-collapsible-chevron ${expanded ? 'apex-dashboard-collapsible-chevron--expanded' : ''}`}
            aria-hidden
          />
        </span>
      </button>

      <div className={`apex-dashboard-collapsible-content ${expanded ? 'apex-dashboard-collapsible-content--expanded' : ''}`}>
        <div className="apex-dashboard-collapsible-content-inner">
          <div className="p-4 pt-2">{children}</div>
        </div>
      </div>
    </article>
  );
}
