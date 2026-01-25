"use client";

import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";
import MarketingLogo from "@/components/MarketingLogo";

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
      <a href="/" className="inline-flex items-center gap-3 text-sm font-semibold tracking-tight">
        <MarketingLogo className="shrink-0" size={56} variant="lockup" />
        <span className="sr-only">{t.brand}</span>
      </a>
      <nav className="flex items-center gap-4 text-sm">
        <a className="text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/features">
          {t.nav.features}
        </a>
        <a className="text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/pricing">
          {t.nav.pricing}
        </a>
        <a className="text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/onboarding">
          {t.nav.training}
        </a>
        <a className="text-[var(--mp-muted)] hover:text-[var(--mp-fg)]" href="/contact">
          {t.nav.contact}
        </a>

        <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] p-1">
          <button
            type="button"
            onClick={() => setLang("es")}
            className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
              lang === "es"
                ? "bg-[var(--mp-primary)] text-[var(--mp-primary-contrast)]"
                : "text-[var(--mp-muted)] hover:bg-white/60"
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
                : "text-[var(--mp-muted)] hover:bg-white/60"
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
