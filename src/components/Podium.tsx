import type { PlayerStanding } from "@/lib/types";

const medals = ["1", "2", "3"] as const;

export default function Podium({ standings }: { standings: PlayerStanding[] }) {
  const top = standings.filter((s) => s.rank <= 3).slice(0, 3);
  // Ensure order 2, 1, 3 visual if we want podium layout — keep rank order 1,2,3 for clarity on mobile
  const ordered = [1, 2, 3]
    .map((rank) => top.find((s) => s.rank === rank))
    .filter(Boolean) as PlayerStanding[];

  if (ordered.length === 0) {
    return (
      <div className="rounded-sm border border-white/10 bg-black/25 p-6 text-sm text-[var(--foam)]/50">
        아직 스코어가 없습니다. 조에서 타수를 입력하면 실시간으로 순위가 올라옵니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {ordered.map((row, i) => (
        <div
          key={row.player.id}
          className={`rounded-sm border p-5 ${
            row.rank === 1
              ? "border-[var(--lime)]/50 bg-[var(--lime)]/10 sm:order-2"
              : row.rank === 2
                ? "border-white/15 bg-black/25 sm:order-1"
                : "border-white/15 bg-black/25 sm:order-3"
          }`}
        >
          <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
            {medals[i] ?? row.rank}위
          </p>
          <p className="mt-2 font-display text-2xl text-[var(--foam)]">
            {row.player.name}
          </p>
          <p className="mt-1 text-sm text-[var(--foam)]/50">
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
      ))}
    </div>
  );
}
