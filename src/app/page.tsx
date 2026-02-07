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

        <main className="mt-12">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--mp-border)] bg-[var(--mp-surface)] px-3 py-1 text-xs font-medium text-[var(--mp-muted)] shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--mp-primary)]" />
              {lang === "es" ? "Nuevo: prueba gratis" : "New: free trial"}
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              {t.home.heroTitle}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-[var(--mp-muted)]">{t.home.heroSubtitle}</p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-6 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                href="/login?mode=signup"
              >
                {lang === "es" ? "Crear cuenta" : "Create account"}
              </a>

              <a
                className="inline-flex h-11 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-6 text-sm font-medium text-[var(--mp-fg)] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                href="/login?mode=signin"
              >
                {lang === "es" ? "Entrar" : "Sign in"}
              </a>
            </div>

            <p className="mt-5 text-sm font-semibold tracking-tight">{t.tagline}</p>
          </div>

          <div className="mt-8">
            <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-[var(--mp-surface)] shadow-[0_30px_80px_rgba(0,0,0,0.12)]">
              <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-12 lg:items-stretch">
                <div className="relative grid place-items-center rounded-2xl border border-[var(--mp-border)] bg-white/60 p-3 lg:col-span-7">
                  <img
                    alt={lang === "es" ? "Vista del POS" : "POS preview"}
                    src="/hero/PART2.png"
                    className="w-full max-h-[70vh] rounded-2xl object-contain"
                  />
                </div>

                <div className="grid gap-4 lg:col-span-5">
                  <MarketingCard
                    title={lang === "es" ? "Hecho para el flujo real" : "Built for real workflow"}
                    description={
                      lang === "es"
                        ? "Toma órdenes, maneja mesas y continúa donde lo dejaste — sin complicar a tu equipo."
                        : "Take orders, manage tables, and pick up where you left off — without slowing your team down."
                    }
                    className="p-5"
                  >
                    <div className="grid gap-2 text-sm text-[var(--mp-muted)]">
                      <div className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--mp-primary)]" />
                        <span>{lang === "es" ? "Mesas + tickets abiertos" : "Tables + open tickets"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--mp-primary)]" />
                        <span>{lang === "es" ? "Búsqueda de productos + categorías" : "Item search + categories"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--mp-primary)]" />
                        <span>{lang === "es" ? "Barcode / SKU" : "Barcode / SKU"}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full bg-[var(--mp-primary)]" />
                        <span>{lang === "es" ? "Setup IVU y negocio" : "IVU + business setup"}</span>
                      </div>
                    </div>
                  </MarketingCard>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <MarketingCard
                      title={lang === "es" ? "Nuevo" : "New"}
                      description={
                        lang === "es"
                          ? "Tickets abiertos: regresa a una orden en segundos."
                          : "Open tickets: resume any order in seconds."
                      }
                      className="p-5"
                    />
                    <MarketingCard
                      title={lang === "es" ? "Soporte" : "Support"}
                      description={
                        lang === "es"
                          ? "Ayuda real para arrancar (onboarding + entrenamiento)."
                          : "Real help to go live (onboarding + training)."
                      }
                      className="p-5"
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <a
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-lg bg-[var(--mp-primary)] px-6 text-sm font-medium text-[var(--mp-primary-contrast)] hover:bg-[var(--mp-primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                      href="/login?mode=signup"
                    >
                      {lang === "es" ? "Empieza la prueba" : "Start free trial"}
                    </a>
                    <a
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-6 text-sm font-medium text-[var(--mp-fg)] hover:bg-black/[0.03] focus:outline-none focus:ring-2 focus:ring-[var(--mp-ring)]"
                      href="/features"
                    >
                      {lang === "es" ? "Ver funciones" : "See features"}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-14">
            <MarketingSection
              eyebrow={lang === "es" ? "Tour de la app" : "Product tour"}
              title={lang === "es" ? "Mira IslaPOS en 60 segundos" : "See IslaPOS in 60 seconds"}
              subtitle={
                lang === "es"
                  ? "Video con voz femenina y resumen rápido de las funciones clave."
                  : "A narrated, quick walkthrough of the key features."
              }
            >
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div className="overflow-hidden rounded-3xl border border-[var(--mp-border)] bg-white shadow-sm">
                  <video
                    className="aspect-video w-full bg-black"
                    controls
                    playsInline
                    preload="metadata"
                    poster="/hero/PART2.png"
                  >
                    <source src={lang === "es" ? "/videos/islapos-es.mp4" : "/videos/islapos-en.mp4"} type="video/mp4" />
                    {lang === "es" ? "Tu navegador no soporta video HTML5." : "Your browser does not support HTML5 video."}
                  </video>
                </div>

                <div className="rounded-3xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">
                    {lang === "es" ? "Prefieres ver el slideshow interactivo?" : "Prefer the interactive slideshow?"}
                  </h3>
                  <p className="mt-2 text-sm text-[var(--mp-muted)]">
                    {lang === "es"
                      ? "Abre el tour con slides y textos sincronizados."
                      : "Open the slide-based tour with synced narration text."}
                  </p>
                  <a
                    href="/see-app-in-action"
                    className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white px-4 text-sm font-medium hover:bg-black/[0.03]"
                  >
                    {lang === "es" ? "Ver tour" : "View tour"}
                  </a>
                </div>
              </div>
            </MarketingSection>
          </div>

          <div className="mt-10 grid gap-3 sm:grid-cols-3">
            <MarketingCard title={t.home.cards.prReadyTitle} description={t.home.cards.prReadyBody} className="p-4 rounded-xl" />
            <MarketingCard title={t.home.cards.goLiveTitle} description={t.home.cards.goLiveBody} className="p-4 rounded-xl" />
            <MarketingCard title={t.home.cards.supportTitle} description={t.home.cards.supportBody} className="p-4 rounded-xl" />
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

          {/* Hurricane Mode / Offline Feature Highlight */}
          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Modo Huracán" : "Hurricane Mode"}
              title={lang === "es" ? "Funciona sin internet" : "Works without internet"}
              subtitle={
                lang === "es"
                  ? "Cuando se va la luz o el internet, tu POS sigue funcionando. Los tickets se guardan localmente y se sincronizan cuando vuelve la conexión."
                  : "When power or internet goes out, your POS keeps working. Tickets are saved locally and sync when connection returns."
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <MarketingCard
                  title={lang === "es" ? "📴 Sin conexión" : "📴 Offline"}
                  description={
                    lang === "es"
                      ? "Toma órdenes, abre mesas y cobra — todo sin internet."
                      : "Take orders, open tables, and checkout — all without internet."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "💾 Guardado local" : "💾 Local storage"}
                  description={
                    lang === "es"
                      ? "Los tickets se guardan en el dispositivo hasta que vuelva la conexión."
                      : "Tickets are saved on device until connection returns."
                  }
                />
                <MarketingCard
                  title={lang === "es" ? "🔄 Sincronización" : "🔄 Auto-sync"}
                  description={
                    lang === "es"
                      ? "Cuando vuelve el internet, todo se sincroniza automáticamente."
                      : "When internet returns, everything syncs automatically."
                  }
                />
              </div>
            </MarketingSection>
          </div>

          {/* Pricing Section */}
          <div className="mt-16">
            <MarketingSection
              eyebrow={lang === "es" ? "Planes" : "Pricing"}
              title={lang === "es" ? "Simple y transparente" : "Simple and transparent"}
              subtitle={
                lang === "es"
                  ? "Empieza con una prueba gratis. Cambia o cancela cuando quieras."
                  : "Start with a free trial. Change or cancel anytime."
              }
            >
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <div className="text-sm font-medium text-[var(--mp-muted)]">{lang === "es" ? "Prueba" : "Trial"}</div>
                  <div className="mt-2 text-3xl font-bold">{lang === "es" ? "Gratis" : "Free"}</div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">{lang === "es" ? "14 días" : "14 days"}</div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "POS completo" : "Full POS"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Menú ilimitado" : "Unlimited menu"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Modo offline" : "Offline mode"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Soporte por email" : "Email support"}</li>
                  </ul>
                  <a
                    href="/login?mode=signup"
                    className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white text-sm font-medium hover:bg-black/[0.03]"
                  >
                    {lang === "es" ? "Empezar gratis" : "Start free"}
                  </a>
                </div>

                <div className="relative rounded-2xl border-2 border-[var(--mp-primary)] bg-[var(--mp-surface)] p-6 shadow-lg">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--mp-primary)] px-3 py-1 text-xs font-medium text-white">
                    {lang === "es" ? "Popular" : "Popular"}
                  </div>
                  <div className="text-sm font-medium text-[var(--mp-muted)]">{lang === "es" ? "Profesional" : "Professional"}</div>
                  <div className="mt-2 text-3xl font-bold">$49<span className="text-lg font-normal text-[var(--mp-muted)]">/mo</span></div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">{lang === "es" ? "por local" : "per location"}</div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Todo en Prueba" : "Everything in Trial"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Usuarios ilimitados" : "Unlimited users"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Reportes avanzados" : "Advanced reports"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Soporte prioritario" : "Priority support"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Onboarding guiado" : "Guided onboarding"}</li>
                  </ul>
                  <a
                    href="/login?mode=signup"
                    className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[var(--mp-primary)] text-sm font-medium text-white hover:bg-[var(--mp-primary-hover)]"
                  >
                    {lang === "es" ? "Empezar ahora" : "Get started"}
                  </a>
                </div>

                <div className="rounded-2xl border border-[var(--mp-border)] bg-[var(--mp-surface)] p-6 shadow-sm">
                  <div className="text-sm font-medium text-[var(--mp-muted)]">{lang === "es" ? "Empresa" : "Enterprise"}</div>
                  <div className="mt-2 text-3xl font-bold">{lang === "es" ? "Contacto" : "Contact"}</div>
                  <div className="mt-1 text-sm text-[var(--mp-muted)]">{lang === "es" ? "precio personalizado" : "custom pricing"}</div>
                  <ul className="mt-4 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Todo en Profesional" : "Everything in Pro"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Multi-local" : "Multi-location"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "API access" : "API access"}</li>
                    <li className="flex items-center gap-2"><span className="text-[var(--mp-primary)]">✓</span> {lang === "es" ? "Soporte dedicado" : "Dedicated support"}</li>
                  </ul>
                  <a
                    href="/contact"
                    className="mt-6 inline-flex h-10 w-full items-center justify-center rounded-lg border border-[var(--mp-border)] bg-white text-sm font-medium hover:bg-black/[0.03]"
                  >
                    {lang === "es" ? "Contactar" : "Contact us"}
                  </a>
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

          {/* Final CTA */}
          <div className="mt-16 rounded-3xl bg-gradient-to-br from-[var(--mp-primary)] to-[#008577] p-8 text-center text-white sm:p-12">
            <h2 className="text-2xl font-bold sm:text-3xl">
              {lang === "es" ? "¿Listo para empezar?" : "Ready to get started?"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm opacity-90">
              {lang === "es"
                ? "Crea tu cuenta gratis y configura tu restaurante en minutos. Sin tarjeta de crédito."
                : "Create your free account and set up your restaurant in minutes. No credit card required."}
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a
                href="/login?mode=signup"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-6 text-sm font-medium text-[var(--mp-primary)] hover:bg-white/90"
              >
                {lang === "es" ? "Crear cuenta gratis" : "Create free account"}
              </a>
              <a
                href="/contact"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-6 text-sm font-medium text-white hover:bg-white/10"
              >
                {lang === "es" ? "Hablar con ventas" : "Talk to sales"}
              </a>
            </div>
          </div>
        </main>

        <MarketingFooter />
      </div>
    </div>
  );
}
