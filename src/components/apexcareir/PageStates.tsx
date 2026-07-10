import type { ReactNode } from 'react';

type PageErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

type EmptyStateProps = {
  title: string;
  message: string;
  action?: ReactNode;
};

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="apex-glass-panel p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="apex-skeleton h-4 w-full rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function PageErrorState({ message, onRetry }: PageErrorStateProps) {
  return (
    <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      <p>{message}</p>
      {onRetry && (
        <button className="apex-btn-soft mt-3" onClick={onRetry}>
          Retry
        </button>
      )}
    </section>
  );
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs text-slate-600">{message}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </section>
  );
}
