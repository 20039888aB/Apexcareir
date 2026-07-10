import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { useAuth } from '../../hooks';
import { deleteAuditLog, listAuditLogs, purgeAuditLogs } from '../../services';

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-KE');
}

export default function AuditLogsPage() {
  const { isSuperAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const logsQuery = useQuery({
    queryKey: ['audit-logs', search, module, startDate, endDate],
    queryFn: () =>
      listAuditLogs({
        search: search || undefined,
        module: module || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
      }),
  });

  const invalidateLogs = () => queryClient.invalidateQueries({ queryKey: ['audit-logs'] });

  const deleteMutation = useMutation({
    mutationFn: deleteAuditLog,
    onSuccess: invalidateLogs,
  });

  const purgeMutation = useMutation({
    mutationFn: purgeAuditLogs,
    onSuccess: invalidateLogs,
  });

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Audit Logs</h2>
            <p className="mt-1 text-sm text-slate-600">Track critical system actions for security and accountability.</p>
          </div>
          {isSuperAdmin ? (
            <AdminConfirmButton
              label={purgeMutation.isPending ? 'Purging...' : 'Purge All Logs'}
              confirmMessage="Permanently delete ALL audit logs matching the current filters?"
              onConfirm={() => purgeMutation.mutateAsync()}
              disabled={purgeMutation.isPending}
            />
          ) : null}
        </div>
      </section>

      <section className="apex-glass-panel p-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Search</label>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="User, action, target..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Module</label>
            <input value={module} onChange={(event) => setModule(event.target.value)} placeholder="accounts, inventory..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Start Date</label>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">End Date</label>
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </div>
        </div>
      </section>

      <section className="apex-glass-panel p-4">
        {logsQuery.isLoading && <PageSkeleton rows={5} />}
        {logsQuery.isError && <PageErrorState message="Unable to load audit logs." onRetry={() => logsQuery.refetch()} />}

        {logsQuery.data && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Records: {logsQuery.data.count}</p>
            {logsQuery.data.results.length === 0 ? (
              <EmptyState title="No Audit Records Yet" message="Perform system actions to generate log entries." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 pr-2">Time</th>
                      <th className="py-2 pr-2">User</th>
                      <th className="py-2 pr-2">Module</th>
                      <th className="py-2 pr-2">Action</th>
                      <th className="py-2 pr-2">Description</th>
                      <th className="py-2 pr-2">Target</th>
                      <th className="py-2 pr-2">IP</th>
                      {isSuperAdmin ? <th className="py-2 pr-2">Admin</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {logsQuery.data.results.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-2 pr-2">{formatDateTime(item.created_at)}</td>
                        <td className="py-2 pr-2">{item.user_email ?? 'System'}</td>
                        <td className="py-2 pr-2">{item.module}</td>
                        <td className="py-2 pr-2">{item.action}</td>
                        <td className="py-2 pr-2">{item.description}</td>
                        <td className="py-2 pr-2">{item.target_repr || '-'}</td>
                        <td className="py-2 pr-2">{item.ip_address || '-'}</td>
                        {isSuperAdmin ? (
                          <td className="py-2 pr-2">
                            <AdminConfirmButton
                              label="Delete"
                              confirmMessage={`Delete audit log #${item.id}?`}
                              onConfirm={() => deleteMutation.mutateAsync(item.id)}
                              disabled={deleteMutation.isPending}
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
