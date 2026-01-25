"use client";

import MarketingHeader from "@/components/MarketingHeader";
import MarketingCard from "@/components/MarketingCard";
import MarketingFooter from "@/components/MarketingFooter";
import MarketingSection from "@/components/MarketingSection";
import { marketingCopy } from "@/lib/marketingCopy";
import { useMarketingLang } from "@/lib/useMarketingLang";

export default function Home() {
  const { lang } = useMarketingLang();
  const t = marketingCopy(lang);

  return (
    <div className="islapos-marketing min-h-screen bg-[var(--mp-bg)] text-[var(--mp-fg)]">
      <div className="relative mx-auto w-full max-w-6xl px-6 py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] overflow-hidden"
        >
          <div className="absolute left-1/2 top-[-220px] h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(0,179,164,0.22),rgba(0,179,164,0))] blur-2xl" />
          <div className="absolute left-[-120px] top-[-140px] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,90,122,0.16),rgba(255,90,122,0))] blur-2xl" />
          <div className="absolute right-[-140px] top-[-160px] h-[420px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(255,210,74,0.16),rgba(255,210,74,0))] blur-2xl" />
        </div>
        <MarketingHeader ctaVariant="signin" />

        <main className="mt-14">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-1 text-xs font-medium text-[var(--mp-muted)] shadow-sm">
                <span className="inline-block h-2 w-2 rounded-full bg-[var(--mp-primary)]" />
                {lang === "es" ? "Nuevo: prueba gratis" : "New: free trial"}
              </div>

              <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
                {t.home.heroTitle}
              </h1>
              <p className="mt-4 text-base text-[var(--mp-muted)]">{t.home.heroSubtitle}</p>
              <p className="mt-4 text-sm font-semibold tracking-tight">{t.tagline}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-5 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/login"
                >
                  {t.home.ctaPrimary}
                </a>
                <a
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)] px-5 text-sm font-medium text-[var(--mp-fg)] hover:bg-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                  href="/pricing"
                >
                  {t.home.ctaSecondary}
                </a>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <MarketingCard
                  title={t.home.cards.prReadyTitle}
                  description={t.home.cards.prReadyBody}
                  className="p-4 rounded-xl"
                />
                <MarketingCard
                  title={t.home.cards.goLiveTitle}
                  description={t.home.cards.goLiveBody}
                  className="p-4 rounded-xl"
                />
                <MarketingCard
                  title={t.home.cards.supportTitle}
                  description={t.home.cards.supportBody}
                  className="p-4 rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{lang === "es" ? "Vista previa" : "Preview"}</div>
                <div className="text-xs text-[var(--mp-muted)]">IslaPOS</div>
              </div>

              <div className="mt-4 rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-[var(--mp-muted)]">
                    {lang === "es" ? "Ticket" : "Ticket"} #1042
                  </div>
                  <div className="text-xs font-medium text-[var(--mp-muted)]">IVU</div>
                </div>
                <div className="mt-3 grid gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{lang === "es" ? "Mofongo" : "Mofongo"}</div>
                    <div>$12.00</div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{lang === "es" ? "Refresco" : "Soda"}</div>
                    <div>$2.00</div>
                  </div>
                  <div className="mt-3 border-t border-[var(--mp-border)] pt-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-[var(--mp-muted)]">{lang === "es" ? "Subtotal" : "Subtotal"}</div>
                      <div>$14.00</div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-[var(--mp-muted)]">IVU</div>
                      <div>$1.61</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                      <div>{lang === "es" ? "Total" : "Total"}</div>
                      <div>$15.61</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-4 text-sm">
                  <div className="font-semibold">
                    {lang === "es" ? "Cobro rápido" : "Fast checkout"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--mp-muted)]">
                    {lang === "es" ? "Menos pasos para cobrar." : "Fewer steps to get paid."}
                  </div>
                </div>
                <div className="rounded-xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-4 text-sm">
                  <div className="font-semibold">
                    {lang === "es" ? "Setup guiado" : "Guided setup"}
                  </div>
                  <div className="mt-1 text-xs text-[var(--mp-muted)]">
                    {lang === "es" ? "IVU, menú y productos." : "IVU, menu and products."}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Por qué IslaPOS" : "Why IslaPOS"}
              title={lang === "es" ? "Más simple para tu equipo" : "Simpler for your team"}
              subtitle={
                lang === "es"
                  ? "Diseñado para operar rápido en Puerto Rico: IVU, menú y flujo diario — con onboarding guiado."
                  : "Built to run fast in Puerto Rico: IVU, menu setup, and daily workflow — with guided onboarding."
              }
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MarketingCard
                  title={lang === "es" ? "IVU listo" : "IVU-ready"}
                  description={
                    lang === "es"
                      ? "Configuración por negocio y ubicación, sin complicaciones."
                      : "Per-business and per-location setup, without the headaches."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "Cobro rápido" : "Fast checkout"}
                  description={
                    lang === "es"
                      ? "Menos pasos en caja para cobrar y seguir atendiendo."
                      : "Fewer steps at the register so you keep the line moving."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "Menú + productos" : "Menu + products"}
                  description={
                    lang === "es"
                      ? "Categorías, artículos y códigos de barra/SKU."
                      : "Categories, items, and barcode/SKU support."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "Entrenamiento" : "Training"}
                  description={
                    lang === "es"
                      ? "Sesiones cortas para cajeros y gerentes."
                      : "Short sessions so cashiers and managers learn fast."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "Soporte real" : "Real support"}
                  description={
                    lang === "es"
                      ? "Onboarding guiado para que abras con confianza."
                      : "Guided onboarding so you go live with confidence."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "Listo para crecer" : "Ready to scale"}
                  description={
                    lang === "es"
                      ? "Añade locales y usuarios cuando estés listo."
                      : "Add locations and users when you’re ready."
                  }
                />
              </div>
            </MarketingSection>
          </div>

          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Qué incluye" : "What you get"}
              title={t.home.whatYouGetTitle}
              subtitle={lang === "es" ? "Todo lo esencial para operar en PR, más onboarding." : "Everything you need to run in PR, plus onboarding."}
            >
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MarketingCard title={t.home.whatYouGet.posTitle} description={t.home.whatYouGet.posBody} />
                <MarketingCard title={t.home.whatYouGet.menuTitle} description={t.home.whatYouGet.menuBody} />
                <MarketingCard title={t.home.whatYouGet.ivuTitle} description={t.home.whatYouGet.ivuBody} />
                <MarketingCard title={t.home.whatYouGet.supportTitle} description={t.home.whatYouGet.supportBody} />
              </div>
            </MarketingSection>
          </div>

          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Confianza" : "Trust"}
              title={lang === "es" ? "Restaurantes en Puerto Rico" : "Restaurants in Puerto Rico"}
              subtitle={lang === "es" ? "Pon logos y testimonios reales aquí cuando los tengas." : "Add real logos and testimonials here as you get them."}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <MarketingCard
                  title={lang === "es" ? "Logos" : "Logos"}
                  description={lang === "es" ? "Placeholders para logo strip." : "Logo strip placeholders."}
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                    <div className="h-10 rounded-lg border border-[var(--mp-border)] bg-[var(--mp-surface)]" />
                  </div>
                </MarketingCard>

                <div className="grid gap-4">
                  <MarketingCard title={t.home.trust.title2} description={t.home.trust.body2} />
                  <MarketingCard title={t.home.trust.title3} description={t.home.trust.body3} />
                </div>
              </div>
            </MarketingSection>
          </div>

          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Preguntas" : "FAQ"}
              title={lang === "es" ? "Preguntas frecuentes" : "Frequently asked questions"}
              subtitle={
                lang === "es"
                  ? "Respuestas rápidas a lo más común antes de empezar la prueba gratis."
                  : "Quick answers to the most common questions before starting your free trial."
              }
            >
              <div className="grid gap-4">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {lang === "es" ? "¿Cuánto tarda el setup?" : "How long does setup take?"}
                    </summary>
                    <p className="mt-3 text-sm text-[var(--mp-muted)]">
                      {lang === "es"
                        ? "Para la mayoría de restaurantes, el setup básico (negocio, ubicación, IVU y productos) se puede completar el mismo día. Te guiamos paso a paso."
                        : "For most restaurants, basic setup (business, location, IVU, products) can be completed the same day. We guide you step by step."}
                    </p>
                  </details>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {lang === "es" ? "¿El precio es por local?" : "Is pricing per location?"}
                    </summary>
                    <p className="mt-3 text-sm text-[var(--mp-muted)]">
                      {lang === "es"
                        ? "Sí — los planes están pensados por local. Por ahora los precios son placeholders hasta definir tu oferta final."
                        : "Yes — plans are intended per location. Prices are placeholders for now until your final offer is set."}
                    </p>
                  </details>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {lang === "es" ? "¿Puedo entrenar a mi equipo?" : "Can I train my staff?"}
                    </summary>
                    <p className="mt-3 text-sm text-[var(--mp-muted)]">
                      {lang === "es"
                        ? "Sí. Incluimos recursos de entrenamiento y podemos hacer sesiones cortas para cajeros y gerentes."
                        : "Yes. We include training resources and can run short sessions for cashiers and managers."}
                    </p>
                  </details>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <details className="group">
                    <summary className="cursor-pointer list-none text-sm font-semibold">
                      {lang === "es" ? "¿Qué pasa después de crear la cuenta?" : "What happens after I create an account?"}
                    </summary>
                    <p className="mt-3 text-sm text-[var(--mp-muted)]">
                      {lang === "es"
                        ? "Entras al panel y sigues el setup guiado. Si necesitas ayuda, usamos la página de Entrenamiento y te acompañamos en el onboarding."
                        : "You’ll sign in and follow the guided setup. If you need help, use the Training page and we’ll support you during onboarding."}
                    </p>
                  </details>
                </div>
              </div>
            </MarketingSection>
          </div>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
