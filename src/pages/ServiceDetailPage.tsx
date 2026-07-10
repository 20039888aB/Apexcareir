import { useParams, Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, Syringe, Activity, CheckCircle2, Phone } from 'lucide-react';
import FadeIn from '../components/animations/FadeIn';
import { doctor, services } from '../data/content';

export default function ServiceDetailPage() {
  const { slug } = useParams();
  const service = services.find((s) => s.slug === slug);

  if (!service) return <Navigate to="/services" replace />;

  return (
    <>
      <section className="bg-hero-gradient py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <Link to="/services" className="inline-flex items-center gap-1 text-sm text-navy/60 hover:text-gold transition-colors mb-6">
              <ArrowLeft size={14} /> Back to Services
            </Link>
            <h1 className="section-heading">{service.title}</h1>
            <p className="mt-4 text-navy/60 max-w-2xl text-lg">{service.description}</p>
          </FadeIn>
        </div>
      </section>

      <section className="section-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-10">
            <div className="lg:col-span-2 space-y-8">
              <FadeIn>
                <h2 className="font-display text-2xl font-semibold text-navy mb-4">Clinical Indications</h2>
                <ul className="space-y-3">
                  {service.indications.map((ind) => (
                    <li key={ind} className="flex items-start gap-3 text-navy/70">
                      <CheckCircle2 size={18} className="text-gold shrink-0 mt-0.5" />
                      {ind}
                    </li>
                  ))}
                </ul>
              </FadeIn>

              <FadeIn delay={0.1}>
                <h2 className="font-display text-2xl font-semibold text-navy mb-4">About This Procedure</h2>
                <p className="text-navy/70 leading-relaxed">
                  {service.title} performed by {doctor.name} at {doctor.clinic}, {doctor.location}.
                  This minimally invasive procedure uses real-time imaging guidance to obtain tissue samples
                  for accurate pathological diagnosis.
                </p>
              </FadeIn>
            </div>

            <FadeIn delay={0.15}>
              <div className="card !p-6 sticky top-28 space-y-5">
                <h3 className="font-semibold text-navy">Procedure Details</h3>
                {[
                  { icon: Clock, label: 'Duration', value: service.duration },
                  { icon: Syringe, label: 'Anaesthesia', value: service.anaesthesia },
                  { icon: Activity, label: 'Monitoring', value: service.monitoring },
                  { icon: CheckCircle2, label: 'Discharge', value: service.discharge },
                ].map((d) => (
                  <div key={d.label} className="flex items-start gap-3">
                    <d.icon size={16} className="text-gold mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-navy/50">{d.label}</p>
                      <p className="text-sm font-medium text-navy">{d.value}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-4 border-t border-sky-pad space-y-3">
                  <a href={`tel:${doctor.phonesRaw[0]}`} className="btn-gold w-full text-sm">
                    <Phone size={14} /> Book Consultation
                  </a>
                  <a
                    href={`https://wa.me/${doctor.whatsapp}?text=Hello%20Dr%20Alice%2C%20I%20would%20like%20to%20inquire%20about%20${encodeURIComponent(service.title)}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline w-full text-sm"
                  >
                    Request Quotation
                  </a>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>
    </>
  );
}
