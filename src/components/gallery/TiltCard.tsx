import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useCallback, useRef, type ReactNode } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

type TiltCardProps = {
  children: ReactNode;
  className?: string;
  maxTilt?: number;
  scale?: number;
  disabled?: boolean;
};

export default function TiltCard({
  children,
  className = '',
  maxTilt = 14,
  scale = 1.02,
  disabled = false,
}: TiltCardProps) {
  const canHoverTilt = useMediaQuery('(hover: hover) and (pointer: fine)');
  const tiltDisabled = disabled || !canHoverTilt;
  const ref = useRef<HTMLDivElement>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const isActive = useMotionValue(0);

  const rotateX = useSpring(useTransform(pointerY, [-0.5, 0.5], [maxTilt, -maxTilt]), {
    stiffness: 260,
    damping: 22,
    mass: 0.6,
  });
  const rotateY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-maxTilt, maxTilt]), {
    stiffness: 260,
    damping: 22,
    mass: 0.6,
  });
  const lift = useSpring(useTransform(isActive, [0, 1], [1, scale]), {
    stiffness: 260,
    damping: 20,
  });

  const glareX = useTransform(pointerX, [-0.5, 0.5], [0, 100]);
  const glareY = useTransform(pointerY, [-0.5, 0.5], [0, 100]);
  const glareOpacity = useTransform(isActive, [0, 1], [0, 0.55]);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.45), transparent 58%)`;

  const updatePointer = useCallback(
    (clientX: number, clientY: number) => {
      const element = ref.current;
      if (!element || tiltDisabled) return;
      const rect = element.getBoundingClientRect();
      const x = (clientX - rect.left) / rect.width - 0.5;
      const y = (clientY - rect.top) / rect.height - 0.5;
      pointerX.set(x);
      pointerY.set(y);
      isActive.set(1);
    },
    [tiltDisabled, isActive, pointerX, pointerY],
  );

  const resetPointer = useCallback(() => {
    pointerX.set(0);
    pointerY.set(0);
    isActive.set(0);
  }, [isActive, pointerX, pointerY]);

  return (
    <div className={`tilt-card-scene h-full w-full ${className}`} style={{ perspective: 1100 }}>
      <motion.div
        ref={ref}
        className="tilt-card-body group relative h-full w-full"
        style={{
          rotateX: tiltDisabled ? 0 : rotateX,
          rotateY: tiltDisabled ? 0 : rotateY,
          scale: tiltDisabled ? 1 : lift,
          transformStyle: 'preserve-3d',
        }}
        onPointerMove={(event) => updatePointer(event.clientX, event.clientY)}
        onPointerEnter={(event) => updatePointer(event.clientX, event.clientY)}
        onPointerLeave={resetPointer}
      >
        {children}
        {!tiltDisabled ? (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
            style={{ background: glareBackground, opacity: glareOpacity }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
