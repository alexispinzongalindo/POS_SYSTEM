"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function FeaturesPage() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <div className="islapos-marketing min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <MarketingSection title={t.features.title} subtitle={t.features.subtitle}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MarketingCard title={t.features.cards.posTitle} description={t.features.cards.posBody}>
                <a className="inline-flex text-sm font-medium text-zinc-900 hover:text-[var(--mp-primary)] dark:text-zinc-50" href="/pos">
                  {t.features.cards.openPos}
                </a>
              </MarketingCard>

              <MarketingCard title={t.features.cards.adminTitle} description={t.features.cards.adminBody}>
                <a className="inline-flex text-sm font-medium text-zinc-900 hover:text-[var(--mp-primary)] dark:text-zinc-50" href="/admin">
                  {t.features.cards.openAdmin}
                </a>
              </MarketingCard>

              <MarketingCard title={t.features.cards.setupTitle} description={t.features.cards.setupBody}>
                <a className="inline-flex text-sm font-medium text-zinc-900 hover:text-[var(--mp-primary)] dark:text-zinc-50" href="/setup">
                  {t.features.cards.startSetup}
                </a>
              </MarketingCard>

              <MarketingCard title={t.features.cards.onboardingTitle} description={t.features.cards.onboardingBody}>
                <a
                  className="inline-flex text-sm font-medium text-zinc-900 hover:text-[var(--mp-primary)] dark:text-zinc-50"
                  href="/onboarding"
                >
                  {t.features.cards.seeTraining}
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
