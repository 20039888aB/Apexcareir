import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, ScanLine, Shield } from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { faqs } from '../data/content';

export default function FAQPage() {
  const [open, setOpen] = useState<number | null>(0);
  const faqHighlights = [
    {
      title: 'Patient guidance',
      text: 'Clear answers about preparation, recovery, and what to expect.',
      Icon: HelpCircle,
    },
    {
      title: 'Procedure clarity',
      text: 'Understand how image-guided IR procedures are planned and performed.',
      Icon: ScanLine,
    },
    {
      title: 'Safety first',
      text: 'Answers are framed around safe, specialist-led decision-making.',
      Icon: Shield,
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">Frequently Asked Questions</h1>
            <p className="mt-4 text-navy/60 max-w-2xl mx-auto">
              Everything you need to know about interventional radiology procedures in Kenya.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Preparation', 'Recovery', 'Biopsy', 'Interventional Radiology'].map((label) => (
                <span key={label} className="ir-chip">
                  {label}
                </span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {faqHighlights.map(({ title, text, Icon }, index) => (
              <FadeIn key={title} delay={index * 0.06}>
                <div className="card modern-ir-card !p-5 h-full">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/12 text-forest">
                    <Icon size={18} />
                  </div>
                  <h2 className="font-semibold text-navy mb-2">{title}</h2>
                  <p className="text-sm leading-relaxed text-navy/60">{text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn className="text-center mb-8">
            <div className="gold-line mx-auto mb-4" />
            <h2 className="font-display text-2xl md:text-3xl font-semibold text-forest">Common Questions, Clearly Answered</h2>
            <p className="mt-3 max-w-2xl mx-auto text-sm text-navy/60 leading-relaxed">
              Browse the most common patient questions about consultations, biopsy procedures, preparation, recovery, and how interventional radiology care works.
            </p>
          </FadeIn>

          <div className="mx-auto max-w-3xl space-y-3">
            {faqs.map((f, i) => (
              <FadeIn key={f.q} delay={i * 0.05}>
                <div className="card modern-ir-card !p-0 overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between p-5 text-left"
                    onClick={() => setOpen(open === i ? null : i)}
                  >
                    <span className="font-semibold text-navy text-sm pr-4">{f.q}</span>
                    <motion.span animate={{ rotate: open === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown size={18} className="text-gold shrink-0" />
                    </motion.span>
                  </button>
                  <AnimatePresence>
                    {open === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-sm text-navy/60 leading-relaxed border-t border-sky-pad pt-4">
                          {f.a}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
