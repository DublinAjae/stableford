import type { PlayerStanding } from "@/lib/types";

export default function Podium({ standings }: { standings: PlayerStanding[] }) {
  // Keep tied players visible (e.g. joint 1st) — take top 3 by points order.
  const top = standings.slice(0, 3);

  if (top.length === 0 || top.every((s) => s.holesPlayed === 0)) {
    return (
      <div className="rounded-sm border border-white/10 bg-black/25 p-6 text-sm text-[var(--foam)]/50">
        아직 스코어가 없습니다. 조에서 타수를 입력하면 실시간으로 순위가 올라옵니다.
      </div>
    );
  }

  const classicPodium =
    top.length === 3 &&
    top[0].rank === 1 &&
    top[1].rank === 2 &&
    top[2].rank === 3;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {top.map((row, index) => {
        const tied = standings.filter((s) => s.rank === row.rank).length > 1;
        const orderClass = classicPodium
          ? row.rank === 1
            ? "sm:order-2"
            : row.rank === 2
              ? "sm:order-1"
              : "sm:order-3"
          : "";
        return (
          <div
            key={row.player.id}
            className={`rounded-sm border p-5 ${orderClass} ${
              row.rank === 1
                ? "border-[var(--lime)]/50 bg-[var(--lime)]/10"
                : "border-white/15 bg-black/25"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
              {tied ? `공동 ${row.rank}위` : `${row.rank}위`}
              {!classicPodium && top.length > 1 ? ` · #${index + 1}` : ""}
            </p>
            <p className="mt-2 font-display text-2xl text-[var(--foam)]">
              {row.player.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foam)]/80">
              {row.player.groupCode}조 · HCP {row.player.courseHandicap}
            </p>
            <p
              className={`mt-4 font-display text-5xl tabular-nums ${
                row.rank === 1 ? "text-[var(--lime)]" : "text-[var(--foam)]"
              }`}
            >
              {row.totalPoints}
            </p>
            <p className="mt-1 text-xs text-[var(--foam)]/40">
              {row.holesPlayed}홀 · Out {row.outPoints} / In {row.inPoints}
            </p>
          </div>
        );
      })}
    </div>
  );
}
