import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listAppointments,
  updateAppointment,
  type Appointment,
  type AppointmentStatus,
} from '../../services';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';

const statuses: { value: AppointmentStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function AppointmentsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialSearch = searchParams.get('search') ?? '';
  const initialStatus = searchParams.get('status');
  const isValidInitialStatus = statuses.some((status) => status.value === initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | ''>(
    isValidInitialStatus ? (initialStatus as AppointmentStatus) : '',
  );
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState('');

  const appointmentsQuery = useQuery({
    queryKey: ['appointments', search, statusFilter],
    queryFn: () => listAppointments({ search: search || undefined, status: statusFilter }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status?: AppointmentStatus; admin_notes?: string } }) =>
      updateAppointment(id, payload),
    onSuccess: async (updated) => {
      setSelected(updated);
      setAdminNotesDraft(updated.admin_notes ?? '');
      await queryClient.invalidateQueries({ queryKey: ['appointments'] });
    },
  });

  const selectedStatus = useMemo(() => selected?.status ?? 'pending', [selected]);

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-900">Appointment Management</h2>
        <p className="mt-1 text-xs text-slate-600">Review, update status, and manage patient booking requests.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, county, or procedure..."
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as AppointmentStatus | '')}>
            <option value="">All statuses</option>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="apex-glass-panel p-4">
          {appointmentsQuery.isLoading && <PageSkeleton rows={8} />}
          {appointmentsQuery.isError && (
            <PageErrorState
              message="Unable to load appointments right now."
              onRetry={() => appointmentsQuery.refetch()}
            />
          )}
          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && (appointmentsQuery.data?.length ?? 0) === 0 && (
            <EmptyState
              title="No appointments found"
              message="No matching appointment requests yet. New patient requests will appear here."
            />
          )}

          {!appointmentsQuery.isLoading && !appointmentsQuery.isError && (appointmentsQuery.data?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2">Patient</th>
                    <th className="py-2 pr-2">Phone</th>
                    <th className="py-2 pr-2">County</th>
                    <th className="py-2 pr-2">Date</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {(appointmentsQuery.data ?? []).map((appointment) => (
                    <tr
                      key={appointment.id}
                      className={`cursor-pointer border-b border-slate-100 ${selected?.id === appointment.id ? 'bg-cream/60' : ''}`}
                      onClick={() => {
                        setSelected(appointment);
                        setAdminNotesDraft(appointment.admin_notes ?? '');
                      }}
                    >
                      <td className="py-2 pr-2 font-semibold text-slate-800">{appointment.full_name}</td>
                      <td className="py-2 pr-2">{appointment.phone_number}</td>
                      <td className="py-2 pr-2">{appointment.county}</td>
                      <td className="py-2 pr-2">{appointment.preferred_date ?? '-'}</td>
                      <td className="py-2 pr-2 capitalize">{appointment.status}</td>
                      <td className="py-2 pr-2">{new Date(appointment.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="apex-glass-panel p-4">
          {!selected && (
            <EmptyState title="Select an appointment" message="Pick an appointment from the table to review and update it." />
          )}

          {selected && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Appointment #{selected.id}</h3>
              <div className="rounded-lg border border-slate-200 bg-white/85 p-3 text-xs space-y-1">
                <p><span className="text-slate-500">Patient:</span> <strong>{selected.full_name}</strong></p>
                <p><span className="text-slate-500">Phone:</span> {selected.phone_number}</p>
                <p><span className="text-slate-500">Email:</span> {selected.email || '-'}</p>
                <p><span className="text-slate-500">County:</span> {selected.county}</p>
                <p><span className="text-slate-500">Procedure:</span> {selected.procedure_interest || '-'}</p>
                <p><span className="text-slate-500">Preferred Date:</span> {selected.preferred_date || '-'}</p>
                <p><span className="text-slate-500">Preferred Time:</span> {selected.preferred_time || '-'}</p>
                <p><span className="text-slate-500">Message:</span> {selected.message || '-'}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(event) => {
                    const status = event.target.value as AppointmentStatus;
                    setSelected((current) => (current ? { ...current, status } : current));
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Admin Notes</label>
                <textarea
                  rows={4}
                  value={adminNotesDraft}
                  onChange={(event) => setAdminNotesDraft(event.target.value)}
                  placeholder="Add follow-up or scheduling notes..."
                />
              </div>

              <button
                type="button"
                className="apex-btn-primary w-full"
                disabled={updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    id: selected.id,
                    payload: { status: selectedStatus, admin_notes: adminNotesDraft },
                  })
                }
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Appointment Update'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
