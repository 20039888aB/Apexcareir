import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { createSupplier, listSupplierInvoices, listSuppliers, updateSupplier, type Supplier } from '../../services';

function formatCurrency(value: string | number) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

export default function SuppliersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [editMode, setEditMode] = useState(false);

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', search],
    queryFn: () => listSuppliers(search),
  });

  const invoicesQuery = useQuery({
    queryKey: ['suppliers', selectedSupplier?.id, 'invoices'],
    queryFn: () => listSupplierInvoices(selectedSupplier!.id),
    enabled: Boolean(selectedSupplier?.id),
  });

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<Supplier> }) => updateSupplier(id, payload),
    onSuccess: async (supplier) => {
      setSelectedSupplier(supplier);
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    },
  });

  const handleCreateSupplier = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get('name') || '').trim(),
      contact_person: String(formData.get('contact_person') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      products_supplied: String(formData.get('products_supplied') || '').trim(),
      is_active: formData.get('is_active') === 'on',
    };
    if (!payload.name) return;
    createSupplierMutation.mutate(payload);
    event.currentTarget.reset();
  };

  const handleUpdateSupplier = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedSupplier) return;
    const formData = new FormData(event.currentTarget);
    const payload: Partial<Supplier> = {
      name: String(formData.get('name') || '').trim(),
      contact_person: String(formData.get('contact_person') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      address: String(formData.get('address') || '').trim(),
      products_supplied: String(formData.get('products_supplied') || '').trim(),
      is_active: formData.get('is_active') === 'on',
    };
    updateSupplierMutation.mutate({ id: selectedSupplier.id, payload });
  };

  const suppliers = suppliersQuery.data ?? [];

  return (
    <div className="apexcareir-ui space-y-4">
      <div className="apex-glass-panel p-4">
        <h2 className="text-lg font-semibold text-slate-900">Supplier Management</h2>
        <p className="mt-1 text-sm text-slate-600">
          Register suppliers, manage supplier contacts, and track supplier invoices and purchase history.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_1.3fr]">
        <section className="apex-glass-panel apex-animate-in p-4">
          <h3 className="text-sm font-semibold text-slate-800">{editMode ? 'Edit Supplier' : 'Create Supplier'}</h3>
          <form className="mt-3 grid gap-2" onSubmit={editMode ? handleUpdateSupplier : handleCreateSupplier}>
            <input name="name" required defaultValue={selectedSupplier?.name ?? ''} placeholder="Supplier name" />
            <input
              name="contact_person"
              defaultValue={selectedSupplier?.contact_person ?? ''}
              placeholder="Contact person"
            />
            <input name="phone" defaultValue={selectedSupplier?.phone ?? ''} placeholder="Phone" />
            <input name="email" type="email" defaultValue={selectedSupplier?.email ?? ''} placeholder="Email" />
            <textarea name="address" defaultValue={selectedSupplier?.address ?? ''} placeholder="Address" />
            <textarea
              name="products_supplied"
              defaultValue={selectedSupplier?.products_supplied ?? ''}
              placeholder="Products supplied"
            />
            <label className="flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={selectedSupplier ? selectedSupplier.is_active : true}
              />
              Supplier active
            </label>
            <div className="flex gap-2">
              <button type="submit">{editMode ? 'Save Supplier' : 'Add Supplier'}</button>
              {editMode && (
                <button
                  type="button"
                  className="apex-btn-soft"
                  onClick={() => {
                    setEditMode(false);
                    setSelectedSupplier(null);
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="apex-glass-panel apex-animate-in p-4">
          <div className="mb-3 flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search suppliers by name/contact/email..."
              className="w-full"
            />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-2">Supplier</th>
                  <th className="py-2 pr-2">Contact</th>
                  <th className="py-2 pr-2">Purchases</th>
                  <th className="py-2 pr-2">Spent</th>
                  <th className="py-2 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr
                    key={supplier.id}
                    className={`cursor-pointer border-b border-slate-100 ${
                      selectedSupplier?.id === supplier.id ? 'bg-cream/80' : ''
                    }`}
                    onClick={() => {
                      setSelectedSupplier(supplier);
                      setEditMode(true);
                    }}
                  >
                    <td className="py-2 pr-2">
                      <p className="font-semibold text-slate-800">{supplier.name}</p>
                      <p className="text-[11px] text-slate-500">{supplier.email || '-'}</p>
                    </td>
                    <td className="py-2 pr-2">{supplier.contact_person || '-'}</td>
                    <td className="py-2 pr-2">{supplier.purchase_count ?? 0}</td>
                    <td className="py-2 pr-2">{formatCurrency(supplier.total_purchase_amount)}</td>
                    <td className="py-2 pr-2">{supplier.is_active ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="apex-glass-panel apex-animate-in p-4">
        <h3 className="text-sm font-semibold text-slate-800">
          {selectedSupplier ? `Invoices & Purchases — ${selectedSupplier.name}` : 'Select a supplier to view invoices'}
        </h3>
        {selectedSupplier && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <p className="text-[11px] text-slate-500">Total Purchases</p>
              <p className="text-sm font-semibold text-slate-800">{selectedSupplier.purchase_count ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <p className="text-[11px] text-slate-500">Items Received</p>
              <p className="text-sm font-semibold text-slate-800">{selectedSupplier.total_items_received ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white/80 p-3">
              <p className="text-[11px] text-slate-500">Purchase Value</p>
              <p className="text-sm font-semibold text-slate-800">
                {formatCurrency(selectedSupplier.total_purchase_amount)}
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2 pr-2">Invoice</th>
                <th className="py-2 pr-2">Product</th>
                <th className="py-2 pr-2">Qty</th>
                <th className="py-2 pr-2">Price</th>
                <th className="py-2 pr-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {(invoicesQuery.data?.results ?? []).map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-100">
                  <td className="py-2 pr-2">{invoice.invoice_number}</td>
                  <td className="py-2 pr-2">{invoice.product_name}</td>
                  <td className="py-2 pr-2">{invoice.quantity}</td>
                  <td className="py-2 pr-2">{formatCurrency(invoice.purchase_price)}</td>
                  <td className="py-2 pr-2">{invoice.date_received}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
