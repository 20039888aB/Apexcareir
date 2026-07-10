import { motion } from 'framer-motion';
import { Activity, ScanLine, ShieldPlus, Syringe, Waves } from 'lucide-react';

type FloatingIRMotifsProps = {
  variant?: 'hero' | 'subtle';
};

const motifs = [
  { Icon: ScanLine, left: '12%', top: '18%', delay: 0.2, duration: 6.2 },
  { Icon: Syringe, left: '84%', top: '24%', delay: 0.8, duration: 7.1 },
  { Icon: Activity, left: '74%', top: '70%', delay: 1.1, duration: 6.8 },
  { Icon: ShieldPlus, left: '18%', top: '72%', delay: 1.7, duration: 7.4 },
  { Icon: Waves, left: '46%', top: '12%', delay: 2.1, duration: 6.5 },
];

export default function FloatingIRMotifs({ variant = 'hero' }: FloatingIRMotifsProps) {
  const opacity = variant === 'hero' ? 'text-burgundy/30' : 'text-burgundy/20';
  const chipBg = variant === 'hero' ? 'bg-white/35 border-white/45' : 'bg-white/25 border-white/35';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {motifs.map(({ Icon, left, top, delay, duration }, index) => (
        <motion.div
          key={index}
          className={`absolute flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm backdrop-blur-md ${chipBg} ${opacity}`}
          style={{ left, top }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{
            opacity: [0.35, 0.85, 0.35],
            y: [0, -9, 0, 7, 0],
            rotate: [0, 6, -6, 0],
            scale: [1, 1.04, 1],
          }}
          transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        >
          <Icon size={18} strokeWidth={1.8} />
        </motion.div>
      ))}
    </div>
  );
}
