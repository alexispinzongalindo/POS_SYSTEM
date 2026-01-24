import MarketingHeader from "@/components/MarketingHeader";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">Onboarding & Training</h1>
            <p className="mt-3 text-sm font-semibold tracking-tight">POS hecho para Puerto Rico. IVU listo. Soporte real.</p>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
              Your advantage is support and training. This page makes that clear so Puerto Rico restaurants feel safe
              starting the free trial.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">1) Guided setup</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                We help you complete Business, Location, Taxes (IVU) and Products so you can go live.
              </p>
              <a className="mt-4 inline-flex text-sm font-medium text-zinc-900 dark:text-zinc-50" href="/setup">
                Open setup
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">2) Staff training</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Short training sessions so cashiers and managers learn the system quickly.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">3) Support when you need it</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Real help for real restaurant issues: menu changes, tax questions, and daily operations.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Start free</div>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Create your account and we’ll guide you through the setup.
              </p>
              <a
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/login"
              >
                Start free trial
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
