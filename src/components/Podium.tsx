import type { PlayerStanding } from "@/lib/types";

export default function Podium({ standings }: { standings: PlayerStanding[] }) {
  const podiumRanks = [1, 2, 3] as const;
  const byRank = podiumRanks.map((rank) =>
    standings.filter((s) => s.rank === rank && s.holesPlayed > 0),
  );
  const hasAny = byRank.some((rows) => rows.length > 0);

  if (!hasAny) {
    return (
      <div className="rounded-sm border border-white/10 bg-black/25 p-6 text-sm text-[var(--foam)]/50">
        아직 스코어가 없습니다. 조에서 타수를 입력하면 실시간으로 순위가 올라옵니다.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {podiumRanks.map((rank) => {
        const rows = byRank[rank - 1];
        if (!rows.length) return null;
        const tied = rows.length > 1;
        const orderClass =
          rank === 1 ? "sm:order-2" : rank === 2 ? "sm:order-1" : "sm:order-3";
        return (
          <div
            key={rank}
            className={`rounded-sm border p-5 ${orderClass} ${
              rank === 1
                ? "border-[var(--lime)]/50 bg-[var(--lime)]/10"
                : "border-white/15 bg-black/25"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
              {tied ? `공동 ${rank}위` : `${rank}위`}
              {tied ? ` · ${rows.length}명` : ""}
            </p>
            <ul className="mt-2 space-y-2">
              {rows.map((row) => (
                <li key={row.player.id}>
                  <p className="font-display text-xl leading-tight text-[var(--foam)] sm:text-2xl">
                    {row.player.name}
                  </p>
                  <p className="text-xs font-semibold text-[var(--foam)]/80 sm:text-sm">
                    {row.player.groupCode}조 · HCP {row.player.courseHandicap}
                  </p>
                </li>
              ))}
            </ul>
            <p
              className={`mt-4 font-display text-4xl tabular-nums sm:text-5xl ${
                rank === 1 ? "text-[var(--lime)]" : "text-[var(--foam)]"
              }`}
            >
              {rows[0].totalPoints}
            </p>
            <p className="mt-1 text-xs text-[var(--foam)]/40">
              {rows[0].holesPlayed}홀 · Out {rows[0].outPoints} / In{" "}
              {rows[0].inPoints}
            </p>
          </div>
        );
      })}
    </div>
  );
}
