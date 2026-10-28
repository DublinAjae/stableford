import type { PlayerStanding } from "@/lib/types";

export default function StandingsTable({
  standings,
}: {
  standings: PlayerStanding[];
}) {
  return (
    <>
      {/* Mobile: compact cards — no horizontal scroll */}
      <ul className="space-y-2 sm:hidden">
        {standings.map((row) => {
          const tied =
            standings.filter((s) => s.rank === row.rank).length > 1;
          return (
            <li
              key={row.player.id}
              className="flex items-center justify-between gap-3 rounded-sm border border-white/10 bg-black/25 px-3 py-3"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-[var(--foam)]">
                  {tied ? `T${row.rank}` : row.rank}
                </span>
                <div className="min-w-0">
                  <p className="player-name truncate">{row.player.name}</p>
                  <p className="text-xs text-[var(--foam)]/50">
                    {row.player.groupCode}조 · HCP {row.player.courseHandicap} ·{" "}
                    {row.holesPlayed}홀
                  </p>
                </div>
              </div>
              <p className="shrink-0 font-display text-2xl tabular-nums text-[var(--lime)]">
                {row.totalPoints}
              </p>
            </li>
          );
        })}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-sm border border-white/10 bg-black/20 sm:block">
        <table className="w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[var(--foam)]/45">
              <th className="px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Player</th>
              <th className="px-3 py-3 font-medium">조</th>
              <th className="px-3 py-3 font-medium">HCP</th>
              <th className="px-3 py-3 font-medium">Holes</th>
              <th className="px-3 py-3 font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const tied =
                standings.filter((s) => s.rank === row.rank).length > 1;
              return (
                <tr key={row.player.id} className="border-b border-white/5">
                  <td className="px-3 py-2 font-semibold tabular-nums text-[var(--foam)]">
                    {tied ? `T${row.rank}` : row.rank}
                  </td>
                  <td className="px-3 py-2">
                    <span className="player-name">{row.player.name}</span>
                  </td>
                  <td className="px-3 py-2 font-medium text-[var(--foam)]/80">
                    {row.player.groupCode}
                  </td>
                  <td className="px-3 py-2">
                    <span className="player-hcp inline">
                      {row.player.courseHandicap}
                    </span>
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--foam)]/70">
                    {row.holesPlayed}
                  </td>
                  <td className="px-3 py-2 font-semibold tabular-nums text-[var(--lime)]">
                    {row.totalPoints}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
