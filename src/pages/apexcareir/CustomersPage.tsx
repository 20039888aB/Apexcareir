import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AdminConfirmButton from '../../components/apexcareir/AdminConfirmButton';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { useAuth } from '../../hooks/useAuth';
import { deleteCustomer, listCustomers } from '../../services';

export default function CustomersPage() {
  const { hasPermission, isSuperAdmin } = useAuth();
  const canManage = isSuperAdmin || hasPermission('sales.sales_management');
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const customersQuery = useQuery({
    queryKey: ['customers', search],
    queryFn: () => listCustomers(search || undefined),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return (
    <div className="apexcareir-ui space-y-4">
      <section className="apex-glass-panel p-4">
        <h2 className="text-sm font-semibold text-slate-800">Customers</h2>
        <p className="mt-1 text-xs text-slate-600">
          Full admin control over buyers: open profiles or permanently delete customer records.
        </p>

        <div className="mt-3 w-full md:max-w-sm">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, number, email, phone..."
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-2">Customer #</th>
                <th className="py-2 pr-2">Name</th>
                <th className="py-2 pr-2">Company</th>
                <th className="py-2 pr-2">Phone</th>
                <th className="py-2 pr-2">Email</th>
                <th className="py-2 pr-2">Profile</th>
                {canManage ? <th className="py-2 pr-2">Admin</th> : null}
              </tr>
            </thead>
            <tbody>
              {(customersQuery.data ?? []).map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{customer.customer_number || '-'}</td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      {customer.logo_url && (
                        <img src={customer.logo_url} alt="" className="h-6 w-6 rounded object-cover" />
                      )}
                      <span>{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-2">{customer.company_name || '-'}</td>
                  <td className="py-2 pr-2">{customer.phone || '-'}</td>
                  <td className="py-2 pr-2">{customer.email || '-'}</td>
                  <td className="py-2 pr-2">
                    <Link
                      to={ADMIN_ROUTES.customer(customer.id)}
                      className="text-[11px] font-medium text-apex-primary hover:underline"
                    >
                      Open Profile
                    </Link>
                  </td>
                  {canManage ? (
                    <td className="py-2 pr-2">
                      <AdminConfirmButton
                        label="Delete"
                        confirmMessage={`Permanently delete customer ${customer.name}? This cannot be undone.`}
                        onConfirm={() => deleteMutation.mutateAsync(customer.id)}
                        disabled={deleteMutation.isPending}
                      />
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
          {(customersQuery.data ?? []).length === 0 && (
            <p className="py-4 text-xs text-slate-500">
              No customers found. They are saved automatically when invoices are created.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
