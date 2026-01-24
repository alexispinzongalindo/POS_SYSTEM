"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function OnboardingPage() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <div className="islapos-marketing min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <MarketingSection title={t.onboarding.title} subtitle={t.onboarding.subtitle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MarketingCard title={t.onboarding.cards.guidedTitle} description={t.onboarding.cards.guidedBody}>
                <a className="inline-flex text-sm font-medium text-zinc-900 hover:text-[var(--mp-primary)] dark:text-zinc-50" href="/setup">
                  {t.onboarding.cards.openSetup}
                </a>
              </MarketingCard>

              <MarketingCard title={t.onboarding.cards.staffTitle} description={t.onboarding.cards.staffBody} />
              <MarketingCard title={t.onboarding.cards.supportTitle} description={t.onboarding.cards.supportBody} />

              <MarketingCard title={t.onboarding.cards.startTitle} description={t.onboarding.cards.startBody}>
                <a
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/login"
                >
                  {t.onboarding.cards.startTrial}
                </a>
              </MarketingCard>
            </div>
          </MarketingSection>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
