import whatsapp1 from '../images/WhatsApp Image 2026-07-14 at 8.48.14 PM.jpeg';
import whatsapp2 from '../images/WhatsApp Image 2026-07-14 at 8.48.14 PM (1).jpeg';
import whatsapp3 from '../images/WhatsApp Image 2026-07-14 at 8.48.15 PM.jpeg';
import whatsapp4 from '../images/WhatsApp Image 2026-07-14 at 8.48.15 PM (1).jpeg';
import whatsapp5 from '../images/WhatsApp Image 2026-07-14 at 8.48.15 PM (2).jpeg';
import whatsapp6 from '../images/WhatsApp Image 2026-07-14 at 8.48.16 PM.jpeg';
import whatsapp7 from '../images/WhatsApp Image 2026-07-14 at 8.48.16 PM (1).jpeg';
import interventionalRadiology from '../images/interventional radiology.jpg';

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
  title: string;
  subtitle: string;
};

export const galleryImages: GalleryImage[] = [
  {
    id: 'ir-suite-1',
    src: whatsapp1,
    alt: 'Interventional radiology procedure suite',
    title: 'Precision Suite',
    subtitle: 'Real-time image guidance for every intervention',
  },
  {
    id: 'ir-suite-2',
    src: whatsapp2,
    alt: 'Advanced IR imaging workflow',
    title: 'Advanced Imaging',
    subtitle: 'High-resolution planning before every procedure',
  },
  {
    id: 'ir-care-1',
    src: whatsapp3,
    alt: 'Patient-centred interventional radiology care',
    title: 'Patient-Centred Care',
    subtitle: 'Minimally invasive pathways with faster recovery',
  },
  {
    id: 'ir-care-2',
    src: whatsapp4,
    alt: 'Specialist interventional radiology team environment',
    title: 'Specialist Environment',
    subtitle: 'Structured workflows for safe IR delivery',
  },
  {
    id: 'ir-tech-1',
    src: whatsapp5,
    alt: 'Interventional radiology technology and equipment',
    title: 'Modern IR Technology',
    subtitle: 'State-of-the-art tools for accurate treatment',
  },
  {
    id: 'ir-tech-2',
    src: whatsapp6,
    alt: 'Image-guided vascular and oncology interventions',
    title: 'Image-Guided Therapy',
    subtitle: 'Vascular, oncology, and biopsy expertise',
  },
  {
    id: 'ir-tech-3',
    src: whatsapp7,
    alt: 'Interventional radiology clinical excellence',
    title: 'Clinical Excellence',
    subtitle: 'Fellowship-trained interventional radiology care',
  },
  {
    id: 'ir-feature',
    src: interventionalRadiology,
    alt: 'Interventional radiology specialist care in Kenya',
    title: 'IR Across Kenya',
    subtitle: 'Nationwide referrals and specialist consultations',
  },
];
