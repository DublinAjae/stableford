"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Podium from "@/components/Podium";
import StandingsTable from "@/components/StandingsTable";
import ScoreGrid from "@/components/ScoreGrid";
import { useRoundState } from "@/hooks/useRoundState";
import { groupCodes, rankPlayers } from "@/lib/ranking";
import { recognizeScorecard } from "@/lib/ocr";
import type { CourseHole, RoundState } from "@/lib/types";
import type { UpsertPlayerInput } from "@/lib/store";

export default function AdminPanel({ slug }: { slug: string }) {
  const { state, setState, admin, loading, error, refresh } = useRoundState({
    slug,
  });
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"live" | "course" | "players">("live");
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const standings = useMemo(
    () => (state ? rankPlayers(state) : []),
    [state],
  );
  const groups = useMemo(
    () => (state ? groupCodes(state.players) : []),
    [state],
  );

  async function login() {
    setLoginError(null);
    const res = await fetch(`/api/rounds/${slug}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoginError(body?.error || "로그인 실패");
      return;
    }
    await refresh();
  }

  async function saveCourse(course: CourseHole[]) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${slug}/course`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course }),
      });
      const body = (await res.json()) as { state?: RoundState; error?: string };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      if (body.state) setState(body.state);
    } finally {
      setBusy(false);
    }
  }

  async function savePlayers(players: UpsertPlayerInput[]) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${slug}/players`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players }),
      });
      const body = (await res.json()) as { state?: RoundState; error?: string };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      if (body.state) setState(body.state);
    } finally {
      setBusy(false);
    }
  }

  async function saveScore(playerId: string, hole: number, gross: number | null) {
    if (!state) return;
    // optimistic
    const nextScores = state.scores.filter(
      (s) => !(s.playerId === playerId && s.hole === hole),
    );
    nextScores.push({ playerId, hole, gross });
    setState({ ...state, scores: nextScores });

    const res = await fetch(`/api/rounds/${slug}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: [{ playerId, hole, gross }] }),
    });
    const body = (await res.json()) as { state?: RoundState };
    if (body.state) setState(body.state);
  }

  async function onCoursePhoto(file: File) {
    setOcrNote("스코어카드에서 Par / SI 읽는 중…");
    try {
      const result = await recognizeScorecard(file);
      if (!state) return;
      const course = state.course.map((h) => {
        const parsed = result.holes.find((x) => x.hole === h.hole);
        return {
          hole: h.hole,
          par: parsed?.par ?? h.par,
          strokeIndex: parsed?.strokeIndex ?? h.strokeIndex,
        };
      });
      setState({ ...state, course });
      setOcrNote(
        `OCR 완료 (${result.confidence}). 확인 후 저장하세요. ${result.notes.join(" ")}`,
      );
    } catch {
      setOcrNote("OCR 실패 — 수동으로 입력해 주세요.");
    }
  }

  if (loading && !state) {
    return (
      <Shell title="Admin">
        <p className="text-[var(--foam)]/60">불러오는 중…</p>
      </Shell>
    );
  }

  if (error || !state) {
    return (
      <Shell title="Admin">
        <p className="text-red-200">{error || "라운드 없음"}</p>
      </Shell>
    );
  }

  if (!admin) {
    return (
      <Shell title={`${state.round.name} · Admin`}>
        <div className="mx-auto max-w-sm rounded-sm border border-white/10 bg-black/25 p-6">
          <p className="text-sm text-[var(--foam)]/60">Admin PIN</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void login();
            }}
            className="mt-3 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-3 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
          />
          {loginError && (
            <p className="mt-2 text-sm text-red-200">{loginError}</p>
          )}
          <button
            type="button"
            onClick={() => void login()}
            className="mt-4 w-full rounded-sm bg-[var(--lime)] px-4 py-3 font-semibold text-[var(--ink)]"
          >
            로그인
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={`${state.round.name} · Admin`}
      subtitle="실시간 전체 스코어 · 코스/플레이어 설정"
      actions={
        <>
          <Link className="btn-ghost" href={`/r/${slug}`}>
            공개 보드
          </Link>
          {groups.map((g) => (
            <Link key={g} className="btn-ghost" href={`/r/${slug}/g/${g}`}>
              {g}조
            </Link>
          ))}
        </>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["live", "라이브 보드"],
            ["course", "코스 (Par/SI)"],
            ["players", "플레이어 / 조"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? "btn-solid" : "btn-ghost"}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <div className="space-y-8">
          <Podium standings={standings} />
          <StandingsTable standings={standings} />
          <ScoreGrid
            state={state}
            players={state.players}
            editable
            onChangeGross={(playerId, hole, gross) =>
              void saveScore(playerId, hole, gross)
            }
          />
        </div>
      )}

      {tab === "course" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn-solid"
              onClick={() => fileRef.current?.click()}
            >
              스코어카드 사진으로 Par/SI 채우기
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onCoursePhoto(f);
              }}
            />
            <button
              type="button"
              disabled={busy}
              className="btn-ghost"
              onClick={() => void saveCourse(state.course)}
            >
              코스 저장
            </button>
          </div>
          {ocrNote && (
            <p className="text-sm text-[var(--foam)]/55">{ocrNote}</p>
          )}
          <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
            <table className="w-full min-w-[28rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-[var(--foam)]/45">
                  <th className="px-3 py-3 text-left font-medium">Hole</th>
                  <th className="px-3 py-3 text-left font-medium">Par</th>
                  <th className="px-3 py-3 text-left font-medium">SI</th>
                </tr>
              </thead>
              <tbody>
                {state.course.map((h, idx) => (
                  <tr key={h.hole} className="border-b border-white/5">
                    <td className="px-3 py-2">{h.hole}</td>
                    <td className="px-2 py-1.5">
                      <input
                        className="field"
                        value={h.par}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          const course = state.course.map((c, i) =>
                            i === idx
                              ? {
                                  ...c,
                                  par: Math.min(6, Math.max(3, Math.round(n))),
                                }
                              : c,
                          );
                          setState({ ...state, course });
                        }}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        className="field"
                        value={h.strokeIndex}
                        onChange={(e) => {
                          const n = Number(e.target.value);
                          if (!Number.isFinite(n)) return;
                          const course = state.course.map((c, i) =>
                            i === idx
                              ? {
                                  ...c,
                                  strokeIndex: Math.min(
                                    18,
                                    Math.max(1, Math.round(n)),
                                  ),
                                }
                              : c,
                          );
                          setState({ ...state, course });
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "players" && (
        <PlayersEditor
          state={state}
          busy={busy}
          onSave={(players) => void savePlayers(players)}
          onLocal={(players) =>
            setState({
              ...state,
              players: players.map((p, i) => ({
                id: p.id || `tmp-${i}`,
                name: p.name,
                courseHandicap: p.courseHandicap,
                groupCode: p.groupCode,
                sortOrder: p.sortOrder,
              })),
            })
          }
        />
      )}
    </Shell>
  );
}

function PlayersEditor({
  state,
  busy,
  onSave,
  onLocal,
}: {
  state: RoundState;
  busy: boolean;
  onSave: (players: UpsertPlayerInput[]) => void;
  onLocal: (players: UpsertPlayerInput[]) => void;
}) {
  const rows: UpsertPlayerInput[] = state.players.map((p, i) => ({
    id: p.id,
    name: p.name,
    courseHandicap: p.courseHandicap,
    groupCode: p.groupCode,
    sortOrder: p.sortOrder ?? i,
  }));

  function update(i: number, patch: Partial<UpsertPlayerInput>) {
    const next = rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    onLocal(next);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-solid"
          onClick={() =>
            onLocal([
              ...rows,
              {
                name: `Player ${rows.length + 1}`,
                courseHandicap: 18,
                groupCode: "A",
                sortOrder: rows.length,
              },
            ])
          }
        >
          플레이어 추가
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() => onSave(rows)}
        >
          플레이어/조 저장
        </button>
      </div>
      <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--foam)]/45">
              <th className="px-3 py-3 text-left">이름</th>
              <th className="px-3 py-3 text-left">HCP</th>
              <th className="px-3 py-3 text-left">조</th>
              <th className="px-3 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={p.id || i} className="border-b border-white/5">
                <td className="px-2 py-1.5">
                  <input
                    className="w-40 rounded-sm border border-white/15 bg-black/30 px-2 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                    value={p.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="field"
                    value={p.courseHandicap}
                    onChange={(e) =>
                      update(i, {
                        courseHandicap: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="field"
                    value={p.groupCode}
                    onChange={(e) =>
                      update(i, {
                        groupCode: e.target.value.toUpperCase().slice(0, 2),
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="text-sm text-[var(--foam)]/45 hover:text-red-200"
                    onClick={() => onLocal(rows.filter((_, idx) => idx !== i))}
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-[var(--foam)]/45">
        조 링크 예:{" "}
        <code className="text-[var(--lime)]">/r/{state.round.slug}/g/A</code>
      </p>
    </div>
  );
}
