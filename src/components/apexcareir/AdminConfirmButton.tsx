type AdminConfirmButtonProps = {
  label: string;
  confirmMessage: string;
  onConfirm: () => void | Promise<unknown>;
  disabled?: boolean;
  variant?: 'danger' | 'soft';
  className?: string;
};

export default function AdminConfirmButton({
  label,
  confirmMessage,
  onConfirm,
  disabled = false,
  variant = 'danger',
  className = '',
}: AdminConfirmButtonProps) {
  const handleClick = async () => {
    if (!window.confirm(confirmMessage)) {
      return;
    }
    await onConfirm();
  };

  const baseClass = variant === 'danger' ? 'apex-btn-danger' : 'apex-btn-soft';

  return (
    <button type="button" className={`${baseClass} ${className}`.trim()} onClick={handleClick} disabled={disabled}>
      {label}
    </button>
  );
}
