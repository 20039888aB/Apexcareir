import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Menu, X, Phone, Shield, MapPin } from 'lucide-react';
import Logo from '../Logo';
import { doctor, navLinks } from '../../data/content';

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mt-4 overflow-hidden rounded-[1.65rem] border border-white/40 bg-white/75 shadow-glass backdrop-blur-xl">
          <div className="hidden items-center justify-between border-b border-white/40 bg-gradient-to-r from-white/50 via-gold/10 to-white/40 px-5 py-2 text-[11px] font-medium text-forest/75 lg:flex">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Shield size={12} className="text-gold" />
                Fellowship-trained IR care
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={12} className="text-gold" />
                {doctor.coverage}
              </span>
            </div>
            <span className="text-burgundy/75">Same-day discharge for most procedures</span>
          </div>
          <div className="flex items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3 group">
            <Logo size="sm" />
            <div className="hidden sm:block">
              <p className="font-display font-semibold text-forest text-sm leading-tight">{doctor.clinic}</p>
              <p className="text-xs text-burgundy/80">{doctor.name}</p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-forest text-white shadow-md'
                      : 'text-forest/70 hover:text-forest hover:bg-sky-pad'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link to="/book-appointment" className="btn-primary text-xs !px-5 !py-2.5">
              <CalendarDays size={14} />
              Book Your Appointment Now
            </Link>
            <a href={`tel:${doctor.phonesRaw[0]}`} className="btn-gold text-xs !px-5 !py-2.5">
              <Phone size={14} />
              Call Now
            </a>
          </div>

          <button
            className="lg:hidden p-2 rounded-xl text-forest hover:bg-sky-pad transition-colors"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden mx-4 mt-2 rounded-2xl border border-gold/20 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <NavLink
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `block px-6 py-3.5 text-sm font-medium border-b border-sky-pad/50 ${
                      isActive ? 'text-gold bg-forest/5' : 'text-forest/80'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </motion.div>
            ))}
            <div className="p-4">
              <Link to="/book-appointment" onClick={() => setOpen(false)} className="btn-primary w-full text-sm mb-3">
                <CalendarDays size={14} /> Book Your Appointment Now
              </Link>
              <a href={`tel:${doctor.phonesRaw[0]}`} className="btn-gold w-full text-sm">
                <Phone size={14} /> {doctor.phones[0]}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
