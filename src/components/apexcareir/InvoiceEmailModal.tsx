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

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

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
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (open) {
      setEmails(defaultEmail);
      setLocalError('');
    }
  }, [open, defaultEmail]);

  if (!open) {
    return null;
  }

  const handleSend = () => {
    const trimmed = emails.trim();
    const fallback = defaultEmail.trim();
    const toSend = trimmed || fallback;
    if (!toSend) {
      setLocalError('Enter at least one recipient email address.');
      return;
    }
    const parts = toSend
      .split(/[,;]+/)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length === 0 || parts.some((part) => !looksLikeEmail(part))) {
      setLocalError('Enter a valid email address (you can separate several with commas).');
      return;
    }
    setLocalError('');
    onSend(parts.join(', '));
  };

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
          type="email"
          multiple
          value={emails}
          onChange={(event) => {
            setEmails(event.target.value);
            if (localError) setLocalError('');
          }}
          placeholder={defaultEmail || 'email@example.com, finance@company.com'}
          className="mt-1 w-full"
          autoFocus
        />
        <p className="mt-1 text-[11px] text-slate-500">
          {defaultEmail
            ? `Customer email on file: ${defaultEmail}. You can change it or add more (comma-separated).`
            : 'This invoice has no customer email on file — type a recipient address before sending.'}
        </p>
        {localError && <p className="mt-2 text-xs text-red-600">{localError}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="apex-btn-soft" onClick={onClose} disabled={isSending}>
            Cancel
          </button>
          <button
            type="button"
            className="apex-btn-primary"
            disabled={isSending}
            onClick={handleSend}
          >
            {isSending ? 'Sending...' : 'Send Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}
