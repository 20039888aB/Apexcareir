import type { LucideIcon } from 'lucide-react';
import { Activity, CheckCircle2, Heart, ScanLine, Syringe, Wind } from 'lucide-react';

const serviceIconMap: Record<string, LucideIcon> = {
  'ultrasound-guided-biopsy': ScanLine,
  'liver-biopsy': Activity,
  'breast-biopsy': Heart,
  'thyroid-biopsy': CheckCircle2,
  'lung-biopsy': Wind,
  'lymph-node-biopsy': Syringe,
};

export function getServiceIcon(slug: string): LucideIcon {
  return serviceIconMap[slug] ?? ScanLine;
}
