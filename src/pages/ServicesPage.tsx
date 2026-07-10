import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ScanLine, Clock, Syringe, Activity, CheckCircle2, Star,
} from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { getServiceIcon } from '../utils/serviceIcons';
import {
  services,
  type IRServiceCategory,
  irServiceCategories,
  type IRCondition,
  irConditions,
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

function ReactiveConditionCard({ condition, index }: { condition: IRCondition; index: number }) {
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const Icon = categoryIcons[(index + 2) % categoryIcons.length];

  return (
    <motion.article
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        setMouse({ x, y });
      }}
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      className="group modern-ir-card relative overflow-hidden rounded-2xl border border-forest/15 bg-white/90 p-6 shadow-sm backdrop-blur-sm"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(27, 77, 62, 0.18), transparent 45%)`,
        }}
      />

      <div className="relative z-10">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest group-hover:bg-gold/15 group-hover:text-gold transition-colors">
          <Icon size={18} />
        </div>
        <h3 className="font-display text-lg font-semibold text-navy mb-1">{condition.title}</h3>
        <p className="text-xs font-medium uppercase tracking-wide text-burgundy/80 mb-3">{condition.subtitle}</p>
        <p className="text-sm text-navy/65 leading-relaxed mb-4">{condition.description}</p>
        <div className="flex flex-wrap gap-2">
          {condition.treatmentExamples.map((example) => (
            <span key={example} className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-xs text-navy/75">
              {example}
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export default function ServicesPage() {
  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-white/50 bg-white/60 p-2 shadow-glass backdrop-blur-md">
              <img
                src="/IR 1.png"
                alt="Interventional Radiology visual"
                className="h-52 w-full rounded-2xl object-cover sm:h-64"
              />
            </div>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">Interventional Radiology Services</h1>
            <p className="mt-4 text-navy/60 max-w-2xl mx-auto">
              Comprehensive, image-guided interventional radiology care for patients across Kenya.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Biopsy', 'Vascular', 'Oncology', 'Drainage', 'Dialysis Access'].map((label) => (
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
          <div className="grid md:grid-cols-2 gap-8">
            {services.map((s, i) => {
              const Icon = getServiceIcon(s.slug);
              return (
                <FadeIn key={s.slug} delay={i * 0.08}>
                  <Link to={`/services/${s.slug}`} className="card modern-ir-card block h-full group">
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-sky-pad flex items-center justify-center shrink-0 group-hover:bg-gold/20 transition-colors">
                        <Icon size={24} className="text-navy group-hover:text-gold transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h2 className="font-display text-xl font-semibold text-navy mb-2">{s.title}</h2>
                        <p className="text-sm text-navy/60 leading-relaxed mb-4">{s.description}</p>
                        <div className="flex flex-wrap gap-3 text-xs text-navy/50">
                          <span className="flex items-center gap-1"><Clock size={12} /> {s.duration}</span>
                          <span className="flex items-center gap-1"><Syringe size={12} /> {s.anaesthesia}</span>
                        </div>
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-gold mt-4 group-hover:gap-2 transition-all">
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

      <section className="section-sky relative overflow-hidden">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">Interventional Radiology Procedures</h2>
            <p className="mt-4 text-navy/60 max-w-3xl mx-auto">
              Explore a full spectrum of minimally invasive, image-guided procedures including venous access,
              embolization, interventional oncology, dialysis access support, vascular therapy, diagnostic
              sampling, and spine pain interventions.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {irServiceCategories.map((category, i) => (
              <FadeIn key={category.slug} delay={i * 0.06}>
                <ReactiveIRCard category={category} index={i} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      <section className="section-white relative overflow-hidden">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center mb-12">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="section-heading">7 Conditions Treated with Interventional Radiology</h2>
            <p className="mt-4 text-navy/60 max-w-3xl mx-auto">
              These are some of the common conditions that can be evaluated and managed using modern
              minimally invasive interventional radiology techniques.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {irConditions.map((condition, i) => (
              <FadeIn key={condition.slug} delay={i * 0.06}>
                <ReactiveConditionCard condition={condition} index={i} />
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
