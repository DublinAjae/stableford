"use client";

import { useMemo } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Podium from "@/components/Podium";
import StandingsTable from "@/components/StandingsTable";
import { useRoundState } from "@/hooks/useRoundState";
import { TEE_COLOR_LABELS } from "@/lib/courses";
import { groupCodes, rankPlayers } from "@/lib/ranking";

export default function PublicBoard({ slug }: { slug: string }) {
  const { state, loading, error } = useRoundState({ slug });
  const standings = useMemo(
    () => (state ? rankPlayers(state) : []),
    [state],
  );
  const groups = useMemo(
    () => (state ? groupCodes(state.players) : []),
    [state],
  );

  if (loading && !state) {
    return (
      <Shell title="Live">
        <p className="text-[var(--foam)]/60">불러오는 중…</p>
      </Shell>
    );
  }

  if (error || !state) {
    return (
      <Shell title="Live">
        <p className="text-red-200">{error || "대회 없음"}</p>
      </Shell>
    );
  }

  return (
    <Shell
      title={state.round.name}
      subtitle={`${state.round.date} · ${state.round.courseName} · ${TEE_COLOR_LABELS[state.round.teeColor]} · 실시간 순위`}
      actions={
        <>
          {groups.map((g) => (
            <Link key={g} className="btn-ghost" href={`/r/${slug}/g/${g}`}>
              {g}조 입력
            </Link>
          ))}
          <Link className="btn-solid" href={`/r/${slug}/admin`}>
            Admin
          </Link>
        </>
      }
    >
      <div className="space-y-8">
        <Podium standings={standings} />
        <StandingsTable standings={standings} />
        <p className="text-xs text-[var(--foam)]/35">
          자동 새로고침 · 마지막 업데이트{" "}
          {new Date(state.round.updatedAt).toLocaleTimeString()}
        </p>
      </div>
    </Shell>
  );
}
