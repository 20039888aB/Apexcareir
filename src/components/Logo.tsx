import { images } from '../assets/images';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  showRing?: boolean;
};

const sizes = {
  sm: { outer: 'h-11 w-11', inner: 'h-9 w-9', pad: 'p-1' },
  md: { outer: 'h-14 w-14', inner: 'h-12 w-12', pad: 'p-1.5' },
  lg: { outer: 'h-24 w-24', inner: 'h-20 w-20', pad: 'p-2' },
};

export default function Logo({ size = 'md', showRing = true }: LogoProps) {
  const s = sizes[size];

  return (
    <div
      className={`${s.outer} ${showRing ? 'rounded-full bg-gradient-to-br from-gold via-gold-light to-gold p-[3px] shadow-md' : ''} shrink-0`}
    >
      <div className={`${s.inner} ${s.pad} rounded-full bg-white overflow-hidden flex items-center justify-center`}>
        <img
          src={images.logo}
          alt="Apexcareir logo"
          className="h-full w-full object-contain"
        />
      </div>
    </div>
  );
}
