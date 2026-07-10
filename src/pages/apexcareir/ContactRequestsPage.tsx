import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  listContactRequests,
  updateContactRequest,
  type ContactRequest,
  type ContactRequestStatus,
} from '../../services';
import { EmptyState, PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';

const statuses: { value: ContactRequestStatus; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'closed', label: 'Closed' },
];

export default function ContactRequestsPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const initialSearch = searchParams.get('search') ?? '';
  const initialStatus = searchParams.get('status');
  const isValidInitialStatus = statuses.some((status) => status.value === initialStatus);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<ContactRequestStatus | ''>(
    isValidInitialStatus ? (initialStatus as ContactRequestStatus) : '',
  );
  const [selected, setSelected] = useState<ContactRequest | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState('');

  const contactsQuery = useQuery({
    queryKey: ['contact-requests', search, statusFilter],
    queryFn: () => listContactRequests({ search: search || undefined, status: statusFilter }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { status?: ContactRequestStatus; admin_notes?: string } }) =>
      updateContactRequest(id, payload),
    onSuccess: async (updated) => {
      setSelected(updated);
      setAdminNotesDraft(updated.admin_notes ?? '');
      await queryClient.invalidateQueries({ queryKey: ['contact-requests'] });
    },
  });

  const selectedStatus = useMemo(() => selected?.status ?? 'new', [selected]);

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-900">Contact Request Management</h2>
        <p className="mt-1 text-xs text-slate-600">Review and manage messages submitted through the public contact page.</p>

        <div className="mt-3 grid gap-2 md:grid-cols-[1fr_220px]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, phone, email, or subject..."
          />
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ContactRequestStatus | '')}>
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
          {contactsQuery.isLoading && <PageSkeleton rows={8} />}
          {contactsQuery.isError && (
            <PageErrorState
              message="Unable to load contact requests right now."
              onRetry={() => contactsQuery.refetch()}
            />
          )}
          {!contactsQuery.isLoading && !contactsQuery.isError && (contactsQuery.data?.length ?? 0) === 0 && (
            <EmptyState
              title="No contact requests found"
              message="No matching contact messages yet. New requests will appear here."
            />
          )}

          {!contactsQuery.isLoading && !contactsQuery.isError && (contactsQuery.data?.length ?? 0) > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="py-2 pr-2">Name</th>
                    <th className="py-2 pr-2">Phone</th>
                    <th className="py-2 pr-2">Email</th>
                    <th className="py-2 pr-2">Subject</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2 pr-2">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {(contactsQuery.data ?? []).map((contact) => (
                    <tr
                      key={contact.id}
                      className={`cursor-pointer border-b border-slate-100 ${selected?.id === contact.id ? 'bg-cream/60' : ''}`}
                      onClick={() => {
                        setSelected(contact);
                        setAdminNotesDraft(contact.admin_notes ?? '');
                      }}
                    >
                      <td className="py-2 pr-2 font-semibold text-slate-800">{contact.full_name}</td>
                      <td className="py-2 pr-2">{contact.phone_number}</td>
                      <td className="py-2 pr-2">{contact.email || '-'}</td>
                      <td className="py-2 pr-2">{contact.subject || '-'}</td>
                      <td className="py-2 pr-2 capitalize">{contact.status}</td>
                      <td className="py-2 pr-2">{new Date(contact.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="apex-glass-panel p-4">
          {!selected && (
            <EmptyState title="Select a contact request" message="Pick a request from the table to review and update it." />
          )}

          {selected && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Contact Request #{selected.id}</h3>
              <div className="rounded-lg border border-slate-200 bg-white/85 p-3 text-xs space-y-1">
                <p><span className="text-slate-500">Name:</span> <strong>{selected.full_name}</strong></p>
                <p><span className="text-slate-500">Phone:</span> {selected.phone_number}</p>
                <p><span className="text-slate-500">Email:</span> {selected.email || '-'}</p>
                <p><span className="text-slate-500">Subject:</span> {selected.subject || '-'}</p>
                <p><span className="text-slate-500">Message:</span> {selected.message}</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(event) => {
                    const status = event.target.value as ContactRequestStatus;
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
                  placeholder="Add response and follow-up notes..."
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
                {updateMutation.isPending ? 'Saving...' : 'Save Contact Request Update'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
