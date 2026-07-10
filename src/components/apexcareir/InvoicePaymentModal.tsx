import { useEffect, useState } from 'react';

type InvoicePaymentModalProps = {
  open: boolean;
  invoiceNumber?: string;
  balanceDue?: number;
  isSaving?: boolean;
  onClose: () => void;
  onSave: (payload: { amount: string; payment_date: string; payment_method: string; reference: string; notes: string }) => void;
};

export default function InvoicePaymentModal({
  open,
  invoiceNumber,
  balanceDue = 0,
  isSaving = false,
  onClose,
  onSave,
}: InvoicePaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(balanceDue > 0 ? String(balanceDue) : '');
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('cash');
      setReference('');
      setNotes('');
    }
  }, [open, balanceDue]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="apex-data-card w-full max-w-md p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-900">Record Payment</h3>
        <p className="mt-1 text-xs text-slate-600">
          {invoiceNumber ? `Invoice ${invoiceNumber}` : 'Invoice'} · Balance due: KES {balanceDue.toLocaleString()}
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Amount (KES)</label>
            <input type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Date</label>
            <input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Method</label>
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Reference</label>
            <input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="M-Pesa code, bank ref..." />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Notes</label>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="apex-btn-soft" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button
            type="button"
            className="apex-btn-primary"
            disabled={isSaving}
            onClick={() => onSave({ amount, payment_date: paymentDate, payment_method: paymentMethod, reference, notes })}
          >
            {isSaving ? 'Saving...' : 'Record Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}
