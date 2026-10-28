import type { PlayerStanding } from "@/lib/types";

export default function StandingsTable({
  standings,
}: {
  standings: PlayerStanding[];
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
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
                <td className="px-3 py-2 tabular-nums font-semibold text-[var(--foam)]">
                  {tied ? `T${row.rank}` : row.rank}
                </td>
                <td className="px-3 py-2">
                  <span className="player-name">{row.player.name}</span>
                </td>
                <td className="px-3 py-2 font-medium text-[var(--foam)]/80">
                  {row.player.groupCode}
                </td>
                <td className="px-3 py-2">
                  <span className="player-hcp inline">{row.player.courseHandicap}</span>
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
  );
}
