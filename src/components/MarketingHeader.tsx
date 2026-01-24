"use client";

import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

type MarketingHeaderProps = {
  ctaVariant?: "trial" | "signin";
  ctaHref?: string;
};

export default function MarketingHeader({ ctaVariant = "trial", ctaHref }: MarketingHeaderProps) {
  const { lang, setLang } = useMarketingLang();
  const t = marketingCopy(lang);
  const resolvedCtaHref = ctaHref ?? (ctaVariant === "signin" ? "/login" : "/login");
  const resolvedCtaLabel = ctaVariant === "signin" ? t.nav.signIn : t.nav.startTrial;

  return (
    <header className="flex items-center justify-between gap-4">
      <a href="/" className="text-sm font-semibold tracking-tight">
        {t.brand}
      </a>
      <nav className="flex items-center gap-4 text-sm">
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/features">
          {t.nav.features}
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/pricing">
          {t.nav.pricing}
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/onboarding">
          {t.nav.training}
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/contact">
          {t.nav.contact}
        </a>

        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-black">
          <button
            type="button"
            onClick={() => setLang("es")}
            className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
              lang === "es"
                ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
            aria-label="Español (Puerto Rico)"
          >
            🇵🇷
          </button>
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
              lang === "en"
                ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                : "text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
            }`}
            aria-label="English (United States)"
          >
            🇺🇸
          </button>
        </div>

        <a
          className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-3 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
          href={resolvedCtaHref}
        >
          {resolvedCtaLabel}
        </a>
      </nav>
    </header>
  );
}
