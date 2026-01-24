type MarketingHeaderProps = {
  ctaLabel?: string;
  ctaHref?: string;
};

export default function MarketingHeader({
  ctaLabel = "Start free trial",
  ctaHref = "/login",
}: MarketingHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4">
      <a href="/" className="text-sm font-semibold tracking-tight">
        IslaPOS
      </a>
      <nav className="flex items-center gap-4 text-sm">
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/features">
          Features
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/pricing">
          Pricing
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/onboarding">
          Training
        </a>
        <a className="text-zinc-700 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-50" href="/contact">
          Contact
        </a>
        <a
          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
          href={ctaHref}
        >
          {ctaLabel}
        </a>
      </nav>
    </header>
  );
}
