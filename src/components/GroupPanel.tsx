"use client";

import { useMemo } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import ScoreGrid from "@/components/ScoreGrid";
import { useRoundState } from "@/hooks/useRoundState";
import { buildPlayerStanding } from "@/lib/ranking";
import type { RoundState } from "@/lib/types";

export default function GroupPanel({
  slug,
  group,
}: {
  slug: string;
  group: string;
}) {
  const groupCode = group.toUpperCase();
  const { state, setState, loading, error } = useRoundState({ slug });

  const players = useMemo(
    () =>
      state?.players
        .filter((p) => p.groupCode === groupCode)
        .sort((a, b) => a.sortOrder - b.sortOrder) ?? [],
    [state, groupCode],
  );

  async function saveScore(playerId: string, hole: number, gross: number | null) {
    if (!state) return;
    const nextScores = state.scores.filter(
      (s) => !(s.playerId === playerId && s.hole === hole),
    );
    nextScores.push({ playerId, hole, gross });
    const optimistic: RoundState = { ...state, scores: nextScores };
    setState(optimistic);

    const res = await fetch(`/api/rounds/${slug}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        groupCode,
        scores: [{ playerId, hole, gross }],
      }),
    });
    const body = (await res.json()) as { state?: RoundState; error?: string };
    if (body.state) setState(body.state);
  }

  if (loading && !state) {
    return (
      <Shell title={`${groupCode}조`}>
        <p className="text-[var(--foam)]/60">불러오는 중…</p>
      </Shell>
    );
  }

  if (error || !state) {
    return (
      <Shell title={`${groupCode}조`}>
        <p className="text-red-200">{error || "라운드 없음"}</p>
      </Shell>
    );
  }

  return (
    <Shell
      title={`${state.round.name} · ${groupCode}조`}
      subtitle="스코어만 입력 가능 · Par/HCP/조는 admin만 변경"
      actions={
        <Link className="btn-ghost" href={`/r/${slug}`}>
          전체 순위
        </Link>
      }
    >
      {players.length === 0 ? (
        <p className="text-[var(--foam)]/55">
          {groupCode}조 플레이어가 없습니다. Admin에서 조 편성을 확인해 주세요.
        </p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {players.map((p) => {
              const s = buildPlayerStanding(p, state.course, state.scores);
              return (
                <div
                  key={p.id}
                  className="rounded-sm border border-white/10 bg-black/25 p-4"
                >
                  <p className="font-medium text-[var(--foam)]">{p.name}</p>
                  <p className="text-xs text-[var(--foam)]/45">
                    HCP {p.courseHandicap} · {s.holesPlayed}홀
                  </p>
                  <p className="mt-2 font-display text-3xl text-[var(--lime)] tabular-nums">
                    {s.totalPoints}
                  </p>
                </div>
              );
            })}
          </div>
          <ScoreGrid
            state={state}
            players={players}
            editable
            onChangeGross={(playerId, hole, gross) =>
              void saveScore(playerId, hole, gross)
            }
          />
        </div>
      )}
    </Shell>
  );
}
