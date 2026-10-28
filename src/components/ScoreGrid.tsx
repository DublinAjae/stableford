"use client";

import type { CourseHole, Player, RoundState } from "@/lib/types";
import { buildPlayerStanding } from "@/lib/ranking";

function grossOf(
  state: RoundState,
  playerId: string,
  hole: number,
): number | null {
  return (
    state.scores.find((s) => s.playerId === playerId && s.hole === hole)
      ?.gross ?? null
  );
}

export default function ScoreGrid({
  state,
  players,
  editable = false,
  onChangeGross,
}: {
  state: RoundState;
  players: Player[];
  editable?: boolean;
  onChangeGross?: (playerId: string, hole: number, gross: number | null) => void;
}) {
  const course: CourseHole[] = state.course
    .slice()
    .sort((a, b) => a.hole - b.hole);

  return (
    <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-[var(--foam)]/45">
            <th className="sticky left-0 bg-[#062416]/95 px-3 py-3 font-medium">
              Hole
            </th>
            <th className="px-2 py-3 font-medium">Par</th>
            <th className="px-2 py-3 font-medium">SI</th>
            {players.map((p) => (
              <th key={p.id} className="px-2 py-3 font-medium">
                <div>{p.name}</div>
                <div className="text-[10px] font-normal text-[var(--foam)]/40">
                  HCP {p.courseHandicap}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {course.map((hole) => (
            <tr
              key={hole.hole}
              className={`border-b border-white/5 ${
                hole.hole === 9 ? "border-b-white/20" : ""
              }`}
            >
              <td className="sticky left-0 bg-[#062416]/95 px-3 py-2 font-medium tabular-nums">
                {hole.hole}
              </td>
              <td className="px-2 py-2 tabular-nums text-[var(--foam)]/70">
                {hole.par}
              </td>
              <td className="px-2 py-2 tabular-nums text-[var(--foam)]/70">
                {hole.strokeIndex}
              </td>
              {players.map((p) => {
                const gross = grossOf(state, p.id, hole.hole);
                const standing = buildPlayerStanding(p, state.course, state.scores);
                const pts = standing.holePoints[hole.hole - 1];
                return (
                  <td key={p.id} className="px-2 py-1.5">
                    {editable ? (
                      <input
                        className="field field-strong"
                        inputMode="numeric"
                        value={gross ?? ""}
                        onChange={(e) => {
                          const v = e.target.value.trim();
                          if (!onChangeGross) return;
                          if (v === "") onChangeGross(p.id, hole.hole, null);
                          else {
                            const n = Number(v);
                            if (Number.isFinite(n)) {
                              onChangeGross(
                                p.id,
                                hole.hole,
                                Math.min(20, Math.max(1, Math.round(n))),
                              );
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="tabular-nums text-[var(--foam)]">
                          {gross ?? "—"}
                        </span>
                        {pts != null && (
                          <span className="text-[10px] text-[var(--lime)]">
                            {pts}p
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t border-white/15">
            <td className="sticky left-0 bg-[#062416]/95 px-3 py-3 font-medium">
              Pts
            </td>
            <td colSpan={2} />
            {players.map((p) => {
              const standing = buildPlayerStanding(p, state.course, state.scores);
              return (
                <td
                  key={p.id}
                  className="px-2 py-3 font-semibold tabular-nums text-[var(--lime)]"
                >
                  {standing.totalPoints}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
