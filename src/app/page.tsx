"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type RoundListItem = { slug: string; name: string; updatedAt: string };

export default function HomePage() {
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [name, setName] = useState("Saturday Stableford");
  const [slug, setSlug] = useState("saturday");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch("/api/rounds", { cache: "no-store" });
    const body = (await res.json()) as { rounds: RoundListItem[] };
    setRounds(body.rounds || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function createRound() {
    setBusy(true);
    setError(null);
    try {
      // If rounds exist, login against first round first using pin
      if (rounds.length > 0) {
        const resLogin = await fetch(
          `/api/rounds/${rounds[0].slug}/admin/login`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pin }),
          },
        );
        if (!resLogin.ok) {
          throw new Error("Admin PIN이 필요합니다.");
        }
      }

      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, slug }),
      });
      const body = (await res.json()) as {
        state?: { round: { slug: string } };
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "생성 실패");

      await fetch(`/api/rounds/${body.state!.round.slug}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin || "admin" }),
      });

      router.push(`/r/${body.state!.round.slug}/admin`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-fairway" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-mist" aria-hidden />

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-5xl flex-col justify-center px-5 py-16 sm:px-8">
        <p className="animate-rise font-display text-[clamp(3rem,11vw,6.5rem)] leading-[0.9] tracking-[-0.03em] text-[var(--foam)]">
          STABLEFORD
        </p>
        <p className="animate-rise-delay mt-5 max-w-lg text-base leading-relaxed text-[var(--foam)]/75 sm:text-lg">
          조별로 스코어를 입력하고, 공개 보드에서 1–3위를 실시간으로 확인하세요.
          Admin은 플레이어·핸디캡·조·코스를 설정합니다.
        </p>

        {rounds.length > 0 && (
          <div className="animate-rise-delay-2 mt-10 space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
              Live rounds
            </p>
            <div className="flex flex-col gap-2">
              {rounds.map((r) => (
                <Link
                  key={r.slug}
                  href={`/r/${r.slug}`}
                  className="rounded-sm border border-white/10 bg-black/25 px-4 py-3 transition hover:border-[var(--lime)]/40"
                >
                  <span className="font-medium text-[var(--foam)]">{r.name}</span>
                  <span className="ml-3 text-sm text-[var(--foam)]/40">
                    /r/{r.slug}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="animate-rise-delay-2 mt-10 max-w-md rounded-sm border border-white/10 bg-black/25 p-5">
          <p className="text-sm font-medium text-[var(--foam)]">새 라운드 (Admin)</p>
          <label className="mt-4 block text-xs text-[var(--foam)]/45">
            이름
            <input
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="mt-3 block text-xs text-[var(--foam)]/45">
            URL slug
            <input
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              value={slug}
              onChange={(e) =>
                setSlug(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-"),
                )
              }
            />
          </label>
          {rounds.length > 0 && (
            <label className="mt-3 block text-xs text-[var(--foam)]/45">
              Admin PIN
              <input
                type="password"
                className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
              />
            </label>
          )}
          {error && <p className="mt-2 text-sm text-red-200">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void createRound()}
            className="btn-solid mt-4 w-full"
          >
            라운드 만들고 Admin 열기
          </button>
          <p className="mt-3 text-xs text-[var(--foam)]/35">
            기본 Admin PIN: <code>admin</code> (환경변수 <code>ADMIN_PIN</code>으로 변경)
          </p>
        </div>
      </section>
    </div>
  );
}
