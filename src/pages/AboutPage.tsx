import { motion } from 'framer-motion';
import { Award, MapPin, Phone, Shield, GraduationCap, CheckCircle2, ScanLine } from 'lucide-react';
import ProfileImage from '../components/ProfileImage';
import Logo from '../components/Logo';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { doctor, credentials, stats } from '../data/content';

export default function AboutPage() {
  const trustPoints = [
    'Nationwide patient support and referral coordination',
    'Minimally invasive, image-guided planning for safer targeted procedures',
    'Patient-centred communication with clear preparation and recovery guidance',
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center z-10">
          <FadeIn>
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">About {doctor.name}</h1>
            <p className="mt-4 text-ink/60 max-w-2xl mx-auto text-lg">
              Fellowship-trained interventional radiologist providing comprehensive, image-guided IR care across Kenya.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Interventional Radiology', 'Nationwide Care', 'Image-guided Procedures'].map((label) => (
                <span key={label} className="ir-chip">
                  {label}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <FadeIn direction="left">
              <motion.div
                className="glass-card p-10 text-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-center mb-6">
                  <ProfileImage size="xl" />
                </div>
                <h2 className="font-display text-2xl font-semibold text-forest">{doctor.name}</h2>
                <p className="text-burgundy font-medium mt-1">{doctor.title}</p>
                <p className="text-ink/50 text-sm mt-4">{doctor.clinic}</p>
                <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {stats.map((s) => (
                    <div key={s.label} className="bg-forest/5 rounded-xl p-3 border border-forest/10">
                      <p className="font-display text-xl font-bold text-gold">{s.value}</p>
                      <p className="text-[10px] text-ink/50">{s.label}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            </FadeIn>

            <FadeIn direction="right" delay={0.15}>
              <h2 className="font-display text-2xl font-semibold text-forest mb-6">Professional Background</h2>
              <p className="text-ink/70 leading-relaxed mb-4">
                {doctor.name} is a consultant interventional radiologist practising at {doctor.clinic} in
                Nairobi. She provides a full scope of interventional radiology services to patients
                from all over Kenya.
              </p>
              <p className="text-ink/70 leading-relaxed mb-8">
                With over ten years of experience in diagnostic and interventional radiology, Dr Alice
                combines advanced imaging technology with a patient-centred approach to deliver accurate
                diagnoses with minimal discomfort and same-day discharge for most procedures.
              </p>

              <div className="mb-8 rounded-[1.5rem] border border-gold/20 bg-gradient-to-br from-white to-sky-pad/35 p-5 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gold/15 text-gold-dark">
                    <ScanLine size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-burgundy/70">Clinical approach</p>
                    <p className="font-display text-xl font-semibold text-forest">Precision, safety, and patient clarity</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {trustPoints.map((point) => (
                    <div key={point} className="flex items-start gap-3 text-sm text-ink/65">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {credentials.map((c, i) => (
                  <motion.div
                    key={c.label}
                    className="card !p-5 flex items-start gap-4"
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="h-10 w-10 rounded-xl bg-sky-pad flex items-center justify-center shrink-0">
                      <GraduationCap size={18} className="text-forest" />
                    </div>
                    <div>
                      <p className="font-semibold text-forest">{c.label}</p>
                      <p className="text-sm text-ink/60 mt-0.5">{c.detail}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section-sky">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Why Choose {doctor.shortName}?</h2>
          </FadeIn>
          <div className="grid sm:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: '90%+ Diagnostic Accuracy', desc: 'Image-guided precision targeting maximises representative tissue sampling.' },
              { icon: Award, title: 'Fellowship-Trained', desc: 'Sub-specialist training in interventional radiology from the University of Nairobi.' },
              { icon: MapPin, title: 'Dedicated IR Suite', desc: `Advanced CT and ultrasound technology at ${doctor.clinic}.` },
            ].map((item, i) => (
              <FadeIn key={item.title} delay={i * 0.1}>
                <div className="card modern-ir-card text-center h-full">
                  <div className="h-12 w-12 rounded-2xl bg-gold/15 flex items-center justify-center mx-auto mb-4">
                    <item.icon size={22} className="text-gold" />
                  </div>
                  <h3 className="font-semibold text-forest mb-2">{item.title}</h3>
                  <p className="text-sm text-ink/60">{item.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest py-16 text-center">
        <FadeIn>
          <h2 className="font-display text-2xl font-bold text-white mb-4">Get in Touch</h2>
          <p className="text-white/70 mb-6">Accepting new patients and referrals</p>
          <div className="flex flex-wrap justify-center gap-4">
            {doctor.phones.map((p, i) => (
              <a key={i} href={`tel:${doctor.phonesRaw[i]}`} className="btn-gold">
                <Phone size={16} /> {p}
              </a>
            ))}
          </div>
        </FadeIn>
      </section>
    </>
  );
}
