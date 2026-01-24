import type { ReactNode } from "react";

type MarketingSectionProps = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export default function MarketingSection({
  eyebrow,
  title,
  subtitle,
  children,
  className,
}: MarketingSectionProps) {
  return (
    <section className={className ?? ""}>
      {eyebrow ? (
        <div className="text-xs font-semibold tracking-wide text-[var(--mp-primary)]">{eyebrow}</div>
      ) : null}
      {title ? (
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      ) : null}
      {subtitle ? (
        <p className="mt-3 max-w-2xl text-sm text-[var(--mp-muted)]">{subtitle}</p>
      ) : null}
      {children ? <div className={title || subtitle || eyebrow ? "mt-8" : ""}>{children}</div> : null}
    </section>
  );
}
