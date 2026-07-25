import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  ScanLine,
  Clock,
  Syringe,
  Activity,
  CheckCircle2,
  Star,
  Download,
  MapPin,
  Handshake,
} from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { getServiceIcon } from '../utils/serviceIcons';
import { images } from '../assets/images';
import {
  services,
  type IRServiceCategory,
  irServiceCategories,
  type IRCondition,
  irConditions,
  flyerContent,
} from '../data/content';

const categoryIcons = [ScanLine, Activity, CheckCircle2, Star, Clock, Syringe];

function ReactiveIRCard({ category, index }: { category: IRServiceCategory; index: number }) {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const Icon = categoryIcons[index % categoryIcons.length];

  return (
    <motion.article
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setMouse({ x, y });
      }}
      whileHover={{ y: -8, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="group modern-ir-card relative overflow-hidden rounded-2xl border border-gold/20 bg-white/90 p-6 shadow-sm backdrop-blur-sm"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(184, 149, 47, 0.26), transparent 45%)`,
        }}
      />

      <div className="relative z-10">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-burgundy">
          <Icon size={14} />
          {category.highlight}
        </div>

        <h3 className="font-display text-xl font-semibold text-navy mb-2">{category.title}</h3>
        <p className="text-sm text-navy/65 leading-relaxed mb-4">{category.description}</p>

        <ul className="space-y-2">
          {category.procedures.slice(0, 4).map((procedure) => (
            <li key={procedure} className="text-sm text-navy/75 flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-gold shrink-0" />
              {procedure}
            </li>
          ))}
        </ul>

        <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold transition-all duration-200 group-hover:gap-2">
          <span>Procedure list expands on consultation</span>
          <ArrowRight size={14} />
        </div>
      </div>
    </motion.article>
  );
}

function FlyerConditionRow({ condition, index }: { condition: IRCondition; index: number }) {
  const Icon = categoryIcons[index % categoryIcons.length];

  return (
    <motion.li
      initial={{ opacity: 0, x: -12 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: index * 0.05, duration: 0.35 }}
      className="group flex gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:border-gold/25 hover:bg-white/70"
    >
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-forest/10 text-forest transition-colors group-hover:bg-gold/15 group-hover:text-gold">
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-base font-semibold text-navy">{condition.title}</h3>
        <p className="mt-0.5 text-sm leading-relaxed text-navy/65">{condition.description}</p>
      </div>
    </motion.li>
  );
}

function DownloadableFlyerCard() {
  return (
    <div
      className="tilt-card-scene relative mx-auto w-full max-w-md lg:max-w-none"
      style={{ perspective: 1200 }}
    >
      <div className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-gold/20 via-transparent to-forest/15 blur-2xl" />

      <motion.div
        className="tilt-card-body relative"
        whileHover={{ rotateY: -9, rotateX: 5, scale: 1.025, z: 24 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        <div className="overflow-hidden rounded-2xl border border-gold/30 bg-[#111] shadow-[0_28px_60px_rgba(18,43,64,0.28)] ring-1 ring-white/10">
          <img
            src={images.flyer}
            alt="Apex Care IR services flyer — conditions we treat"
            className="block h-auto w-full object-cover object-top"
          />
        </div>
      </motion.div>

      <div className="relative z-10 mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
        <a
          href={images.flyer}
          download={flyerContent.downloadFileName}
          className="btn-gold"
          aria-label="Download Apex Care IR services flyer"
        >
          <Download size={16} />
          Download Flyer
        </a>
        <p className="text-center text-xs text-navy/55 sm:text-left">
          Free for patients & referring clinicians
        </p>
      </div>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <>
      {/* Interventional Radiology Services — heading, then flyer + extracted content */}
      <section className="relative overflow-hidden bg-hero-gradient py-16 sm:py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center">
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">Interventional Radiology Services</h1>
            <p className="mx-auto mt-4 max-w-2xl text-navy/60">
              {flyerContent.subheadline}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Vascular', 'Liver', "Women's Health", 'Oncology', 'Pain Management'].map((label) => (
                <span key={label} className="ir-chip">
                  {label}
                </span>
              ))}
            </div>
          </FadeIn>

          <div className="mt-10 grid items-start gap-10 lg:mt-12 lg:grid-cols-12 lg:gap-12">
            <FadeIn className="lg:col-span-7" direction="left">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-burgundy">
                Conditions we treat
              </p>
              <ul className="space-y-1 rounded-3xl border border-gold/15 bg-white/70 p-3 shadow-sm backdrop-blur-sm sm:p-4">
                {irConditions.map((condition, i) => (
                  <FlyerConditionRow key={condition.slug} condition={condition} index={i} />
                ))}
              </ul>

              <div className="mt-6 rounded-2xl border border-forest/15 bg-[#0f1412] px-5 py-5 text-white shadow-lg">
                <div className="mb-3 flex items-center gap-2 text-gold">
                  <Handshake size={18} />
                  <h2 className="font-display text-lg font-semibold">{flyerContent.referringTitle}</h2>
                </div>
                <p className="text-sm leading-relaxed text-white/70">{flyerContent.referringMessage}</p>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {flyerContent.referringPoints.map((point) => (
                    <li key={point} className="flex items-center gap-2 text-sm text-white/85">
                      <CheckCircle2 size={14} className="shrink-0 text-gold" />
                      {point}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4 text-xs uppercase tracking-wide text-gold/90">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={12} />
                    {flyerContent.locationLine}
                  </span>
                  <span className="text-white/30">·</span>
                  <span>{flyerContent.tagline}</span>
                </div>
              </div>
            </FadeIn>

            <FadeIn className="lg:col-span-5 lg:sticky lg:top-28" direction="right">
              <DownloadableFlyerCard />
            </FadeIn>
          </div>
        </div>
      </section>

      <section className="section-sky relative overflow-hidden">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12 text-center">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Biopsy & Diagnostic Services</h2>
            <p className="mx-auto mt-4 max-w-2xl text-navy/60">
              Precise, image-guided tissue sampling with same-day discharge for most patients.
            </p>
          </FadeIn>

          <div className="grid gap-8 md:grid-cols-2">
            {services.map((s, i) => {
              const Icon = getServiceIcon(s.slug);
              return (
                <FadeIn key={s.slug} delay={i * 0.08}>
                  <Link to={`/services/${s.slug}`} className="card modern-ir-card group block h-full">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-sky-pad transition-colors group-hover:bg-gold/20">
                        <Icon size={24} className="text-navy transition-colors group-hover:text-gold" />
                      </div>
                      <div className="flex-1">
                        <h2 className="mb-2 font-display text-xl font-semibold text-navy">{s.title}</h2>
                        <p className="mb-4 text-sm leading-relaxed text-navy/60">{s.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-navy/50">
                          <span className="flex items-center gap-1"><Clock size={12} /> {s.duration}</span>
                          <span className="flex items-center gap-1"><Syringe size={12} /> {s.anaesthesia}</span>
                        </div>
                        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-gold transition-all group-hover:gap-2">
                          View details <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section-white relative overflow-hidden">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12 text-center">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Interventional Radiology Procedures</h2>
            <p className="mx-auto mt-4 max-w-3xl text-navy/60">
              Explore a full spectrum of minimally invasive, image-guided procedures including venous access,
              embolization, interventional oncology, dialysis access support, vascular therapy, diagnostic
              sampling, and spine pain interventions.
            </p>
          </FadeIn>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {irServiceCategories.map((category, i) => (
              <FadeIn key={category.slug} delay={i * 0.06}>
                <ReactiveIRCard category={category} index={i} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
