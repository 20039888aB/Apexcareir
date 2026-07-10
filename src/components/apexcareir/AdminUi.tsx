import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import CompanyBrandingHeader from './CompanyBrandingHeader';

type AdminPageHeroProps = {
  title: string;
  subtitle: string;
  badge?: string;
  children?: ReactNode;
};

export function AdminPageHero({ title, subtitle, badge = 'SuperAdmin Console', children }: AdminPageHeroProps) {
  return (
    <section className="apex-admin-hero relative overflow-hidden p-5 sm:p-6">
      <div className="apex-admin-hero-glow apex-admin-hero-glow--gold" aria-hidden />
      <div className="apex-admin-hero-glow apex-admin-hero-glow--burgundy" aria-hidden />
      <div className="apex-admin-hero-glow apex-admin-hero-glow--forest" aria-hidden />

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3">
          <span className="apex-admin-badge">{badge}</span>
          <CompanyBrandingHeader title={title} subtitle={subtitle} variant="hero" />
        </div>
        {children ? <div className="grid w-full gap-3 sm:grid-cols-2 lg:max-w-xl lg:grid-cols-2">{children}</div> : null}
      </div>
    </section>
  );
}

type AdminStatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: 'forest' | 'gold' | 'burgundy' | 'sky';
};

export function AdminStatCard({ label, value, hint, icon: Icon, tone = 'forest' }: AdminStatCardProps) {
  return (
    <article className={`apex-admin-stat apex-admin-stat--${tone}`}>
      <div className="apex-admin-stat-icon">
        <Icon size={18} />
      </div>
      <div>
        <p className="apex-admin-stat-label">{label}</p>
        <p className="apex-admin-stat-value">{value}</p>
        {hint ? <p className="apex-admin-stat-hint">{hint}</p> : null}
      </div>
    </article>
  );
}

type AdminPanelProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  tone?: 'forest' | 'gold' | 'burgundy';
  children: ReactNode;
  className?: string;
};

export function AdminPanel({ title, description, icon: Icon, tone = 'forest', children, className = '' }: AdminPanelProps) {
  return (
    <section className={`apex-admin-panel apex-admin-panel--${tone} ${className}`}>
      <header className="apex-admin-panel-header">
        <div className="flex items-center gap-3">
          {Icon ? (
            <span className="apex-admin-panel-icon">
              <Icon size={18} />
            </span>
          ) : null}
          <div>
            <h2 className="apex-admin-panel-title">{title}</h2>
            {description ? <p className="apex-admin-panel-description">{description}</p> : null}
          </div>
        </div>
      </header>
      <div className="apex-admin-panel-body">{children}</div>
    </section>
  );
}

type AdminQuickLink = {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: 'forest' | 'gold' | 'burgundy';
};

export function AdminQuickLinks({ links }: { links: AdminQuickLink[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {links.map((link) => {
        const Icon = link.icon;
        return (
          <Link key={link.to} to={link.to} className={`apex-admin-quick-link apex-admin-quick-link--${link.tone}`}>
            <span className="apex-admin-quick-link-icon">
              <Icon size={18} />
            </span>
            <span>
              <span className="block text-sm font-semibold">{link.label}</span>
              <span className="mt-0.5 block text-xs opacity-80">{link.description}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminUserAvatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  return (
    <span className={`apex-admin-avatar ${role === 'superadmin' ? 'apex-admin-avatar--super' : 'apex-admin-avatar--staff'}`}>
      {initials || 'U'}
    </span>
  );
}

export function AdminRoleBadge({ role }: { role: string }) {
  const isSuper = role === 'superadmin';
  return (
    <span className={`apex-admin-role-badge ${isSuper ? 'apex-admin-role-badge--super' : 'apex-admin-role-badge--staff'}`}>
      {isSuper ? 'SuperAdmin' : 'Staff'}
    </span>
  );
}

export function AdminStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`apex-admin-status-badge ${active ? 'apex-admin-status-badge--active' : 'apex-admin-status-badge--inactive'}`}>
      {active ? 'Active' : 'Suspended'}
    </span>
  );
}
