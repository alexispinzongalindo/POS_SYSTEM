"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function ContactPage() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <div className="islapos-marketing min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <MarketingSection title={t.contact.title} subtitle={t.contact.body}>
            <div className="grid gap-4 sm:grid-cols-2">
              <MarketingCard title={t.contact.cards.hoursTitle} description={t.contact.cards.hoursBody} />

              <MarketingCard title={t.contact.cards.onboardingTitle} description={t.contact.cards.onboardingBody}>
                <a
                  className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-4 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/login"
                >
                  {t.contact.cards.startTrial}
                </a>
              </MarketingCard>

              <MarketingCard title={t.contact.cards.emailTitle} description={t.contact.cards.emailBody} />
              <MarketingCard title={t.contact.cards.whatsappTitle} description={t.contact.cards.whatsappBody} />
            </div>
          </MarketingSection>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
