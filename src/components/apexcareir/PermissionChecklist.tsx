type PermissionOption = {
  code: string;
  label: string;
};

type PermissionChecklistProps = {
  groups: Record<string, PermissionOption[]>;
  selectedPermissions: string[];
  onToggle: (permissionCode: string) => void;
  variant?: 'default' | 'admin';
};

export default function PermissionChecklist({
  groups,
  selectedPermissions,
  onToggle,
  variant = 'default',
}: PermissionChecklistProps) {
  const isAdmin = variant === 'admin';

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([groupName, options]) => (
        <fieldset
          key={groupName}
          className={isAdmin ? 'apex-admin-permission-group' : 'rounded-lg border border-slate-200 p-4'}
        >
          <legend className={isAdmin ? undefined : 'px-1 text-sm font-semibold text-slate-800'}>{groupName}</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {options.map((option) => (
              <label
                key={option.code}
                className={
                  isAdmin
                    ? 'apex-admin-permission-option'
                    : 'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50'
                }
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-apex-primary focus:ring-apex-primary"
                  checked={selectedPermissions.includes(option.code)}
                  onChange={() => onToggle(option.code)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
