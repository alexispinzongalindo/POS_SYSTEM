import MarketingHeader from "@/components/MarketingHeader";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <MarketingHeader />

        <main className="mt-10">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-semibold tracking-tight">Simple pricing for Puerto Rico restaurants</h1>
            <p className="mt-3 text-sm font-semibold tracking-tight">POS hecho para Puerto Rico. IVU listo. Soporte real.</p>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
              Start free, then pick the plan that matches your volume. IVU-ready setup plus training and onboarding.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Free trial</div>
              <div className="mt-2 text-3xl font-semibold">$0</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Get started and explore.</div>
              <ul className="mt-6 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li>Core POS</li>
                <li>Setup wizard</li>
                <li>Basic support</li>
              </ul>
              <a
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/login"
              >
                Start free
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-white p-6 shadow-sm dark:border-zinc-50 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Starter</div>
              <div className="mt-2 text-3xl font-semibold">$49</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Per month, per location.</div>
              <ul className="mt-6 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li>POS + receipts</li>
                <li>Menu & barcode/SKU</li>
                <li>Sales summary</li>
                <li>Training library</li>
              </ul>
              <a
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                href="/login"
              >
                Start free trial
              </a>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <div className="text-sm font-semibold">Pro</div>
              <div className="mt-2 text-3xl font-semibold">$99</div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">Per month, per location.</div>
              <ul className="mt-6 grid gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <li>Everything in Starter</li>
                <li>Priority support</li>
                <li>Guided onboarding session</li>
              </ul>
              <a
                className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
                href="/onboarding"
              >
                See training
              </a>
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Prices shown are placeholders — we can set your real pricing once you decide your offer.
          </div>
        </main>
      </div>
    </div>
  );
}
