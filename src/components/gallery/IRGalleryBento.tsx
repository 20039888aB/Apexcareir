import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, ScanLine, Sparkles } from 'lucide-react';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { galleryImages } from '../../data/galleryImages';
import TiltCard from './TiltCard';

type BentoTileConfig = {
  imageIndex: number;
  layout: string;
  delay?: number;
  featured?: boolean;
};

const bentoLayout: BentoTileConfig[] = [
  { imageIndex: 0, layout: 'col-span-2 row-span-2 md:col-span-4 md:row-span-3 lg:col-span-5 lg:row-span-3', featured: true, delay: 0 },
  { imageIndex: 1, layout: 'col-span-2 row-span-1 md:col-span-2 md:row-span-2 lg:col-span-3 lg:row-span-2', delay: 0.05 },
  { imageIndex: 2, layout: 'col-span-1 row-span-1 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1', delay: 0.1 },
  { imageIndex: 3, layout: 'col-span-1 row-span-1 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1', delay: 0.12 },
  { imageIndex: 4, layout: 'col-span-2 row-span-1 md:col-span-3 md:row-span-2 lg:col-span-4 lg:row-span-2', delay: 0.15 },
  { imageIndex: 5, layout: 'col-span-1 row-span-1 md:col-span-1 md:row-span-1 lg:col-span-2 lg:row-span-1', delay: 0.18 },
  { imageIndex: 6, layout: 'col-span-1 row-span-1 md:col-span-2 md:row-span-1 lg:col-span-2 lg:row-span-1', delay: 0.2 },
  { imageIndex: 7, layout: 'col-span-2 row-span-2 md:col-span-3 md:row-span-2 lg:col-span-3 lg:row-span-2', featured: true, delay: 0.22 },
];

function BentoImageTile({
  image,
  layout,
  delay = 0,
  featured = false,
}: {
  image: (typeof galleryImages)[number];
  layout: string;
  delay?: number;
  featured?: boolean;
}) {
  return (
    <motion.article
      className={`${layout} min-h-[150px] md:min-h-[170px]`}
      initial={{ opacity: 0, y: 36, scale: 0.96 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard className="h-full" maxTilt={featured ? 16 : 12} scale={featured ? 1.03 : 1.02}>
        <div className="relative h-full overflow-hidden rounded-[1.35rem] border border-white/50 bg-white/40 shadow-[0_18px_45px_rgba(16,35,29,0.14)] backdrop-blur-sm">
          <div className="absolute inset-0 z-0 bg-gradient-to-br from-forest/10 via-transparent to-gold/15" />
          <img
            src={image.src}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-forest/85 via-forest/25 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5" style={{ transform: 'translateZ(28px)' }}>
            <motion.p
              className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-light"
              initial={{ opacity: 0, x: -12 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: delay + 0.15, duration: 0.45 }}
            >
              <ScanLine size={11} />
              IR Gallery
            </motion.p>
            <h3 className={`font-display font-semibold text-white ${featured ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
              {image.title}
            </h3>
            <p className={`mt-1 text-white/75 ${featured ? 'text-sm' : 'text-xs sm:text-sm'}`}>{image.subtitle}</p>
          </div>
          <div className="pointer-events-none absolute inset-0 z-[15] rounded-[inherit] ring-1 ring-inset ring-white/20" />
        </div>
      </TiltCard>
    </motion.article>
  );
}

export default function IRGalleryBento() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const headerY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const glowX = useTransform(scrollYProgress, [0, 1], ['20%', '80%']);

  return (
    <section ref={sectionRef} className="relative overflow-hidden bg-gradient-to-b from-cream via-white to-sky-pad/35 py-14 sm:py-20 md:py-28">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 h-72 w-72 rounded-full bg-gold/20 blur-3xl"
        style={{ left: glowX }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-forest/10 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.45, 0.7, 0.45] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div style={{ y: headerY }} className="mb-10 text-center md:mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/25 bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-burgundy/80"
          >
            <Sparkles size={14} className="text-gold" />
            Visual IR Experience
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="section-heading"
          >
            Inside Interventional Radiology
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base"
          >
            Explore our image-guided care environment through an interactive bento gallery. Move your cursor across each
            tile to feel the depth — every frame reflects precision, technology, and patient-centred IR practice.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-2 auto-rows-[150px] gap-3 sm:auto-rows-[165px] sm:gap-4 md:grid-cols-6 md:auto-rows-[175px] lg:grid-cols-8 lg:auto-rows-[185px] lg:gap-5">
          {bentoLayout.map(({ imageIndex, layout, delay, featured }) => (
            <BentoImageTile
              key={galleryImages[imageIndex].id}
              image={galleryImages[imageIndex]}
              layout={layout}
              delay={delay}
              featured={featured}
            />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3 sm:mt-12"
        >
          <Link to="/services" className="btn-primary">
            Explore IR Services <ArrowRight size={16} />
          </Link>
          <Link to="/book-appointment" className="btn-outline">
            Book Appointment
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
