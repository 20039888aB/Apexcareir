import { motion } from 'framer-motion';
import { images } from '../assets/images';

type ProfileImageProps = {
  size?: 'md' | 'lg' | 'xl';
  className?: string;
  animate?: boolean;
};

const sizes = {
  md: { outer: 'h-28 w-28', inner: 'h-24 w-24' },
  lg: { outer: 'h-40 w-40', inner: 'h-36 w-36' },
  xl: { outer: 'h-52 w-52', inner: 'h-48 w-48' },
};

export default function ProfileImage({ size = 'lg', className = '', animate = true }: ProfileImageProps) {
  const s = sizes[size];
  const Wrapper = animate ? motion.div : 'div';
  const wrapperProps = animate
    ? {
        whileHover: { scale: 1.04 },
        transition: { duration: 0.4 },
      }
    : {};

  return (
    <Wrapper
      className={`${s.outer} rounded-full bg-gradient-to-br from-forest via-gold to-burgundy p-[4px] shadow-xl ${className}`}
      {...wrapperProps}
    >
      <div className={`${s.inner} rounded-full overflow-hidden bg-white p-1`}>
        <motion.img
          src={images.profile}
          alt="Dr Alice Adhiambo"
          className="h-full w-full rounded-full object-cover object-top"
          animate={animate ? { scale: [1, 1.06, 1] } : undefined}
          transition={animate ? { duration: 8, repeat: Infinity, ease: 'easeInOut' } : undefined}
        />
      </div>
    </Wrapper>
  );
}
