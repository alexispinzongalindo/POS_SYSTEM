import MarketingHeader from "@/components/MarketingHeader";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">Features built for daily restaurant work</h1>
            <p className="mt-3 text-sm font-semibold tracking-tight">POS hecho para Puerto Rico. IVU listo. Soporte real.</p>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
              Keep it simple: take orders, manage products, track sales, and set up IVU — with support when you need it.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">POS</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Create tickets fast, handle payments, print receipts.
              </p>
              <a className="mt-4 inline-flex text-sm font-medium text-zinc-900 dark:text-zinc-50" href="/pos">
                Open POS
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Admin</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Manage settings, invite users, and access key controls.
              </p>
              <a className="mt-4 inline-flex text-sm font-medium text-zinc-900 dark:text-zinc-50" href="/admin">
                Open Admin
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Setup wizard</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Business, location, taxes (IVU), and products.
              </p>
              <a className="mt-4 inline-flex text-sm font-medium text-zinc-900 dark:text-zinc-50" href="/setup">
                Start setup
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Guided onboarding</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Training resources and hands-on help so you can go live.
              </p>
              <a className="mt-4 inline-flex text-sm font-medium text-zinc-900 dark:text-zinc-50" href="/onboarding">
                See training
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
