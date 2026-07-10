import { useMutation } from '@tanstack/react-query';
import { CalendarDays, CheckCircle2, Clock3, Send, Shield, PhoneCall } from 'lucide-react';
import { useState } from 'react';
import FloatingMedicalBg from '../components/animations/FloatingMedicalBg';
import FloatingIRMotifs from '../components/animations/FloatingIRMotifs';
import FadeIn from '../components/animations/FadeIn';
import { images } from '../assets/images';
import { createAppointment } from '../services';

const counties = [
  'Baringo',
  'Bomet',
  'Bungoma',
  'Busia',
  'Elgeyo-Marakwet',
  'Embu',
  'Garissa',
  'Homa Bay',
  'Isiolo',
  'Kajiado',
  'Kakamega',
  'Kericho',
  'Kiambu',
  'Kilifi',
  'Kirinyaga',
  'Kisii',
  'Kisumu',
  'Kitui',
  'Kwale',
  'Laikipia',
  'Lamu',
  'Machakos',
  'Makueni',
  'Mandera',
  'Marsabit',
  'Meru',
  'Migori',
  'Mombasa',
  'Murang’a',
  'Nairobi',
  'Nakuru',
  'Nandi',
  'Narok',
  'Nyamira',
  'Nyandarua',
  'Nyeri',
  'Samburu',
  'Siaya',
  'Taita-Taveta',
  'Tana River',
  'Tharaka-Nithi',
  'Trans Nzoia',
  'Turkana',
  'Uasin Gishu',
  'Vihiga',
  'Wajir',
  'West Pokot',
];

type StyledImageProps = {
  src: string;
  fallbackSrc: string;
  alt: string;
  className: string;
};

function StyledImage({ src, fallbackSrc, alt, className }: StyledImageProps) {
  const [activeSrc, setActiveSrc] = useState(src);

  return (
    <img
      src={activeSrc}
      alt={alt}
      className={className}
      onError={() => {
        if (activeSrc !== fallbackSrc) {
          setActiveSrc(fallbackSrc);
        }
      }}
    />
  );
}

export default function BookAppointmentPage() {
  const [form, setForm] = useState({
    full_name: '',
    phone_number: '',
    email: '',
    county: '',
    procedure_interest: '',
    preferred_date: '',
    preferred_time: '',
    message: '',
  });

  const createMutation = useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      setForm({
        full_name: '',
        phone_number: '',
        email: '',
        county: '',
        procedure_interest: '',
        preferred_date: '',
        preferred_time: '',
        message: '',
      });
    },
  });

  const phoneError =
    form.phone_number.length > 0 && form.phone_number.length !== 10
      ? 'Phone number must be exactly 10 digits.'
      : '';

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (form.phone_number.length !== 10) {
      return;
    }
    createMutation.mutate({
      ...form,
      email: form.email || undefined,
      preferred_date: form.preferred_date || undefined,
      preferred_time: form.preferred_time || undefined,
      procedure_interest: form.procedure_interest || undefined,
      message: form.message || undefined,
    });
  };

  const bookingHighlights = [
    {
      title: 'Specialist review',
      text: 'Every request is reviewed with the clinical context in mind before confirmation.',
      Icon: Shield,
    },
    {
      title: 'Fast response',
      text: 'The team coordinates date, time, and procedure planning as quickly as possible.',
      Icon: Clock3,
    },
    {
      title: 'Direct follow-up',
      text: 'You receive a call or message with your next steps and booking guidance.',
      Icon: PhoneCall,
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
            <h1 className="section-heading">Book Your Appointment Now</h1>
            <p className="mt-4 text-navy/60 max-w-2xl mx-auto">
              Complete this form to request an appointment with Dr Alice. Requests are reviewed and confirmed by the care
              team.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {['Consultation', 'Referral Review', 'Procedure Planning', 'Nationwide Booking'].map((label) => (
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
            {bookingHighlights.map(({ title, text, Icon }, index) => (
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

          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <FadeIn direction="left">
              <form onSubmit={handleSubmit} className="card modern-ir-card !p-6 md:!p-8 space-y-4">
                <h2 className="font-display text-2xl font-semibold text-navy">Appointment Request Form</h2>
                <p className="text-sm leading-relaxed text-navy/60">
                  Share your preferred timing, county, and procedure interest so the team can plan the most suitable appointment pathway for you.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Full Name</label>
                    <input
                      required
                      value={form.full_name}
                      onChange={(event) => setForm((current) => ({ ...current, full_name: event.target.value }))}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Phone Number</label>
                    <input
                      required
                      value={form.phone_number}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          phone_number: event.target.value.replace(/\D/g, '').slice(0, 10),
                        }))
                      }
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
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">County</label>
                    <input
                      required
                      list="kenya-counties"
                      value={form.county}
                      onChange={(event) => setForm((current) => ({ ...current, county: event.target.value }))}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="Search and select county"
                    />
                    <datalist id="kenya-counties">
                      {counties.map((county) => (
                        <option key={county} value={county} />
                      ))}
                    </datalist>
                    <p className="mt-1 text-[11px] text-navy/50">Start typing to search all 47 counties.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Preferred Date (optional)</label>
                    <input
                      type="date"
                      value={form.preferred_date}
                      onChange={(event) => setForm((current) => ({ ...current, preferred_date: event.target.value }))}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Procedure / Condition (optional)</label>
                    <input
                      value={form.procedure_interest}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, procedure_interest: event.target.value }))
                      }
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors"
                      placeholder="e.g. Uterine fibroid embolization, biopsy, DVT, varicose veins"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-navy/60 mb-1.5">Message (optional)</label>
                    <textarea
                      rows={4}
                      value={form.message}
                      onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))}
                      className="w-full rounded-xl border border-sky-light/50 bg-sky-pad/30 px-4 py-3 text-sm text-navy outline-none focus:border-gold focus:ring-1 focus:ring-gold transition-colors resize-none"
                      placeholder="Briefly describe your condition or referral notes"
                    />
                  </div>
                </div>

                {createMutation.isError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                    Unable to submit your appointment right now. Please try again.
                  </div>
                )}

                <button type="submit" disabled={createMutation.isPending || Boolean(phoneError)} className="btn-gold w-full">
                  <Send size={16} />
                  {createMutation.isPending ? 'Submitting Appointment...' : 'Submit Appointment'}
                </button>
              </form>
            </FadeIn>

            <FadeIn direction="right" delay={0.1}>
              <div className="card modern-ir-card !p-6 md:!p-8 h-full">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full border border-gold/35 bg-white/80 p-1.5 shadow-sm">
                      <img src={images.logo} alt="ApexcareIR logo" className="h-11 w-11 rounded-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-burgundy/80 font-semibold">ApexcareIR</p>
                      <p className="text-sm font-semibold text-navy">Book Your Appointment Now</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/70 bg-white/70 p-1.5 backdrop-blur-sm shadow-md">
                    <img
                      src={images.profile}
                      alt="Dr Alice"
                      className="h-12 w-12 rounded-full object-cover object-top"
                    />
                  </div>
                </div>

                <div className="mb-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/70 bg-white/70 p-2 backdrop-blur-sm shadow-sm">
                    <StyledImage
                      src="/ir1.jpeg"
                      fallbackSrc={images.backgroundIr}
                      alt="Interventional radiology visual 1"
                      className="h-24 w-full rounded-xl object-cover"
                    />
                  </div>
                  <div className="rounded-full border border-gold/25 bg-white/70 p-2 backdrop-blur-sm shadow-sm">
                    <StyledImage
                      src="/ir2.jpeg"
                      fallbackSrc={images.backgroundBanner}
                      alt="Interventional radiology visual 2"
                      className="h-24 w-full rounded-full object-cover"
                    />
                  </div>
                  <div className="rounded-full border border-white/70 bg-white/75 p-2 backdrop-blur-sm shadow-sm">
                    <StyledImage
                      src="/ir3.jpeg"
                      fallbackSrc={images.backgroundIr}
                      alt="Interventional radiology visual 3"
                      className="h-24 w-full rounded-full object-cover"
                    />
                  </div>
                  <div className="rounded-2xl border border-gold/25 bg-white/75 p-2 backdrop-blur-sm shadow-sm">
                    <StyledImage
                      src="/ir4.jpeg"
                      fallbackSrc={images.backgroundBanner}
                      alt="Interventional radiology visual 4"
                      className="h-24 w-full rounded-xl object-cover"
                    />
                  </div>
                </div>

                <div className="mb-6 rounded-[1.5rem] border border-gold/20 bg-gradient-to-br from-white to-sky-pad/35 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-burgundy/75 mb-2">Why patients choose this path</p>
                  <div className="space-y-2 text-sm text-navy/65">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                      <span>Structured review before confirming the appointment</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                      <span>Coordination for referrals, consultations, and procedure planning</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-gold" />
                      <span>Clear communication on preparation, date, and next steps</span>
                    </div>
                  </div>
                </div>

                <h3 className="font-display text-xl font-semibold text-navy mb-4">What happens next?</h3>
                <ul className="space-y-3 text-sm text-navy/70">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    Your request is securely saved in our appointment system.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    Admin team reviews and confirms date/time based on availability.
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    You receive a call or message with final booking details.
                  </li>
                </ul>

                <div className="mt-6 rounded-xl border border-gold/25 bg-gold/10 p-4">
                  <p className="text-xs font-semibold text-burgundy uppercase tracking-wide mb-1">Booking Window</p>
                  <p className="text-sm text-navy/75 flex items-center gap-2">
                    <CalendarDays size={16} className="text-gold" />
                    Nationwide patient appointments available across Kenya.
                  </p>
                </div>

                {createMutation.isSuccess && (
                  <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    Appointment request sent successfully. Your booking has been saved and the care team has been notified.
                  </div>
                )}
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
