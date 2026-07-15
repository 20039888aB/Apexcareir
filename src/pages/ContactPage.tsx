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

  const contactItems = [
    {
      icon: Phone,
      title: 'Phone Numbers',
      tone: 'border-forest/25 bg-gradient-to-br from-forest/12 via-emerald-50/80 to-white',
      iconWrap: 'bg-gradient-to-br from-forest to-emerald-700 text-white shadow-[0_8px_20px_rgba(27,77,62,0.28)]',
      content: doctor.phones.map((p, i) => (
        <a key={i} href={`tel:${doctor.phonesRaw[i]}`} className="block font-medium text-forest hover:text-gold transition-colors">
          {p}
        </a>
      )),
    },
    {
      icon: MessageCircle,
      title: 'WhatsApp',
      tone: 'border-[#25D366]/30 bg-gradient-to-br from-[#25D366]/14 via-emerald-50/70 to-white',
      iconWrap: 'bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white shadow-[0_8px_20px_rgba(37,211,102,0.28)]',
      content: (
        <a
          href={`https://wa.me/${doctor.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-medium text-[#128C7E] hover:text-[#25D366] transition-colors"
        >
          Chat on WhatsApp
        </a>
      ),
    },
    {
      icon: MapPin,
      title: 'Location',
      tone: 'border-burgundy/25 bg-gradient-to-br from-burgundy/12 via-rose-50/70 to-white',
      iconWrap: 'bg-gradient-to-br from-burgundy to-rose-700 text-white shadow-[0_8px_20px_rgba(110,44,62,0.28)]',
      content: (
        <span className="text-navy/75">
          {doctor.clinic}
          <br />
          {doctor.hospital}
          <br />
          {doctor.address}
        </span>
      ),
    },
    {
      icon: Mail,
      title: 'Email',
      tone: 'border-gold/35 bg-gradient-to-br from-gold/18 via-amber-50/80 to-white',
      iconWrap: 'bg-gradient-to-br from-gold to-amber-600 text-white shadow-[0_8px_20px_rgba(184,149,47,0.32)]',
      content: (
        <a href={`mailto:${doctor.email}`} className="font-medium text-amber-800 hover:text-gold transition-colors">
          {doctor.email}
        </a>
      ),
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
              <div className="relative overflow-hidden rounded-[1.75rem] border border-gold/25 bg-gradient-to-br from-forest/8 via-white to-burgundy/8 p-5 shadow-[0_20px_50px_rgba(16,35,29,0.1)] sm:p-6 md:p-7">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold/20 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-forest/15 blur-3xl" />

                <div className="relative mb-6">
                  <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-burgundy/20 bg-burgundy/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-burgundy">
                    <Shield size={12} className="text-gold" />
                    Contact Us
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-forest sm:text-3xl">Get in Touch</h2>
                  <p className="mt-2 max-w-md text-sm leading-relaxed text-navy/65">
                    Reach the ApexcareIR team for consultations, referrals, and procedure quotations anywhere in Kenya.
                  </p>
                </div>

                <div className="relative space-y-4">
                  {contactItems.map((item, index) => (
                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, x: -16 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.45, delay: index * 0.08 }}
                      className={`flex items-start gap-4 rounded-2xl border p-4 backdrop-blur-sm transition-transform duration-300 hover:-translate-y-0.5 ${item.tone}`}
                    >
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.iconWrap}`}>
                        <item.icon size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-navy text-sm">{item.title}</p>
                        <div className="mt-1 text-sm">{item.content}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="relative mt-6 rounded-2xl border border-sky-light/60 bg-gradient-to-r from-sky-pad/70 via-white/80 to-gold/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest/70">Office Hours</p>
                  <p className="mt-1 flex items-center gap-2 text-sm font-medium text-navy">
                    <Clock size={15} className="text-gold" />
                    Monday – Saturday · 8:00 AM – 6:00 PM
                  </p>
                </div>
              </div>
            </FadeIn>

            {/* Form */}
            <FadeIn direction="right" delay={0.15}>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative overflow-hidden rounded-[1.75rem] border-2 border-burgundy/40 border-l-[4px] border-l-forest/70 bg-gradient-to-br from-emerald-50 via-white to-burgundy/10 px-6 py-12 text-center shadow-[0_20px_50px_rgba(110,44,62,0.12)] sm:px-8"
                >
                  <div className="pointer-events-none absolute -right-8 top-0 h-32 w-32 rounded-full bg-gold/25 blur-3xl" />
                  <div className="pointer-events-none absolute -bottom-10 left-0 h-36 w-36 rounded-full bg-emerald-200/40 blur-3xl" />
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-forest text-white shadow-[0_10px_24px_rgba(27,77,62,0.28)]">
                    <CheckCircle2 size={34} />
                  </div>
                  <h3 className="relative font-display text-2xl font-semibold text-forest mb-2">Message Sent!</h3>
                  <p className="relative text-sm leading-relaxed text-navy/70 max-w-sm mx-auto">
                    Your message has been saved and the care team has been notified. Dr Alice will respond shortly.
                  </p>
                </motion.div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="relative overflow-hidden rounded-[1.75rem] border-2 border-burgundy/40 border-l-[4px] border-l-forest/70 bg-gradient-to-br from-burgundy/8 via-white to-forest/8 p-5 shadow-[0_20px_50px_rgba(110,44,62,0.14)] sm:p-6 md:p-7 space-y-5"
                >
                  <div className="pointer-events-none absolute -left-10 top-8 h-36 w-36 rounded-full bg-forest/20 blur-3xl" />
                  <div className="pointer-events-none absolute -right-8 bottom-6 h-40 w-40 rounded-full bg-burgundy/18 blur-3xl" />

                  <div className="relative">
                    <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-burgundy/35 border-l-[3px] border-l-forest/60 bg-burgundy/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-burgundy">
                      <Send size={12} className="text-gold" />
                      Send a Message
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-forest sm:text-[1.7rem]">Tell Us How We Can Help</h2>
                    <p className="mt-2 text-sm leading-relaxed text-navy/65">
                      Share your clinical question, suspected procedure, referral request, or quotation need and the team will guide you on the next step.
                    </p>
                  </div>

                  <div className="relative grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2 rounded-2xl border border-burgundy/30 border-l-[3px] border-l-forest/55 bg-gradient-to-r from-burgundy/6 via-white/90 to-forest/6 p-4">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        Full Name
                      </label>
                      <input
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full rounded-xl border border-burgundy/25 border-l-2 border-l-forest/40 bg-white/90 px-4 py-3 text-sm text-navy outline-none transition-colors focus:border-burgundy focus:border-l-forest focus:ring-2 focus:ring-forest/20"
                        placeholder="Your name"
                      />
                    </div>

                    <div className="rounded-2xl border border-burgundy/30 border-l-[3px] border-l-forest/55 bg-gradient-to-r from-burgundy/6 via-white/90 to-forest/5 p-4">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        Phone Number
                      </label>
                      <input
                        required
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                        inputMode="numeric"
                        pattern="\d{10}"
                        minLength={10}
                        maxLength={10}
                        className="w-full rounded-xl border border-burgundy/25 border-l-2 border-l-forest/40 bg-white/90 px-4 py-3 text-sm text-navy outline-none transition-colors focus:border-burgundy focus:border-l-forest focus:ring-2 focus:ring-forest/20"
                        placeholder="0712345678"
                      />
                      {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
                    </div>

                    <div className="rounded-2xl border border-burgundy/30 border-l-[3px] border-l-forest/55 bg-gradient-to-r from-burgundy/6 via-white/90 to-forest/5 p-4">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        Email (optional)
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="w-full rounded-xl border border-burgundy/25 border-l-2 border-l-forest/40 bg-white/90 px-4 py-3 text-sm text-navy outline-none transition-colors focus:border-burgundy focus:border-l-forest focus:ring-2 focus:ring-forest/20"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-burgundy/30 border-l-[3px] border-l-forest/55 bg-gradient-to-r from-burgundy/6 via-white/90 to-forest/6 p-4">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        Subject (optional)
                      </label>
                      <input
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        className="w-full rounded-xl border border-burgundy/25 border-l-2 border-l-forest/40 bg-white/90 px-4 py-3 text-sm text-navy outline-none transition-colors focus:border-burgundy focus:border-l-forest focus:ring-2 focus:ring-forest/20"
                        placeholder="Consultation request / Procedure inquiry"
                      />
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-burgundy/30 border-l-[3px] border-l-forest/55 bg-gradient-to-r from-burgundy/8 via-white/90 to-forest/8 p-4">
                      <label className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-burgundy">
                        <span className="h-2 w-2 rounded-full bg-forest" />
                        Clinical Question / Indication
                      </label>
                      <textarea
                        required
                        rows={4}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full rounded-xl border border-burgundy/25 border-l-2 border-l-forest/40 bg-white/90 px-4 py-3 text-sm text-navy outline-none transition-colors resize-none focus:border-burgundy focus:border-l-forest focus:ring-2 focus:ring-forest/20"
                        placeholder="Describe your clinical question or IR procedure you need..."
                      />
                    </div>
                  </div>

                  {createContactMutation.isError && (
                    <div className="relative rounded-xl border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 px-4 py-3 text-xs text-red-700">
                      Unable to send your request right now. Please try again.
                    </div>
                  )}

                  <button
                    type="submit"
                    className="relative w-full overflow-hidden rounded-2xl border-2 border-burgundy/35 border-l-[3px] border-l-forest/70 bg-gradient-to-r from-forest via-emerald-700 to-burgundy px-6 py-3.5 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(110,44,62,0.22)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-65 inline-flex items-center justify-center gap-2"
                    disabled={createContactMutation.isPending || Boolean(phoneError)}
                  >
                    <Send size={16} />
                    {createContactMutation.isPending ? 'Sending...' : 'Send Request'}
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
