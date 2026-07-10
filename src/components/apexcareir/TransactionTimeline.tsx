import { useQuery } from '@tanstack/react-query';
import { getTransactionTimeline } from '../../services/timelineService';

type TransactionTimelineProps = {
  referenceNumber: string;
  module?: string;
};

const EVENT_LABELS: Record<string, string> = {
  created: 'Created',
  issued: 'Issued',
  sent: 'Sent',
  emailed: 'Sent',
  viewed: 'Viewed',
  paid: 'Paid',
  updated: 'Updated',
  adjusted: 'Updated',
  cancelled: 'Cancelled',
  partially_paid: 'Partially Paid',
  regenerated: 'Regenerated',
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString('en-KE');
}

function formatEventType(value: string) {
  return EVENT_LABELS[value] || value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function TransactionTimeline({ referenceNumber, module }: TransactionTimelineProps) {
  const timelineQuery = useQuery({
    queryKey: ['timeline', referenceNumber, module],
    queryFn: () => getTransactionTimeline(referenceNumber, module),
    enabled: Boolean(referenceNumber),
  });

  if (timelineQuery.isLoading) {
    return <p className="text-xs text-slate-500">Loading activity timeline...</p>;
  }

  if (timelineQuery.isError) {
    return <p className="text-xs text-red-600">Unable to load activity timeline.</p>;
  }

  const events = timelineQuery.data?.results ?? [];
  if (events.length === 0) {
    return <p className="text-xs text-slate-500">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-3 border-l border-slate-200 pl-4">
      {events.map((event) => (
        <li key={event.id} className="relative">
          <span className="absolute -left-[1.35rem] top-1 h-2.5 w-2.5 rounded-full bg-apex-primary" />
          <p className="text-xs font-semibold text-slate-800">{formatEventType(event.event_type)}</p>
          <p className="text-[11px] text-slate-600">{event.description}</p>
          <p className="mt-0.5 text-[10px] text-slate-500">
            {formatTimestamp(event.created_at)}
            {event.user_email ? ` · ${event.user_email}` : ''}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function InvoiceActivitySummary({ invoiceNumber }: { invoiceNumber: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
      <p className="text-xs font-semibold text-slate-800">Activity Timeline</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Created · Sent · Viewed · Paid · Updated</p>
      <div className="mt-2">
        <TransactionTimeline referenceNumber={invoiceNumber} module="invoices" />
      </div>
    </div>
  );
}
