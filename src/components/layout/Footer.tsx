import { Link } from 'react-router-dom';
import { Phone, MapPin, Mail, ArrowRight, Shield, ScanLine } from 'lucide-react';
import Logo from '../Logo';
import { doctor, navLinks, services } from '../../data/content';

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-brand-gradient text-white">
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute left-[-8%] top-8 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-[-6%] bottom-10 h-56 w-56 rounded-full bg-gold/15 blur-3xl" />
      </div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="relative mb-12 rounded-[1.75rem] border border-white/15 bg-white/8 p-6 backdrop-blur-md md:flex md:items-center md:justify-between md:gap-8">
          <div className="max-w-2xl">
            <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-light">
              <Shield size={12} />
              Specialist-led IR care
            </p>
            <h3 className="font-display text-2xl md:text-3xl font-semibold">
              Precision image-guided care for patients across Kenya.
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Consult for biopsy, vascular, oncology, drainage, dialysis access, and other minimally invasive interventional radiology procedures.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 md:mt-0">
            <Link to="/book-appointment" className="btn-gold">
              Book Appointment <ArrowRight size={15} />
            </Link>
            <Link to="/services" className="btn-outline !border-white/25 !bg-white/10 !text-white hover:!border-gold-light hover:!text-gold-light">
              Explore Services
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Logo size="md" />
              <div>
                <p className="font-display font-semibold">{doctor.clinic}</p>
                <p className="text-xs text-white/70">{doctor.name}</p>
              </div>
            </div>
            <p className="text-sm text-white/75 leading-relaxed">
              Fellowship-trained interventional radiologist providing comprehensive, image-guided IR care for patients across Kenya.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/80">
                <ScanLine size={12} className="text-gold-light" />
                Image-guided precision
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] text-white/80">
                <Shield size={12} className="text-gold-light" />
                Same-day discharge
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gold-light mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {navLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="text-sm text-white/70 hover:text-gold-light transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gold-light mb-4">Services</h4>
            <ul className="space-y-2">
              {services.slice(0, 5).map((s) => (
                <li key={s.slug}>
                  <Link to={`/services/${s.slug}`} className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-gold-light transition-colors">
                    <span className="h-1.5 w-1.5 rounded-full bg-gold-light/80" />
                    {s.shortTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gold-light mb-4">Contact</h4>
            <ul className="space-y-3 text-sm text-white/70">
              <li className="flex items-start gap-2">
                <Phone size={16} className="text-gold-light mt-0.5 shrink-0" />
                <div>
                  {doctor.phones.map((p, i) => (
                    <a key={i} href={`tel:${doctor.phonesRaw[i]}`} className="block hover:text-gold-light transition-colors">
                      {p}
                    </a>
                  ))}
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-gold-light mt-0.5 shrink-0" />
                <span>{doctor.clinic}<br />{doctor.address}</span>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={16} className="text-gold-light mt-0.5 shrink-0" />
                <a href={`mailto:${doctor.email}`} className="hover:text-gold-light transition-colors">{doctor.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/15 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/50">
          <p>&copy; {new Date().getFullYear()} {doctor.name}. All rights reserved.</p>
          <p>{doctor.clinic} &middot; {doctor.location}</p>
        </div>
      </div>
    </footer>
  );
}
