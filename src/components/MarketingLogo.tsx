import type { CSSProperties } from "react";

type MarketingLogoProps = {
  className?: string;
  size?: number;
  variant?: "mark" | "lockup";
};

export default function MarketingLogo({ className, size = 28, variant = "mark" }: MarketingLogoProps) {
  const style = {
    width: size,
    height: size,
  } satisfies CSSProperties;

  const mark = (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="islapos-core" x1="14" y1="12" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E11D48" />
          <stop offset="0.5" stopColor="#6D28D9" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
        <filter id="islapos-shadow" x="-50%" y="-50%" width="200%" height="200%" colorInterpolationFilters="sRGB">
          <feOffset dy="1" />
          <feGaussianBlur stdDeviation="1.2" result="shadow" />
          <feColorMatrix
            in="shadow"
            type="matrix"
            values="0 0 0 0 0.02  0 0 0 0 0.08  0 0 0 0 0.12  0 0 0 0.25 0"
          />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#islapos-shadow)">
        <circle cx="24" cy="24" r="9" fill="url(#islapos-core)" />
        <circle cx="24" cy="24" r="14" stroke="url(#islapos-core)" strokeWidth="4" />
        <path d="M8 18H20" stroke="url(#islapos-core)" strokeWidth="4" strokeLinecap="round" />
        <path d="M8 30H20" stroke="url(#islapos-core)" strokeWidth="4" strokeLinecap="round" />
        <path d="M28 24H40" stroke="url(#islapos-core)" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );

  if (variant === "lockup") {
    return (
      <span className="inline-flex items-center gap-1.5">
        {mark}
        <span className="text-lg font-semibold tracking-tight leading-none">
          <span style={{ color: "#1D4ED8" }}>Isla</span>
          <span style={{ color: "#E11D48" }}>POS</span>
        </span>
      </span>
    );
  }

  return mark;
}
