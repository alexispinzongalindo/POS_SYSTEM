import type { ReactNode } from "react";

type MarketingCardProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
};

export default function MarketingCard({ title, description, children, className }: MarketingCardProps) {
  return (
    <div
      className={`rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm ${
        className ?? ""
      }`}
    >
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {description ? <p className="mt-2 text-sm text-[var(--mp-muted)]">{description}</p> : null}
      {children ? <div className={title || description ? "mt-5" : ""}>{children}</div> : null}
    </div>
  );
}
