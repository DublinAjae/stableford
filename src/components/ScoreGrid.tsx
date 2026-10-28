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

function sumGross(
  state: RoundState,
  playerId: string,
  holes: number[],
): number | null {
  let total = 0;
  let any = false;
  for (const hole of holes) {
    const g = grossOf(state, playerId, hole);
    if (g == null) continue;
    any = true;
    total += g;
  }
  return any ? total : null;
}

function parClass(par: number): string {
  if (par === 3) return "par-3 font-semibold";
  if (par === 5) return "par-5 font-semibold";
  return "text-[var(--foam)]/70";
}

function ScoreStepper({
  value,
  par,
  onChange,
}: {
  value: number | null;
  par: number;
  onChange: (n: number | null) => void;
}) {
  const display = value ?? "";
  return (
    <div className="inline-flex items-center gap-1">
      <input
        className="field field-strong"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const v = e.target.value.trim();
          if (v === "") onChange(null);
          else {
            const n = Number(v);
            if (Number.isFinite(n)) {
              onChange(Math.min(20, Math.max(1, Math.round(n))));
            }
          }
        }}
      />
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          className="stepper-btn"
          aria-label="타수 증가"
          onClick={() =>
            onChange(Math.min(20, (value ?? Math.max(1, par - 1)) + 1))
          }
        >
          ▲
        </button>
        <button
          type="button"
          className="stepper-btn"
          aria-label="타수 감소"
          onClick={() => {
            if (value == null) onChange(par);
            else if (value <= 1) onChange(null);
            else onChange(value - 1);
          }}
        >
          ▼
        </button>
      </div>
    </div>
  );
}

function SubtotalRow({
  label,
  parSum,
  players,
  values,
}: {
  label: string;
  parSum: number;
  players: Player[];
  values: { gross: number | null; points: number }[];
}) {
  return (
    <tr className="score-subtotal border-y border-white/20">
      <td className="sticky left-0 bg-[#0a2f1c] px-3 py-2.5 font-semibold">
        {label}
      </td>
      <td className="px-2 py-2.5 font-semibold tabular-nums text-[var(--lime)]">
        {parSum}
      </td>
      <td className="px-2 py-2.5 text-[var(--foam)]/35">—</td>
      {players.map((p, i) => {
        const v = values[i];
        return (
          <td key={p.id} className="px-2 py-2.5">
            <div className="flex items-baseline gap-1">
              <span className="font-semibold tabular-nums text-[var(--foam)]">
                {v?.gross ?? "—"}
              </span>
              <span className="text-[10px] font-semibold text-[var(--lime)]">
                {v?.points ?? 0}p
              </span>
            </div>
          </td>
        );
      })}
    </tr>
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
  const outHoles = course.filter((h) => h.hole <= 9);
  const inHoles = course.filter((h) => h.hole > 9);
  const standings = players.map((p) =>
    buildPlayerStanding(p, state.course, state.scores),
  );

  function holeRows(holes: CourseHole[]) {
    return holes.map((hole) => (
      <tr
        key={hole.hole}
        className={`border-b border-white/5 ${
          hole.hole === 9 || hole.hole === 18 ? "border-b-transparent" : ""
        }`}
      >
        <td className="sticky left-0 bg-[#062416]/95 px-3 py-2 font-medium tabular-nums">
          {hole.hole}
        </td>
        <td className={`px-2 py-2 tabular-nums ${parClass(hole.par)}`}>
          {hole.par}
        </td>
        <td className="px-2 py-2 tabular-nums text-[var(--foam)]/70">
          {hole.strokeIndex}
        </td>
        {players.map((p, pi) => {
          const gross = grossOf(state, p.id, hole.hole);
          const pts = standings[pi]?.holePoints[hole.hole - 1];
          return (
            <td key={p.id} className="px-2 py-1.5">
              {editable ? (
                <ScoreStepper
                  value={gross}
                  par={hole.par}
                  onChange={(n) => onChangeGross?.(p.id, hole.hole, n)}
                />
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="tabular-nums text-[var(--foam)]">
                    {gross ?? "—"}
                  </span>
                  {pts != null && (
                    <span className="text-[10px] text-[var(--lime)]">{pts}p</span>
                  )}
                </div>
              )}
            </td>
          );
        })}
      </tr>
    ));
  }

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
              <th key={p.id} className="px-2 py-3">
                <div className="player-name">{p.name}</div>
                <div className="player-hcp">HCP {p.courseHandicap}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {holeRows(outHoles)}
          {outHoles.length > 0 && (
            <SubtotalRow
              label="Out 소계"
              parSum={outHoles.reduce((s, h) => s + h.par, 0)}
              players={players}
              values={players.map((p, i) => ({
                gross: sumGross(
                  state,
                  p.id,
                  outHoles.map((h) => h.hole),
                ),
                points: standings[i]?.outPoints ?? 0,
              }))}
            />
          )}
          {holeRows(inHoles)}
          {inHoles.length > 0 && (
            <SubtotalRow
              label="In 소계"
              parSum={inHoles.reduce((s, h) => s + h.par, 0)}
              players={players}
              values={players.map((p, i) => ({
                gross: sumGross(
                  state,
                  p.id,
                  inHoles.map((h) => h.hole),
                ),
                points: standings[i]?.inPoints ?? 0,
              }))}
            />
          )}
          <SubtotalRow
            label="총계"
            parSum={course.reduce((s, h) => s + h.par, 0)}
            players={players}
            values={players.map((p, i) => ({
              gross: sumGross(
                state,
                p.id,
                course.map((h) => h.hole),
              ),
              points: standings[i]?.totalPoints ?? 0,
            }))}
          />
        </tbody>
      </table>
    </div>
  );
}
