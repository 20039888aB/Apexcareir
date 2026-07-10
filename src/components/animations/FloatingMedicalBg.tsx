import { motion } from 'framer-motion';

function createParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: Math.random() * 5 + 2,
    duration: Math.random() * 4 + 5,
    delay: Math.random() * 3,
  }));
}

export default function FloatingMedicalBg({ variant = 'hero' }: { variant?: 'hero' | 'subtle' }) {
  const particles = variant === 'hero' ? createParticles(10) : createParticles(8);
  const gridOpacity = variant === 'hero' ? 'opacity-[0.025]' : 'opacity-[0.03]';
  const particleClass = variant === 'hero' ? 'bg-gold/20' : 'bg-gold/25';

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Gradient orbs */}
      <motion.div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-forest/15 blur-3xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-burgundy/10 blur-3xl"
        animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Floating particles */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${particleClass}`}
          style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
          animate={{ y: [0, -18, 0], opacity: [0.18, 0.45, 0.18] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Grid pattern */}
      <div
        className={`absolute inset-0 ${gridOpacity}`}
        style={{
          backgroundImage: 'radial-gradient(circle, #0A1628 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />
    </div>
  );
}
