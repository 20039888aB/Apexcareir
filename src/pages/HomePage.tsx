import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Phone, ArrowRight, Shield, Award, MapPin,
  ScanLine, Clock, CheckCircle2, Star,
} from 'lucide-react';
import HeroBackground from '../components/HeroBackground';
import ProfileImage from '../components/ProfileImage';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import IRGalleryBento from '../components/gallery/IRGalleryBento';
import { doctor, credentials, stats, services, faqs } from '../data/content';
import { getServiceIcon } from '../utils/serviceIcons';

export default function HomePage() {
  const journeySteps = [
    {
      title: 'Reach Out',
      description: 'Call, WhatsApp, or book online so the team can understand your needs.',
      Icon: Phone,
    },
    {
      title: 'Imaging Review',
      description: 'Your history and scans are reviewed to plan the safest image-guided path.',
      Icon: ScanLine,
    },
    {
      title: 'Precision Procedure',
      description: 'Minimally invasive IR treatment is performed with focused, real-time guidance.',
      Icon: Shield,
    },
    {
      title: 'Recovery & Follow-up',
      description: 'Most patients go home the same day with clear aftercare and follow-up guidance.',
      Icon: CheckCircle2,
    },
  ];

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        <HeroBackground />
        <FloatingMedicalBg variant="hero" />
        <FloatingIRMotifs variant="hero" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 w-full z-10">
          <div className="rounded-[2rem] border border-white/25 bg-white/[0.04] p-4 sm:p-6 backdrop-blur-lg shadow-[0_24px_70px_rgba(2,9,20,0.35)]">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7 }}
              className="glass-card border-white/35 bg-white/35 p-8 md:p-10"
            >
              <div className="ir-chip mb-6">
                <span className="h-2 w-2 rounded-full bg-gold animate-pulse-soft" />
                Accepting new patients & referrals
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold text-forest leading-[1.1] mb-2">
                {doctor.name}
              </h1>
              <p className="font-display text-xl sm:text-2xl text-burgundy font-medium mb-6">
                {doctor.title}
              </p>

              <p className="text-base text-ink/70 leading-relaxed mb-3 max-w-lg">
                Specialist in <strong className="text-forest">Interventional Radiology</strong>.
              </p>
              <p className="text-sm text-ink/60 leading-relaxed mb-8 max-w-xl">
                Advanced image-guided care for vascular, oncology, biopsy, drainage, and portal interventions across Kenya.
              </p>

              <div className="flex flex-wrap gap-4 mb-8">
                <a href={`tel:${doctor.phonesRaw[0]}`} className="btn-gold">
                  <Phone size={16} /> Book Consultation
                </a>
                <Link to="/services" className="btn-outline">
                  View Services <ArrowRight size={16} />
                </Link>
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-ink/60">
                <span className="flex items-center gap-1.5"><MapPin size={14} className="text-gold" /> {doctor.coverage}</span>
                <span className="flex items-center gap-1.5"><Award size={14} className="text-gold" /> Fellowship in IR</span>
                <span className="flex items-center gap-1.5"><ScanLine size={14} className="text-gold" /> Image-guided biopsies</span>
              </div>
            </motion.div>

            {/* Doctor profile card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative flex justify-center"
            >
              <div className="glass-card border-white/35 bg-white/38 p-8 md:p-10 text-center max-w-sm w-full">
                <div className="flex justify-center mb-6">
                  <ProfileImage size="xl" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-forest">{doctor.name}</h3>
                <p className="text-burgundy text-sm font-medium mt-1">{doctor.title}</p>
                <p className="text-ink/50 text-xs mt-3">{doctor.clinic} &middot; {doctor.location}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {doctor.phones.map((p, i) => (
                    <a
                      key={i}
                      href={`tel:${doctor.phonesRaw[i]}`}
                      className="text-xs bg-forest/10 text-forest px-3 py-1.5 rounded-full hover:bg-forest/20 transition-colors border border-forest/15"
                    >
                      {p}
                    </a>
                  ))}
                </div>
              </div>

              <motion.div
                className="absolute -right-2 lg:-right-8 top-8 glass-card !rounded-2xl !bg-white/35 !border-white/30 px-4 py-3 flex items-center gap-2"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Shield className="text-gold" size={20} />
                <div className="text-left">
                  <p className="text-xs font-bold text-forest">90%+ Accuracy</p>
                  <p className="text-[10px] text-ink/50">Diagnostic rate</p>
                </div>
              </motion.div>

              <motion.div
                className="absolute -left-2 lg:-left-8 bottom-12 glass-card !rounded-2xl !bg-white/35 !border-white/30 px-4 py-3 flex items-center gap-2"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 4, repeat: Infinity, delay: 1 }}
              >
                <Star className="text-gold" size={20} />
                <div className="text-left">
                  <p className="text-xs font-bold text-forest">10+ Years</p>
                  <p className="text-[10px] text-ink/50">In radiology</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
          </div>
        </div>
      </section>

      <IRGalleryBento />

      {/* Stats */}
      <section className="bg-forest py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {stats.map((s, i) => (
              <FadeIn key={s.label} delay={i * 0.1}>
                <div className="text-center">
                  <p className="font-display text-3xl md:text-4xl font-bold text-gold-light">{s.value}</p>
                  <p className="text-sm text-white/65 mt-1">{s.label}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Your IR Care Journey</h2>
            <p className="mt-4 text-ink/60 max-w-2xl mx-auto">
              A smooth, specialist-led pathway from first contact to recovery and follow-up.
            </p>
          </FadeIn>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {journeySteps.map(({ title, description, Icon }, index) => (
              <FadeIn key={title} delay={index * 0.08}>
                <div className="card modern-ir-card h-full">
                  <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold/12 text-forest">
                    <Icon size={20} />
                  </div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-burgundy/75">
                    Step {index + 1}
                  </p>
                  <h3 className="font-display text-xl font-semibold text-forest mb-2">{title}</h3>
                  <p className="text-sm leading-relaxed text-ink/60">{description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="section-sky relative overflow-hidden">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-14">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Specialised Interventional Radiology Services</h2>
            <p className="mt-4 text-ink/60 max-w-2xl mx-auto">
              Minimally invasive, image-guided interventional radiology care for patients across Kenya.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => {
              const Icon = getServiceIcon(s.slug);
              return (
                <FadeIn key={s.slug} delay={i * 0.08}>
                  <Link to={`/services/${s.slug}`} className="card modern-ir-card block h-full group">
                    <div className="h-10 w-10 rounded-xl bg-sky-pad flex items-center justify-center mb-4 group-hover:bg-gold/15 transition-colors">
                      <Icon size={20} className="text-forest group-hover:text-gold transition-colors" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-forest mb-2">{s.title}</h3>
                    <p className="text-sm text-ink/60 leading-relaxed">{s.description}</p>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-burgundy mt-4 group-hover:gap-2 transition-all">
                      Learn more <ArrowRight size={14} />
                    </span>
                  </Link>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn className="text-center mt-10">
            <Link to="/services" className="btn-primary">
              View All Services <ArrowRight size={16} />
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* About preview */}
      <section className="section-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn direction="left">
              <div className="flex justify-center lg:justify-start mb-8 lg:mb-0">
                <ProfileImage size="lg" />
              </div>
            </FadeIn>
            <FadeIn direction="right" delay={0.1}>
              <div className="gold-line mb-4" />
              <h2 className="section-heading mb-6">About {doctor.shortName}</h2>
              <p className="text-ink/70 leading-relaxed mb-6">
                {doctor.name} is a fellowship-trained interventional radiologist based in Kenya.
                She specialises in a full range of minimally invasive, image-guided IR procedures,
                including biopsy, vascular, oncology, and portal interventions for patients nationwide.
              </p>
              <Link to="/about" className="btn-outline">
                Full Profile <ArrowRight size={16} />
              </Link>
              <div className="mt-8 space-y-3">
                {credentials.slice(0, 3).map((c) => (
                  <div key={c.label} className="flex items-start gap-3 text-sm">
                    <Award size={16} className="text-gold shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-forest">{c.label}</span>
                      <span className="text-ink/60"> — {c.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* FAQ preview */}
      <section className="section-sky">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Common Questions</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto">
            {faqs.slice(0, 4).map((f, i) => (
              <FadeIn key={f.q} delay={i * 0.08}>
                <div className="card modern-ir-card !p-5 h-full">
                  <h3 className="font-semibold text-forest text-sm mb-2 flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    {f.q}
                  </h3>
                  <p className="text-xs text-ink/60 leading-relaxed pl-6">{f.a}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn className="text-center mt-8">
            <Link to="/faq" className="text-sm font-semibold text-burgundy hover:text-burgundy-light transition-colors">
              View all FAQs &rarr;
            </Link>
          </FadeIn>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 text-center z-10">
          <FadeIn>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
              Ready to Book Your Consultation?
            </h2>
            <p className="text-white/75 mb-8 max-w-xl mx-auto">
              Contact {doctor.shortName} today for expert interventional radiology services across Kenya.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href={`tel:${doctor.phonesRaw[0]}`} className="btn-gold">
                <Phone size={16} /> {doctor.phones[0]}
              </a>
              <a href={`tel:${doctor.phonesRaw[1]}`} className="btn-outline !border-white/30 !text-white hover:!border-gold-light hover:!text-gold-light !bg-white/10">
                <Phone size={16} /> {doctor.phones[1]}
              </a>
            </div>
            <p className="mt-6 text-xs text-white/50 flex items-center justify-center gap-1.5">
              <Clock size={12} /> Same-day discharge for most procedures
            </p>
          </FadeIn>
        </div>
      </section>
    </>
  );
}
