import Link from "next/link";

export default function Shell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-fairway" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-mist" aria-hidden />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <div>
          <Link
            href="/"
            className="font-display text-lg tracking-[0.18em] text-[var(--foam)] transition hover:text-[var(--lime)]"
          >
            STABLEFORD
          </Link>
          <p className="mt-1 text-sm text-[var(--foam)]/55">{title}</p>
          {subtitle ? (
            <p className="text-xs text-[var(--foam)]/40">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-5 pb-20 pt-8 sm:px-8">
        {children}
      </main>
    </div>
  );
}
