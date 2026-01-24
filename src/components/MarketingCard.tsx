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
      className={`rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 ${
        className ?? ""
      }`}
    >
      {title ? <div className="text-sm font-semibold">{title}</div> : null}
      {description ? <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      {children ? <div className={title || description ? "mt-5" : ""}>{children}</div> : null}
    </div>
  );
}
