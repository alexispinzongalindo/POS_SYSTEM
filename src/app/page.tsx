import MarketingHeader from "@/components/MarketingHeader";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <MarketingHeader ctaLabel="Sign in" ctaHref="/login" />

        <main className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              The all-in-one POS built for Puerto Rico restaurants.
            </h1>
            <p className="mt-3 text-sm font-semibold tracking-tight">
              POS hecho para Puerto Rico. IVU listo. Soporte real.
            </p>
            <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
              Take orders, manage your menu, and run daily operations in one simple system. IVU-ready setup, affordable
              plans, and guided onboarding.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/login"
              >
                Start free trial
              </a>
              <a
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-5 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/pricing"
              >
                See pricing
              </a>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-sm font-semibold">Puerto Rico ready</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">IVU settings + local workflows.</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-sm font-semibold">Go live fast</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">We help you set it up.</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="text-sm font-semibold">Real support</div>
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Training for owners + staff.</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">What you get</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-black">
                POS + payments
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Fast checkout and receipts.</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-black">
                Menu management
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Categories, items, barcodes/SKU.</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-black">
                IVU-ready setup
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Business, location, taxes (IVU), products.</div>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-white p-4 text-sm dark:border-zinc-800 dark:bg-black">
                Support + training
                <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">We help you go live and stay live.</div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/admin"
              >
                Admin
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/pos"
              >
                POS
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/setup"
              >
                Setup
              </a>
            </div>
          </div>
        </main>

        <section className="mt-14 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">Trusted locally</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Add real restaurant quotes here. Even 2–3 short testimonials make a huge difference.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">“Easy for my staff”</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Placeholder testimonial — Restaurant Name, PR
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">“IVU setup was quick”</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Placeholder testimonial — Restaurant Name, PR
            </p>
          </div>
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">Support that responds</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Prefer WhatsApp? No problem. Need training for your cashiers and managers? We’ll guide you.
            </p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/contact"
              >
                WhatsApp support
              </a>
              <a
                className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/contact"
              >
                Email support
              </a>
            </div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-semibold">Reliable by design</div>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Secure sign-in, role-based access, and a setup flow designed to prevent mistakes.
            </p>
          </div>
        </section>

        <footer className="mt-16 border-t border-zinc-200 pt-8 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>© {new Date().getFullYear()} IslaPOS</div>
            <div className="flex gap-4">
              <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/pricing">
                Pricing
              </a>
              <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/onboarding">
                Training
              </a>
              <a
                className="hover:text-zinc-900 dark:hover:text-zinc-50"
                href="/contact"
              >
                WhatsApp
              </a>
              <a className="hover:text-zinc-900 dark:hover:text-zinc-50" href="/login">
                Sign in
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
