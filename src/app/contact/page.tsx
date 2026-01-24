import MarketingHeader from "@/components/MarketingHeader";

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">Contact & Support</h1>
            <p className="mt-3 text-sm font-semibold tracking-tight">POS hecho para Puerto Rico. IVU listo. Soporte real.</p>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
              This page is a placeholder until we publish your real support email, phone and WhatsApp. For now, restaurants
              can start the free trial and you can support them directly.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Support hours</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Add your real hours here (example: Mon–Sat 9am–7pm AST).</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Help with onboarding</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                We can guide you through IVU, menu setup, and staff training.
              </p>
              <a
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/login"
              >
                Start free trial
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Email</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Placeholder: support@islapos.com</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">WhatsApp</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Placeholder: +1 (787) XXX-XXXX</p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
