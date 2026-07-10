import { useQuery } from '@tanstack/react-query';
import { images } from '../../assets/images';
import { getCompanySettings } from '../../services';

type CompanyBrandingHeaderProps = {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  variant?: 'default' | 'hero';
  className?: string;
};

function resolveLogoUrl(settings?: { logo?: string | null; logo_url?: string | null }) {
  if (settings?.logo_url) {
    return settings.logo_url;
  }
  if (settings?.logo) {
    if (settings.logo.startsWith('http')) {
      return settings.logo;
    }
    const apiOrigin = (import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1').replace(/\/api\/v1\/?$/, '');
    return `${apiOrigin}${settings.logo}`;
  }
  return images.logo;
}

export default function CompanyBrandingHeader({
  title,
  subtitle,
  compact = false,
  variant = 'default',
  className = '',
}: CompanyBrandingHeaderProps) {
  const companyQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: getCompanySettings,
    staleTime: 5 * 60_000,
  });

  const company = companyQuery.data;
  const logoSrc = resolveLogoUrl(company);
  const displayTitle = title ?? company?.company_name ?? 'Apex Care IR';
  const displaySubtitle =
    subtitle ??
    [company?.email, company?.phone, company?.address].filter(Boolean).join(' · ') ??
    'Inventory & Business Management';

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      {variant === 'hero' ? (
        <div className="apex-admin-logo-wrap">
          <span className="apex-admin-logo-glow apex-admin-logo-glow--outer" aria-hidden />
          <span className="apex-admin-logo-glow apex-admin-logo-glow--inner" aria-hidden />
          <span className="apex-admin-logo-ring" aria-hidden />
          <img src={logoSrc} alt={`${displayTitle} logo`} className="apex-admin-logo-image" />
        </div>
      ) : (
        <img
          src={logoSrc}
          alt={`${displayTitle} logo`}
          className={
            compact
              ? 'h-10 w-10 rounded-full border border-[rgba(184,149,47,0.25)] bg-white object-cover p-0.5 shadow-sm'
              : 'h-14 w-auto max-w-[150px] rounded-lg border border-[rgba(184,149,47,0.25)] bg-white object-contain p-1 shadow-sm'
          }
        />
      )}
      <div>
        <h2
          className={`font-semibold ${compact ? 'text-sm' : 'text-lg'} ${
            variant === 'hero' ? 'text-white' : 'text-slate-900'
          }`}
        >
          {displayTitle}
        </h2>
        {displaySubtitle && (
          <p className={`${compact ? 'text-xs' : 'text-sm'} ${variant === 'hero' ? 'text-white/85' : 'text-slate-600'}`}>
            {displaySubtitle}
          </p>
        )}
      </div>
    </div>
  );
}

export function useCompanyLogoUrl() {
  const companyQuery = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: getCompanySettings,
    staleTime: 5 * 60_000,
  });

  return resolveLogoUrl(companyQuery.data);
}
