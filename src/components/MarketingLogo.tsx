import type { CSSProperties } from "react";

type MarketingLogoProps = {
  className?: string;
  size?: number;
};

export default function MarketingLogo({ className, size = 28 }: MarketingLogoProps) {
  const style = {
    width: size,
    height: size,
  } satisfies CSSProperties;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="islapos-sun" x1="9" y1="11" x2="33" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFD24A" />
          <stop offset="1" stopColor="#FF5A7A" />
        </linearGradient>
        <linearGradient id="islapos-ocean" x1="8" y1="36" x2="40" y2="20" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00B3A4" />
          <stop offset="1" stopColor="#28E1D0" />
        </linearGradient>
        <filter id="islapos-glow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="6" y="6" width="36" height="36" rx="12" fill="white" fillOpacity="0.72" />
      <rect x="6" y="6" width="36" height="36" rx="12" stroke="rgba(6,24,38,0.18)" />

      <path
        d="M16 20.5C16 16.3579 19.3579 13 23.5 13C27.6421 13 31 16.3579 31 20.5C31 24.6421 27.6421 28 23.5 28C19.3579 28 16 24.6421 16 20.5Z"
        fill="url(#islapos-sun)"
        filter="url(#islapos-glow)"
      />

      <path
        d="M12.5 31.8C15.6 29.6 19.2 28.5 23.3 28.5C27.5 28.5 31.2 29.7 34.4 32.1C35.6 33 35.2 34.9 33.8 35.2C31.1 35.9 27.7 36.3 23.6 36.3C19.6 36.3 16.2 35.9 13.4 35.2C12 34.9 11.4 32.7 12.5 31.8Z"
        fill="url(#islapos-ocean)"
      />

      <path
        d="M19 22.2C20.4 23.4 21.9 24 23.5 24C25.1 24 26.6 23.4 28 22.2"
        stroke="rgba(6,24,38,0.55)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
