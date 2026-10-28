import type { HoleData, HoleResult, RoundSummary } from "./types";

/** Strokes received on a hole for a given course handicap and stroke index (1–18). */
export function strokesReceived(
  courseHandicap: number,
  strokeIndex: number,
): number {
  const si = Math.min(18, Math.max(1, Math.round(strokeIndex)));

  if (courseHandicap >= 0) {
    const full = Math.floor(courseHandicap / 18);
    const rem = courseHandicap % 18;
    return full + (si <= rem ? 1 : 0);
  }

  const plus = Math.abs(courseHandicap);
  const full = Math.floor(plus / 18);
  const rem = plus % 18;
  // Plus handicap: strokes given back on easiest holes (highest SI first).
  return -(full + (si > 18 - rem ? 1 : 0));
}

/** Standard Stableford: 2 + (par − net), floored at 0. */
export function stablefordPoints(
  par: number,
  gross: number,
  strokes: number,
): number {
  const net = gross - strokes;
  return Math.max(0, 2 + (par - net));
}

export function scoreHole(
  hole: HoleData,
  courseHandicap: number,
): HoleResult {
  const hasSi = hole.strokeIndex != null && hole.strokeIndex > 0;
  const strokes = hasSi
    ? strokesReceived(courseHandicap, hole.strokeIndex!)
    : 0;

  if (hole.par == null || hole.gross == null) {
    return { ...hole, strokes, net: null, points: null };
  }

  const net = hole.gross - strokes;
  const points = stablefordPoints(hole.par, hole.gross, strokes);
  return { ...hole, strokes, net, points };
}

export function scoreRound(
  holes: HoleData[],
  courseHandicap: number,
): RoundSummary {
  const scored = holes.map((h) => scoreHole(h, courseHandicap));
  const withPoints = scored.filter((h) => h.points != null);
  const totalPoints = withPoints.reduce((sum, h) => sum + (h.points ?? 0), 0);
  const outPoints = scored
    .slice(0, 9)
    .reduce((sum, h) => sum + (h.points ?? 0), 0);
  const inPoints = scored
    .slice(9, 18)
    .reduce((sum, h) => sum + (h.points ?? 0), 0);

  return {
    holes: scored,
    totalPoints,
    holesPlayed: withPoints.length,
    outPoints,
    inPoints,
  };
}

export function emptyRound(holeCount: 9 | 18 = 18): HoleData[] {
  return Array.from({ length: holeCount }, (_, i) => ({
    hole: i + 1,
    par: 4,
    strokeIndex: i + 1,
    gross: null,
  }));
}
