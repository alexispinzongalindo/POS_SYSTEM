import Image from "next/image";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-10 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between gap-6">
          <Image
            className="dark:invert"
            src="/next.svg"
            alt="POS System"
            width={100}
            height={20}
            priority
          />
          <div className="text-right">
            <div className="text-sm font-medium">POS System</div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Restaurant SaaS (Puerto Rico)
            </div>
          </div>
        </div>

        <h1 className="mt-10 text-3xl font-semibold tracking-tight">Welcome</h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
          Start by signing in to the Admin area.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            href="/login"
          >
            Go to Login
          </a>
          <a
            className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:hover:bg-zinc-900"
            href="/admin"
          >
            Go to Admin
          </a>
        </div>
      </main>
    </div>
  );
}
