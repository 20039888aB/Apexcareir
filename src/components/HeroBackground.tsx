import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { images } from '../assets/images';

export default function HeroBackground() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [failedSlides, setFailedSlides] = useState<string[]>([]);

  const primarySlides = useMemo(
    () => ['/IR 1.png', '/IR 2.png', '/IR 3.png', '/IR 4.png'],
    [],
  );

  const fallbackSlides = useMemo(
    () => [images.backgroundIr, images.backgroundBanner, images.profile, images.logo],
    [],
  );

  const slides = useMemo(() => {
    const availablePrimary = primarySlides.filter((src) => !failedSlides.includes(src));
    const merged = [...availablePrimary, ...fallbackSlides];
    return Array.from(new Set(merged)).slice(0, 4);
  }, [fallbackSlides, failedSlides, primarySlides]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slides.length);
    }, 5500);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  const activeSlide = slides[activeIndex % Math.max(slides.length, 1)];

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden>
      <AnimatePresence mode="wait">
        <motion.img
          key={activeSlide}
          src={activeSlide}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1.01 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 1.1, ease: 'easeInOut' }}
          onError={() => {
            if (!activeSlide.startsWith('/ir')) return;
            setFailedSlides((prev) => (prev.includes(activeSlide) ? prev : [...prev, activeSlide]));
          }}
        />
      </AnimatePresence>

      {/* Tone overlays for legibility and glass effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#020712]/48 via-[#04152a]/30 to-[#102544]/42" />
      <div className="absolute inset-0 bg-gradient-to-r from-forest/12 via-transparent to-burgundy/12" />
      <div className="absolute inset-0 backdrop-blur-[0.6px]" />

      {/* Glass layers */}
      <motion.div
        className="absolute left-[4%] top-[10%] h-52 w-52 rounded-full border border-white/35 bg-white/15 backdrop-blur-3xl hidden lg:block"
        animate={{ y: [0, -12, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute right-[8%] bottom-[16%] h-60 w-60 rounded-[2rem] border border-gold/30 bg-white/10 backdrop-blur-3xl hidden lg:block"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />
      <div className="absolute left-1/2 top-1/2 h-[74%] w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[3rem] border border-white/35 bg-white/10 backdrop-blur-xl shadow-glass" />
    </div>
  );
}
