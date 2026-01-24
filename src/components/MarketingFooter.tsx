"use client";

import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

type MarketingFooterProps = {
  showCta?: boolean;
};

export default function MarketingFooter({ showCta = true }: MarketingFooterProps) {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <footer className="mt-16 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      {showCta ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-sm font-semibold">{t.tagline}</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
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
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)] dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/contact"
              >
                {t.nav.contact}
              </a>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex flex-col gap-3 text-xs text-zinc-600 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
        <div>© {new Date().getFullYear()} IslaPOS</div>
        <div className="flex gap-4">
          <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/pricing">
            {t.home.footer.pricing}
          </a>
          <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/onboarding">
            {t.home.footer.training}
          </a>
          <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/contact">
            {t.home.footer.contact}
          </a>
          <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/login">
            {t.home.footer.signIn}
          </a>
        </div>
      </div>
    </footer>
  );
}
