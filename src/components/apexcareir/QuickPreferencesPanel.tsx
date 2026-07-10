import { Settings } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { updateUserPreferences } from '../../services/authService';
import { useAuthStore, type SidebarNavigationMode } from '../../store/authStore';

const modeOptions: Array<{
  value: SidebarNavigationMode;
  label: string;
  description: string;
}> = [
  {
    value: 'accordion',
    label: 'Accordion Mode',
    description: 'Only one section remains expanded.',
  },
  {
    value: 'multi_expand',
    label: 'Multi-Expand Mode',
    description: 'Multiple sections can remain expanded.',
  },
];

export default function QuickPreferencesPanel() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [open, setOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<SidebarNavigationMode>('accordion');
  const [rememberPreference, setRememberPreference] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedMode(user?.sidebar_navigation_mode ?? 'accordion');
  }, [user?.sidebar_navigation_mode]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleOutsideClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const handleSave = async () => {
    if (!user) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);

    try {
      if (rememberPreference) {
        const updatedUser = await updateUserPreferences({ sidebar_navigation_mode: selectedMode });
        setUser(updatedUser);
        setFeedback('Preference saved.');
      } else if (user) {
        setUser({ ...user, sidebar_navigation_mode: selectedMode });
        setFeedback('Applied for this session.');
      }
      setOpen(false);
    } catch {
      setFeedback('Unable to save preference. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        className="apex-btn-soft rounded-full !p-2 text-slate-600"
        onClick={() => {
          setFeedback(null);
          setOpen((previous) => !previous);
        }}
        aria-label="Quick preferences"
        aria-expanded={open}
      >
        <Settings size={16} />
      </button>

      {open && (
        <div className="apex-data-card absolute right-0 z-40 mt-2 w-80 p-4 shadow-lg">
          <p className="text-sm font-semibold text-slate-900">Quick Preferences</p>
          <p className="mt-1 text-xs text-slate-500">Customize how the sidebar behaves for your account.</p>

          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Sidebar Navigation</p>
            <div className="mt-2 space-y-2">
              {modeOptions.map((option) => (
                <label
                  key={option.value}
                  className={`apex-data-card-soft flex cursor-pointer gap-3 rounded-lg p-3 ${
                    selectedMode === option.value ? 'ring-1 ring-apex-primary/40' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="sidebar-navigation-mode"
                    value={option.value}
                    checked={selectedMode === option.value}
                    onChange={() => setSelectedMode(option.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{option.label}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={rememberPreference}
              onChange={(event) => setRememberPreference(event.target.checked)}
            />
            Remember this preference
          </label>

          {feedback && <p className="mt-2 text-xs text-slate-600">{feedback}</p>}

          <button
            type="button"
            className="apex-btn-primary mt-4 w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}
