"use client";

import { useState } from "react";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function ContactPage() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);
  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
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

              <MarketingCard
                className="sm:col-span-2"
                title={lang === "es" ? "Envíanos un mensaje" : "Send us a message"}
                description={
                  lang === "es"
                    ? "Déjanos tu info y te contactamos. Por ahora el envío es placeholder (no guarda datos todavía)."
                    : "Leave your info and we’ll contact you. For now, submission is a placeholder (not stored yet)."
                }
              >
                <form onSubmit={onSubmit} className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-medium text-[var(--mp-muted)]">
                        {lang === "es" ? "Nombre" : "Name"}
                      </span>
                      <input
                        className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-medium text-[var(--mp-muted)]">
                        {lang === "es" ? "Negocio" : "Business"}
                      </span>
                      <input
                        className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={business}
                        onChange={(e) => setBusiness(e.target.value)}
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2">
                      <span className="text-xs font-medium text-[var(--mp-muted)]">
                        {lang === "es" ? "Teléfono (opcional)" : "Phone (optional)"}
                      </span>
                      <input
                        className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </label>

                    <label className="grid gap-2">
                      <span className="text-xs font-medium text-[var(--mp-muted)]">Email</span>
                      <input
                        className="h-11 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="grid gap-2">
                    <span className="text-xs font-medium text-[var(--mp-muted)]">
                      {lang === "es" ? "Mensaje" : "Message"}
                    </span>
                    <textarea
                      className="min-h-[110px] rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--mp-primary)] focus:ring-2 focus:ring-[var(--mp-ring)]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </label>

                  {submitted ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      {lang === "es"
                        ? "Recibido (placeholder). Próximo paso: conectar esto a email o Supabase."
                        : "Received (placeholder). Next: connect this to email or Supabase."}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="submit"
                      className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-5 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                    >
                      {lang === "es" ? "Enviar" : "Send"}
                    </button>
                    <a
                      className="text-sm font-medium text-[var(--mp-muted)] hover:text-[var(--mp-fg)]"
                      href="/login"
                    >
                      {lang === "es" ? "O empieza la prueba gratis →" : "Or start the free trial →"}
                    </a>
                  </div>
                </form>
              </MarketingCard>

              <MarketingCard title={t.contact.cards.emailTitle} description={t.contact.cards.emailBody} />
            </div>
          </MarketingSection>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
