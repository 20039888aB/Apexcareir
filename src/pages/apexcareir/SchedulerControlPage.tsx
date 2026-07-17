import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { useAuth } from '../../hooks';
import {
  deleteSchedulerRunLog,
  listScheduledJobRunLogs,
  listScheduledJobs,
  purgeSchedulerRunLogs,
  runScheduledJobNow,
  sendReportNow,
  updateScheduledJob,
  type ScheduledJob,
} from '../../services';

function formatDateTime(value: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-KE');
}

export default function SchedulerControlPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canManage = isSuperAdmin || hasPermission('notifications.notifications');
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [selectedJobKey, setSelectedJobKey] = useState<string>(searchParams.get('job') ?? '');

  const jobsQuery = useQuery({
    queryKey: ['scheduler-jobs'],
    queryFn: listScheduledJobs,
    refetchInterval: 30_000,
  });

  const logsQuery = useQuery({
    queryKey: ['scheduler-run-logs', selectedJobKey],
    queryFn: () => listScheduledJobRunLogs(selectedJobKey || undefined),
  });

  const selectedJob = useMemo(
    () => (jobsQuery.data ?? []).find((job) => job.key === selectedJobKey) ?? null,
    [jobsQuery.data, selectedJobKey],
  );

  const invalidateScheduler = () => {
    queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] });
    queryClient.invalidateQueries({ queryKey: ['scheduler-run-logs'] });
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<ScheduledJob> }) =>
      updateScheduledJob(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['scheduler-jobs'] }),
  });

  const runNowMutation = useMutation({
    mutationFn: (id: number) => runScheduledJobNow(id),
    onSuccess: invalidateScheduler,
  });

  const sendReportMutation = useMutation({
    mutationFn: (period: 'weekly' | 'monthly' | 'both') => sendReportNow(period),
    onSuccess: invalidateScheduler,
  });

  const deleteLogMutation = useMutation({
    mutationFn: deleteSchedulerRunLog,
    onSuccess: invalidateScheduler,
  });

  const purgeLogsMutation = useMutation({
    mutationFn: () => purgeSchedulerRunLogs(selectedJobKey || undefined),
    onSuccess: invalidateScheduler,
  });

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <h2 className="text-lg font-semibold text-slate-900">Scheduler Control Center</h2>
        <p className="mt-1 text-sm text-slate-600">
          Manage automated job schedules for email queue processing and weekly/monthly reports.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            className="apex-btn-soft"
            onClick={() => sendReportMutation.mutate('weekly')}
            disabled={sendReportMutation.isPending}
          >
            {sendReportMutation.isPending ? 'Sending...' : 'Send Weekly Report Now'}
          </button>
          <button
            className="apex-btn-soft"
            onClick={() => sendReportMutation.mutate('monthly')}
            disabled={sendReportMutation.isPending}
          >
            Send Monthly Report Now
          </button>
          <button
            className="apex-btn-soft"
            onClick={() => sendReportMutation.mutate('both')}
            disabled={sendReportMutation.isPending}
          >
            Send Both Reports Now
          </button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="apex-glass-panel p-4">
          {jobsQuery.isLoading && <PageSkeleton rows={5} />}
          {jobsQuery.isError && <PageErrorState message="Unable to load scheduled jobs." onRetry={() => jobsQuery.refetch()} />}
          {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) === 0 && (
            <EmptyState title="No scheduled jobs" message="The scheduler defaults will appear automatically." />
          )}

          {!jobsQuery.isLoading && !jobsQuery.isError && (jobsQuery.data?.length ?? 0) > 0 && (
            <div className="space-y-3">
              {(jobsQuery.data ?? []).map((job) => (
                <article
                  key={job.id}
                  className={`rounded-xl border p-3 ${selectedJobKey === job.key ? 'border-apex-primary bg-cream/50' : 'border-slate-200 bg-white/80'}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <button className="text-left" onClick={() => setSelectedJobKey(job.key)}>
                        <p className="text-sm font-semibold text-slate-900">{job.name}</p>
                      </button>
                      <p className="text-xs text-slate-600">{job.description || job.key}</p>
                    </div>
                    <button
                      className="apex-btn-soft"
                      onClick={() => runNowMutation.mutate(job.id)}
                      disabled={runNowMutation.isPending}
                    >
                      Run now
                    </button>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-[140px_160px_140px]">
                    <input
                      type="number"
                      min={1}
                      value={job.interval_value}
                      onChange={(event) =>
                        updateMutation.mutate({
                          id: job.id,
                          payload: { interval_value: Number(event.target.value) },
                        })
                      }
                    />
                    <select
                      value={job.interval_unit}
                      onChange={(event) =>
                        updateMutation.mutate({
                          id: job.id,
                          payload: { interval_unit: event.target.value as ScheduledJob['interval_unit'] },
                        })
                      }
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                      <option value="weeks">Weeks</option>
                    </select>
                    <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={job.is_active}
                        onChange={(event) =>
                          updateMutation.mutate({
                            id: job.id,
                            payload: { is_active: event.target.checked },
                          })
                        }
                      />
                      Active
                    </label>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 grid gap-1 sm:grid-cols-3">
                    <span>Last run: {formatDateTime(job.last_run_at)}</span>
                    <span>Next run: {formatDateTime(job.next_run_at)}</span>
                    <span>Status: {job.last_status}</span>
                  </div>

                  {job.last_error ? (
                    <p className="mt-2 rounded bg-red-50 px-2 py-1 text-[11px] text-red-700">{job.last_error}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="apex-glass-panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Run History {selectedJob ? `- ${selectedJob.name}` : ''}</h3>
              <p className="mt-1 text-xs text-slate-600">Latest scheduler executions and runtime results.</p>
            </div>
            {canManage ? (
              <AdminConfirmButton
                label={purgeLogsMutation.isPending ? 'Purging...' : 'Purge History'}
                confirmMessage={
                  selectedJobKey
                    ? `Delete all run logs for ${selectedJob?.name ?? selectedJobKey}?`
                    : 'Delete ALL scheduler run logs?'
                }
                onConfirm={() => purgeLogsMutation.mutateAsync()}
                disabled={purgeLogsMutation.isPending}
              />
            ) : null}
          </div>
          <div className="mt-3 space-y-2 max-h-[560px] overflow-y-auto">
            {logsQuery.isLoading && <PageSkeleton rows={4} />}
            {logsQuery.isError && <PageErrorState message="Unable to load run logs." onRetry={() => logsQuery.refetch()} />}
            {!logsQuery.isLoading && !logsQuery.isError && (logsQuery.data?.length ?? 0) === 0 && (
              <EmptyState title="No run logs" message="Run logs will appear once jobs execute." />
            )}
            {(logsQuery.data ?? []).slice(0, 40).map((log) => (
              <div key={log.id} className="rounded-lg border border-slate-200 bg-white/80 p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-800">{log.job_name}</p>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] ${
                        log.status === 'success'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      {log.status}
                    </span>
                    {canManage ? (
                      <AdminConfirmButton
                        label="Delete"
                        confirmMessage={`Delete run log #${log.id}?`}
                        onConfirm={() => deleteLogMutation.mutateAsync(log.id)}
                        disabled={deleteLogMutation.isPending}
                      />
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(log.started_at)}</p>
                <p className="text-[11px] text-slate-600">Duration: {log.duration_ms} ms</p>
                {log.error ? <p className="mt-1 text-[11px] text-red-700">{log.error}</p> : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
