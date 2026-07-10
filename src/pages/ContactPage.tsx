import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Phone, MapPin, Mail, MessageCircle, Send, CheckCircle2, Clock, Shield } from 'lucide-react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { doctor, preparationChecklist, costFactors } from '../data/content';
import { createContactRequest } from '../services';

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const quickAssurance = [
    { icon: Clock, title: 'Fast follow-up', text: 'Our team reviews new requests promptly and coordinates next steps.' },
    { icon: Shield, title: 'Private & secure', text: 'Clinical details are saved securely and shared with the care team only.' },
    { icon: CheckCircle2, title: 'Specialist-led guidance', text: 'Get routed toward consultation, referral review, or quotation support.' },
  ];

  const createContactMutation = useMutation({
    mutationFn: createContactRequest,
    onSuccess: () => {
      setSubmitted(true);
      setForm({ name: '', phone: '', email: '', subject: '', message: '' });
    },
  });

  const phoneError = form.phone.length > 0 && form.phone.length !== 10 ? 'Phone number must be exactly 10 digits.' : '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.phone.length !== 10) {
      return;
    }
    createContactMutation.mutate({
      full_name: form.name.trim(),
      phone_number: form.phone.trim(),
      email: form.email.trim() || undefined,
      subject: form.subject.trim() || undefined,
      message: form.message.trim(),
    });
  };

  return (
    <>
      <section className="relative overflow-hidden bg-hero-gradient py-20">
        <FloatingMedicalBg variant="subtle" />
        <FloatingIRMotifs variant="subtle" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <FadeIn>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="section-heading">Contact & Book</h1>
            <p className="mt-4 text-navy/60 max-w-2xl mx-auto">
              Reach {doctor.name} for consultations, referrals, and interventional radiology quotations from anywhere in Kenya.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Consultations', 'Referrals', 'IR Quotations', 'Nationwide Support'].map((label) => (
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
          <div className="mb-10 grid gap-4 md:grid-cols-3">
            {quickAssurance.map((item, index) => (
              <FadeIn key={item.title} delay={index * 0.06}>
                <div className="card modern-ir-card !p-5 h-full">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gold/12 text-forest">
                    <item.icon size={18} />
                  </div>
                  <h2 className="font-semibold text-forest mb-2">{item.title}</h2>
                  <p className="text-sm leading-relaxed text-ink/60">{item.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact info */}
            <FadeIn direction="left">
              <div className="space-y-6">
                <h2 className="font-display text-2xl font-semibold text-navy">Get in Touch</h2>

                {[
                  { icon: Phone, title: 'Phone Numbers', content: doctor.phones.map((p, i) => (
                    <a key={i} href={`tel:${doctor.phonesRaw[i]}`} className="block hover:text-gold transition-colors">{p}</a>
                  )) },
                  { icon: MessageCircle, title: 'WhatsApp', content: (
                    <a href={`https://wa.me/${doctor.whatsapp}`} target="_blank" rel="noopener noreferrer" className="hover:text-gold transition-colors">
                      Chat on WhatsApp
                    </a>
                  ) },
                  { icon: MapPin, title: 'Location', content: (
                    <span>{doctor.clinic}<br />{doctor.hospital}<br />{doctor.address}</span>
                  ) },
                  { icon: Mail, title: 'Email', content: (
                    <a href={`mailto:${doctor.email}`} className="hover:text-gold transition-colors">{doctor.email}</a>
                  ) },
                ].map((item) => (
                  <div key={item.title} className="card modern-ir-card !p-5 flex items-start gap-4">
                    <div className="h-10 w-10 rounded-xl bg-sky-pad flex items-center justify-center shrink-0">
                      <item.icon size={18} className="text-navy" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy text-sm">{item.title}</p>
                      <div className="text-sm text-navy/60 mt-1">{item.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Form */}
            <FadeIn direction="right" delay={0.15}>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="card modern-ir-card text-center py-12"
                >
                  <CheckCircle2 size={48} className="text-gold mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold text-navy mb-2">Message Sent!</h3>
                  <p className="text-sm text-navy/60">Your message has been saved and the care team has been notified. Dr Alice will respond shortly.</p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="card modern-ir-card space-y-5">
                  <h2 className="font-display text-xl font-semibold text-navy">Send a Message</h2>
                  <p className="text-sm leading-relaxed text-navy/60">
                    Share your clinical question, suspected procedure, referral request, or quotation need and the team will guide you on the next step.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Full Name</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Phone Number</label>
                    <input
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                      inputMode="numeric"
                      pattern="\d{10}"
                      minLength={10}
                      maxLength={10}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="0712345678"
                    />
                    {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Email (optional)</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Subject (optional)</label>
                    <input
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="Consultation request / Procedure inquiry"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Clinical Question / Indication</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors resize-none"
                      placeholder="Describe your clinical question or IR procedure you need..."
                    />
                  </div>
                  {createContactMutation.isError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      Unable to send your request right now. Please try again.
                    </div>
                  )}
                  <button
                    type="submit"
                    className="btn-gold w-full"
                    disabled={createContactMutation.isPending || Boolean(phoneError)}
                  >
                    <Send size={16} /> {createContactMutation.isPending ? 'Sending...' : 'Send Request'}
                  </button>
                </form>
              )}
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Preparation & Cost */}
      <section className="section-sky">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10">
            <FadeIn>
              <div className="gold-line mb-4" />
              <h2 className="font-display text-2xl font-semibold text-navy mb-6">What to Bring</h2>
              <ul className="space-y-3">
                {preparationChecklist.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-navy/70">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="gold-line mb-4" />
              <h2 className="font-display text-2xl font-semibold text-navy mb-6">Cost Factors</h2>
              <ul className="space-y-3">
                {costFactors.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-navy/70">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-sm text-navy/50">
                Request a transparent quotation via WhatsApp or phone before your procedure.
              </p>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
