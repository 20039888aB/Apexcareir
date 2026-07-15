export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-8" role="status" aria-live="polite" aria-label="Loading page">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gold/25 border-t-gold" />
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    </div>
  );
}
