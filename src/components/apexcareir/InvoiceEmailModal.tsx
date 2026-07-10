import { useEffect, useState } from 'react';

type InvoiceEmailModalProps = {
  open: boolean;
  invoiceNumber?: string;
  customerName?: string;
  defaultEmail?: string;
  isSending?: boolean;
  onClose: () => void;
  onSend: (emails: string) => void;
};

export default function InvoiceEmailModal({
  open,
  invoiceNumber,
  customerName,
  defaultEmail = '',
  isSending = false,
  onClose,
  onSend,
}: InvoiceEmailModalProps) {
  const [emails, setEmails] = useState(defaultEmail);

  useEffect(() => {
    if (open) {
      setEmails(defaultEmail);
    }
  }, [open, defaultEmail]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
      <div className="apex-data-card w-full max-w-md p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-slate-900">Email Invoice</h3>
        <p className="mt-1 text-xs text-slate-600">
          {invoiceNumber ? `Send ${invoiceNumber}` : 'Send invoice'}
          {customerName ? ` to recipients for ${customerName}.` : ' to one or more email addresses.'}
        </p>

        <label className="mt-4 block text-xs font-semibold text-slate-700">
          Recipient email(s)
        </label>
        <input
          type="text"
          value={emails}
          onChange={(event) => setEmails(event.target.value)}
          placeholder="email@example.com, finance@company.com"
          className="mt-1 w-full"
        />
        <p className="mt-1 text-[11px] text-slate-500">
          Separate multiple emails with commas. Leave blank to use the customer email on the invoice.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="apex-btn-soft" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button
            type="button"
            className="apex-btn-primary"
            disabled={isSending}
            onClick={() => onSend(emails.trim())}
          >
            {isSending ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
