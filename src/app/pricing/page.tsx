"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function PricingPage() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <MarketingSection title={t.pricing.title} subtitle={t.pricing.subtitle}>
            <div className="grid gap-4 lg:grid-cols-3">
              <MarketingCard title={t.pricing.plans.trial} description={t.pricing.plans.trialBody}>
                <div className="mt-2 text-3xl font-semibold">$0</div>
                <ul className="mt-6 grid gap-2 text-sm text-[var(--mp-muted)]">
                  <li>Core POS</li>
                  <li>Setup wizard</li>
                  <li>Basic support</li>
                </ul>
                <a
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/login"
                >
                  {t.pricing.plans.startFree}
                </a>
              </MarketingCard>

              <MarketingCard title={t.pricing.plans.starter} description={t.pricing.plans.perMonth} className="border-[var(--mp-fg)]">
                <div className="mt-2 text-3xl font-semibold">$49</div>
                <ul className="mt-6 grid gap-2 text-sm text-[var(--mp-muted)]">
                  <li>POS + receipts</li>
                  <li>Menu & barcode/SKU</li>
                  <li>Sales summary</li>
                  <li>Training library</li>
                </ul>
                <a
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/login"
                >
                  {t.pricing.plans.startFree}
                </a>
              </MarketingCard>

              <MarketingCard title={t.pricing.plans.pro} description={t.pricing.plans.perMonth}>
                <div className="mt-2 text-3xl font-semibold">$99</div>
                <ul className="mt-6 grid gap-2 text-sm text-[var(--mp-muted)]">
                  <li>Everything in Starter</li>
                  <li>Priority support</li>
                  <li>Guided onboarding session</li>
                </ul>
                <a
                  className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-4 text-sm font-medium text-[var(--mp-fg)] hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/onboarding"
                >
                  {t.pricing.plans.seeTraining}
                </a>
              </MarketingCard>
            </div>

            <div className="mt-10 rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 text-sm text-[var(--mp-muted)] shadow-sm">
              {t.pricing.note}
            </div>
          </MarketingSection>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
