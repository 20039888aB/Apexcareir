import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, FileText, ImageIcon, Phone, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdminPageHero, AdminPanel, AdminQuickLinks, AdminStatCard } from '../../components/apexcareir/AdminUi';
import { PageErrorState, PageSkeleton } from '../../components/apexcareir/PageStates';
import { ADMIN_ROUTES } from '../../constants/adminRoutes';
import { getCompanySettings, updateCompanySettings } from '../../services';

export default function CompanySettingsPage() {
  const queryClient = useQueryClient();
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    company_name: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    tax_information: '',
    support_email: '',
    invoice_footer_text: '',
  });
  const [message, setMessage] = useState('');

  const settingsQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: getCompanySettings,
  });

  useEffect(() => {
    if (settingsQuery.data) {
      setForm({
        company_name: settingsQuery.data.company_name,
        address: settingsQuery.data.address,
        email: settingsQuery.data.email,
        phone: settingsQuery.data.phone,
        website: settingsQuery.data.website,
        tax_information: settingsQuery.data.tax_information,
        support_email: settingsQuery.data.support_email,
        invoice_footer_text: settingsQuery.data.invoice_footer_text,
      });
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  const saveMutation = useMutation({
    mutationFn: () => updateCompanySettings({ ...form, logo: logoFile }),
    onSuccess: async () => {
      setMessage('Company settings saved successfully.');
      setLogoFile(null);
      await queryClient.invalidateQueries({ queryKey: ['settings', 'company'] });
    },
    onError: () => setMessage('Unable to save company settings.'),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton rows={8} />;
  }

  if (settingsQuery.isError || !settingsQuery.data) {
    return (
      <PageErrorState
        message="Unable to load company settings."
        onRetry={() => settingsQuery.refetch()}
      />
    );
  }

  const currentLogo = logoPreview || settingsQuery.data.logo_url || settingsQuery.data.logo || null;
  const brandingReady = Boolean(form.company_name && (form.email || form.phone));

  return (
    <div className="apexcareir-ui space-y-5">
      <AdminPageHero
        title="Company Settings"
        subtitle="Branding and business details used across invoices, reports, exports, and emails."
        badge="Brand Control Center"
      >
        <AdminStatCard
          label="Brand Status"
          value={brandingReady ? 'Ready' : 'Incomplete'}
          hint={brandingReady ? 'Ready for documents' : 'Add core contact details'}
          icon={Sparkles}
          tone="gold"
        />
        <AdminStatCard
          label="Logo"
          value={currentLogo ? 'Uploaded' : 'Default'}
          hint="Shown on PDFs and admin pages"
          icon={ImageIcon}
          tone="burgundy"
        />
      </AdminPageHero>

      <AdminQuickLinks
        links={[
          {
            to: ADMIN_ROUTES.settings,
            label: 'Company Settings',
            description: 'Logo, contact info, and invoice footer.',
            icon: Building2,
            tone: 'gold',
          },
          {
            to: ADMIN_ROUTES.users,
            label: 'User Management',
            description: 'Roles, permissions, and account control.',
            icon: Users,
            tone: 'forest',
          },
        ]}
      />

      <form
        className="grid gap-5 xl:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage('');
          saveMutation.mutate();
        }}
      >
        <AdminPanel title="Business Identity" description="Core company profile shown across the platform." icon={Building2}>
          <div className="apex-admin-form-grid">
            <div className="apex-admin-field">
              <label>Company Name</label>
              <input
                value={form.company_name}
                onChange={(event) => setForm((current) => ({ ...current, company_name: event.target.value }))}
                required
              />
            </div>
            <div className="apex-admin-field">
              <label>Business Address</label>
              <textarea
                value={form.address}
                onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                rows={3}
              />
            </div>
            <div className="apex-admin-field">
              <label>Tax Information</label>
              <input
                value={form.tax_information}
                onChange={(event) => setForm((current) => ({ ...current, tax_information: event.target.value }))}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Contact Channels" description="How customers and staff reach your business." icon={Phone} tone="burgundy">
          <div className="apex-admin-form-grid">
            <div className="apex-admin-field">
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="apex-admin-field">
              <label>Phone</label>
              <input
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="apex-admin-field">
              <label>Website</label>
              <input
                value={form.website}
                onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
              />
            </div>
            <div className="apex-admin-field">
              <label>Support Email</label>
              <input
                type="email"
                value={form.support_email}
                onChange={(event) => setForm((current) => ({ ...current, support_email: event.target.value }))}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel
          title="Branding & Documents"
          description="Logo and invoice messaging for downloads and emails."
          icon={FileText}
          tone="gold"
          className="xl:col-span-2"
        >
          <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
            <div className="apex-admin-logo-dropzone flex flex-col items-center justify-center text-center">
              {currentLogo ? (
                <img src={currentLogo} alt="Company logo preview" className="mb-3 h-24 w-24 rounded-2xl border border-white bg-white object-contain p-2 shadow-sm" />
              ) : (
                <div className="mb-3 flex h-24 w-24 items-center justify-center rounded-2xl bg-white/80 text-burgundy shadow-sm">
                  <ImageIcon size={28} />
                </div>
              )}
              <p className="text-sm font-semibold text-slate-800">Company Logo</p>
              <p className="mt-1 text-xs text-slate-600">Used on reports, PDFs, Excel files, and emails.</p>
            </div>

            <div className="apex-admin-form-grid">
              <div className="apex-admin-field">
                <label>Upload New Logo</label>
                <input type="file" accept="image/*" onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)} />
              </div>
              <div className="apex-admin-field">
                <label>Invoice Footer Text</label>
                <textarea
                  value={form.invoice_footer_text}
                  onChange={(event) => setForm((current) => ({ ...current, invoice_footer_text: event.target.value }))}
                  rows={4}
                />
              </div>
              <button type="submit" disabled={saveMutation.isPending} className="apex-admin-submit w-fit">
                {saveMutation.isPending ? 'Saving...' : 'Save Company Settings'}
              </button>
              {message && (
                <p
                  className={`apex-admin-message ${
                    message.includes('successfully') ? 'apex-admin-message--success' : 'apex-admin-message--error'
                  }`}
                >
                  {message}
                </p>
              )}
            </div>
          </div>
        </AdminPanel>
      </form>
    </div>
  );
}
