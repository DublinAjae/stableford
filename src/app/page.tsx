"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CourseEditor from "@/components/CourseEditor";
import MemberEditor from "@/components/MemberEditor";
import { TEE_COLOR_LABELS } from "@/lib/courses";
import type { GolfCourse, Member, RoundListItem } from "@/lib/types";

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(y, m - 1, d);
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][dt.getDay()];
  return `${y}년 ${m}월 ${d}일 (${weekday})`;
}

export default function HomePage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [admin, setAdmin] = useState(false);
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => todayIso());
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState<"none" | "courses" | "members">("none");

  function openDatePicker() {
    const el = dateInputRef.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
      el.click();
    }
  }

  const load = useCallback(async () => {
    const res = await fetch("/api/rounds", { cache: "no-store" });
    const body = (await res.json()) as {
      rounds: RoundListItem[];
      courses: GolfCourse[];
      members: Member[];
      admin: boolean;
    };
    setRounds(body.rounds || []);
    setCourses(body.courses || []);
    setMembers(body.members || []);
    setAdmin(Boolean(body.admin));
    setCourseId((prev) => prev || body.courses?.[0]?.id || "");
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function login() {
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "로그인 실패");
      return;
    }
    await load();
    setManage("courses");
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setManage("none");
    setPin("");
    await load();
  }

  async function createTournament() {
    setBusy(true);
    setError(null);
    try {
      const selected = courses.find((c) => c.id === courseId);
      const tournamentName =
        name.trim() ||
        (selected ? `${date} ${selected.name}` : `${date} Stableford`);

      const res = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: tournamentName,
          date,
          courseId,
        }),
      });
      const body = (await res.json()) as {
        state?: { round: { slug: string } };
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "생성 실패");
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

      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 py-12 sm:px-8 sm:py-16">
        <p className="animate-rise font-display text-[clamp(2.6rem,14vw,6.5rem)] leading-[0.9] tracking-[-0.03em] text-[var(--foam)]">
          STABLEFORD
        </p>
        <p className="animate-rise-delay mt-5 max-w-lg text-base leading-relaxed text-[var(--foam)]/75 sm:text-lg">
          코스·회원 명단을 저장해 두고, 대회마다 날짜·코스·플레이어를 골라
          별도 링크로 운영하세요.
        </p>

        {rounds.length > 0 && (
          <div className="animate-rise-delay-2 mt-10 space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
              Tournaments
            </p>
            <div className="flex flex-col gap-2">
              {rounds.map((r) => (
                <Link
                  key={r.slug}
                  href={`/r/${r.slug}`}
                  className="rounded-sm border border-white/10 bg-black/25 px-4 py-3 transition hover:border-[var(--lime)]/40"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-medium text-[var(--foam)]">
                      {r.name}
                    </span>
                    <span className="text-sm text-[var(--foam)]/45">
                      {r.date} · {r.courseName} · {TEE_COLOR_LABELS[r.teeColor]}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--foam)]/35">
                    /r/{r.slug}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="animate-rise-delay-2 mt-10 max-w-xl space-y-4 rounded-sm border border-white/10 bg-black/25 p-5">
          {!admin ? (
            <>
              <p className="text-sm font-medium text-[var(--foam)]">Admin 로그인</p>
              <label className="block text-xs text-[var(--foam)]/45">
                PIN
                <input
                  type="password"
                  className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") void login();
                  }}
                />
              </label>
              {error && <p className="text-sm text-red-200">{error}</p>}
              <button
                type="button"
                className="btn-solid w-full"
                onClick={() => void login()}
              >
                로그인
              </button>
              <p className="text-xs text-[var(--foam)]/35">
                기본 PIN: <code>admin</code>
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-[var(--foam)]">새 대회</p>
              <div className="block text-xs text-[var(--foam)]/45">
                날짜
                <input
                  ref={dateInputRef}
                  type="date"
                  className="sr-only"
                  value={date}
                  onChange={(e) => {
                    if (e.target.value) setDate(e.target.value);
                  }}
                  tabIndex={-1}
                  aria-hidden
                />
                <div className="mt-1 flex gap-2">
                  <button
                    type="button"
                    className="btn-ghost min-w-0 flex-1 justify-between gap-2 px-3 text-left"
                    onClick={openDatePicker}
                  >
                    <span className="truncate text-sm font-semibold text-[var(--foam)]">
                      {formatDateLabel(date)}
                    </span>
                    <span className="shrink-0 text-[var(--lime)]">날짜 선택</span>
                  </button>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={() => setDate(todayIso())}
                  >
                    오늘
                  </button>
                </div>
              </div>
              <label className="block text-xs text-[var(--foam)]/45">
                골프 코스
                <select
                  className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">코스 선택</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {TEE_COLOR_LABELS[c.teeColor]}
                      {c.lengthMeters != null ? ` · ${c.lengthMeters}m` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs text-[var(--foam)]/45">
                대회 이름 (비우면 날짜+코스명)
                <input
                  className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: October Medal"
                />
              </label>
              {error && <p className="text-sm text-red-200">{error}</p>}
              <button
                type="button"
                disabled={busy || !courseId}
                className="btn-solid w-full"
                onClick={() => void createTournament()}
              >
                대회 만들고 Admin 열기
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={manage === "courses" ? "btn-solid" : "btn-ghost"}
                  onClick={() =>
                    setManage((v) => (v === "courses" ? "none" : "courses"))
                  }
                >
                  코스 관리
                </button>
                <button
                  type="button"
                  className={manage === "members" ? "btn-solid" : "btn-ghost"}
                  onClick={() =>
                    setManage((v) => (v === "members" ? "none" : "members"))
                  }
                >
                  회원 명단
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void logout()}
                >
                  로그아웃
                </button>
              </div>
              <p className="text-xs text-[var(--foam)]/40">
                회원 {members.length}명 · 코스 {courses.length}개
              </p>
            </>
          )}
        </div>

        {admin && manage === "courses" && (
          <div className="mt-8">
            <CourseEditor courses={courses} onChanged={load} />
          </div>
        )}
        {admin && manage === "members" && (
          <div className="mt-8">
            <MemberEditor members={members} onChanged={load} />
          </div>
        )}
      </section>
    </div>
  );
}
