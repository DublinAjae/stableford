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
    <div className="relative min-h-full overflow-x-hidden">
      <div className="pointer-events-none absolute inset-0 bg-fairway" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-mist" aria-hidden />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 pt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-8 sm:pt-6">
        <div className="min-w-0">
          <Link
            href="/"
            className="font-display text-base tracking-[0.18em] text-[var(--foam)] transition hover:text-[var(--lime)] sm:text-lg"
          >
            STABLEFORD
          </Link>
          <p className="mt-1 break-words text-sm font-medium text-[var(--foam)]/70">
            {title}
          </p>
          {subtitle ? (
            <p className="break-words text-xs leading-relaxed text-[var(--foam)]/40">
              {subtitle}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </header>
      <main className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-24 pt-6 sm:px-8 sm:pt-8">
        {children}
      </main>
    </div>
  );
}
