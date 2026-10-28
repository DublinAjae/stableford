"use client";

import { useState } from "react";
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
  large = false,
}: {
  value: number | null;
  par: number;
  onChange: (n: number | null) => void;
  large?: boolean;
}) {
  const display = value ?? "";
  return (
    <div className="inline-flex items-center gap-1.5">
      <input
        className={`field field-strong ${large ? "field-lg" : ""}`}
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
          className={`stepper-btn ${large ? "stepper-btn-lg" : ""}`}
          aria-label="타수 증가"
          onClick={() =>
            onChange(Math.min(20, (value ?? Math.max(1, par - 1)) + 1))
          }
        >
          ▲
        </button>
        <button
          type="button"
          className={`stepper-btn ${large ? "stepper-btn-lg" : ""}`}
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
      <td className="sticky left-0 bg-[#0a2f1c] px-2 py-3 text-sm font-bold tracking-tight sm:px-3 sm:text-lg">
        {label}
      </td>
      <td className="px-2 py-3 text-sm font-bold tabular-nums text-[var(--lime)] sm:text-lg">
        {parSum}
      </td>
      <td className="px-2 py-3 text-[var(--foam)]/35">—</td>
      {players.map((p, i) => {
        const v = values[i];
        return (
          <td key={p.id} className="px-2 py-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold tabular-nums text-[var(--foam)] sm:text-lg">
                {v?.gross ?? "—"}
              </span>
              <span className="text-[10px] font-bold text-[var(--lime)] sm:text-sm">
                {v?.points ?? 0}p
              </span>
            </div>
          </td>
        );
      })}
    </tr>
  );
}

function MobilePlayerSheet({
  state,
  player,
  course,
  editable,
  onChangeGross,
}: {
  state: RoundState;
  player: Player;
  course: CourseHole[];
  editable: boolean;
  onChangeGross?: (playerId: string, hole: number, gross: number | null) => void;
}) {
  const standing = buildPlayerStanding(player, state.course, state.scores);
  const outHoles = course.filter((h) => h.hole <= 9);
  const inHoles = course.filter((h) => h.hole > 9);

  function section(label: string, holes: CourseHole[], points: number) {
    const gross = sumGross(
      state,
      player.id,
      holes.map((h) => h.hole),
    );
    const parSum = holes.reduce((s, h) => s + h.par, 0);
    return (
      <>
        {holes.map((hole) => {
          const g = grossOf(state, player.id, hole.hole);
          const pts = standing.holePoints[hole.hole - 1];
          return (
            <div
              key={hole.hole}
              className="flex items-center justify-between gap-3 border-b border-white/5 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums text-[var(--foam)]">
                  {hole.hole}홀
                </p>
                <p className="text-xs text-[var(--foam)]/45">
                  <span className={parClass(hole.par)}>Par {hole.par}</span>
                  {" · "}SI {hole.strokeIndex}
                  {pts != null ? ` · ${pts}p` : ""}
                </p>
              </div>
              {editable ? (
                <ScoreStepper
                  large
                  value={g}
                  par={hole.par}
                  onChange={(n) => onChangeGross?.(player.id, hole.hole, n)}
                />
              ) : (
                <span className="text-lg font-bold tabular-nums text-[var(--foam)]">
                  {g ?? "—"}
                </span>
              )}
            </div>
          );
        })}
        <div className="score-subtotal-mobile my-2 flex items-center justify-between rounded-sm px-3 py-3">
          <span className="text-base font-bold text-[var(--foam)]">{label}</span>
          <span className="text-sm text-[var(--foam)]/50">Par {parSum}</span>
          <span className="font-bold tabular-nums text-[var(--foam)]">
            {gross ?? "—"}
          </span>
          <span className="font-bold tabular-nums text-[var(--lime)]">
            {points}p
          </span>
        </div>
      </>
    );
  }

  return (
    <div className="rounded-sm border border-white/10 bg-black/25 p-3">
      <div className="mb-2 flex items-end justify-between gap-2">
        <div>
          <p className="player-name text-lg">{player.name}</p>
          <p className="player-hcp">
            HCP {player.courseHandicap} · {player.groupCode}조
          </p>
        </div>
        <p className="font-display text-3xl tabular-nums text-[var(--lime)]">
          {standing.totalPoints}
        </p>
      </div>
      {section("Out 소계", outHoles, standing.outPoints)}
      {inHoles.length > 0 && section("In 소계", inHoles, standing.inPoints)}
      <div className="score-subtotal-mobile flex items-center justify-between rounded-sm px-3 py-3">
        <span className="text-lg font-bold text-[var(--foam)]">총계</span>
        <span className="font-bold tabular-nums text-[var(--foam)]">
          {sumGross(
            state,
            player.id,
            course.map((h) => h.hole),
          ) ?? "—"}
        </span>
        <span className="text-lg font-bold tabular-nums text-[var(--lime)]">
          {standing.totalPoints}p
        </span>
      </div>
    </div>
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
  const [mobilePlayerId, setMobilePlayerId] = useState(players[0]?.id || "");
  const activeId =
    players.some((p) => p.id === mobilePlayerId) && mobilePlayerId
      ? mobilePlayerId
      : players[0]?.id || "";
  const activePlayer = players.find((p) => p.id === activeId) || players[0];

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
    <>
      {/* Mobile: one player at a time, vertical holes — easy thumbs */}
      <div className="space-y-3 md:hidden">
        {players.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {players.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMobilePlayerId(p.id)}
                className={`shrink-0 rounded-sm px-3 py-2 text-sm font-semibold ${
                  p.id === activeId
                    ? "bg-[var(--lime)] text-[var(--ink)]"
                    : "border border-white/15 text-[var(--foam)]"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        )}
        {activePlayer && (
          <MobilePlayerSheet
            state={state}
            player={activePlayer}
            course={course}
            editable={editable}
            onChangeGross={onChangeGross}
          />
        )}
      </div>

      {/* Desktop / tablet table */}
      <div className="hidden md:block">
        <p className="mb-2 text-xs text-[var(--foam)]/40">
          표가 넓으면 좌우로 스크롤하세요.
        </p>
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
      </div>
    </>
  );
}
