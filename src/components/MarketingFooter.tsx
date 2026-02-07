"use client";

import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";
import MarketingLogo from "@/components/MarketingLogo";
import MarketingSupportAssistant from "@/components/MarketingSupportAssistant";

type MarketingFooterProps = {
  showCta?: boolean;
};

export default function MarketingFooter({ showCta = true }: MarketingFooterProps) {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <footer className="mt-16 border-t border-[var(--mp-border)] pt-10">
      {showCta ? (
        <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-sm font-semibold">{t.tagline}</div>
              <p className="mt-2 text-sm text-[var(--mp-muted)]">
                {lang === "es"
                  ? "Empieza la prueba gratis y te ayudamos con IVU, menú y entrenamiento."
                  : "Start the free trial and we’ll help with IVU, menu setup, and staff training."}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:justify-end">
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-5 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                href="/login"
              >
                {t.nav.startTrial}
              </a>
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-5 text-sm font-medium text-[var(--mp-fg)] hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                href="/contact"
              >
                {t.nav.contact}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <MarketingSupportAssistant />

      <div className="mt-10 flex flex-col gap-3 text-xs text-[var(--mp-muted)] sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-3">
          <MarketingLogo className="shrink-0" size={38} variant="lockup" />
          <div>© {new Date().getFullYear()}</div>
        </div>
        <div className="flex gap-4">
          <a className="hover:text-[var(--mp-fg)]" href="/pricing">
            {t.home.footer.pricing}
          </a>
          <a className="hover:text-[var(--mp-fg)]" href="/onboarding">
            {t.home.footer.training}
          </a>
          <a className="hover:text-[var(--mp-fg)]" href="/contact">
            {t.home.footer.contact}
          </a>
          <a className="hover:text-[var(--mp-fg)]" href="/login">
            {t.home.footer.signIn}
          </a>
        </div>
      </div>
    </footer>
  );
}
