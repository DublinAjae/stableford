import { scoreRound } from "./stableford";
import type {
  CourseHole,
  Player,
  PlayerStanding,
  RoundState,
  Score,
} from "./types";

export function buildPlayerStanding(
  player: Player,
  course: CourseHole[],
  scores: Score[],
): Omit<PlayerStanding, "rank"> {
  const byHole = new Map(
    scores
      .filter((s) => s.playerId === player.id)
      .map((s) => [s.hole, s.gross]),
  );

  const holes = course
    .slice()
    .sort((a, b) => a.hole - b.hole)
    .map((c) => ({
      hole: c.hole,
      par: c.par,
      strokeIndex: c.strokeIndex,
      gross: byHole.get(c.hole) ?? null,
    }));

  const summary = scoreRound(holes, player.courseHandicap);

  return {
    player,
    totalPoints: summary.totalPoints,
    holesPlayed: summary.holesPlayed,
    outPoints: summary.outPoints,
    inPoints: summary.inPoints,
    holePoints: summary.holes.map((h) => h.points),
  };
}

export function rankPlayers(state: RoundState): PlayerStanding[] {
  const rows = state.players
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((player) => buildPlayerStanding(player, state.course, state.scores));

  rows.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.holesPlayed !== a.holesPlayed) return b.holesPlayed - a.holesPlayed;
    return a.player.name.localeCompare(b.player.name);
  });

  let lastPoints = Number.NaN;
  let lastRank = 0;
  return rows.map((row, index) => {
    if (row.totalPoints !== lastPoints) {
      lastRank = index + 1;
      lastPoints = row.totalPoints;
    }
    return { ...row, rank: lastRank };
  });
}

export function defaultCourse(): CourseHole[] {
  return Array.from({ length: 18 }, (_, i) => ({
    hole: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

export function groupCodes(players: Player[]): string[] {
  return [...new Set(players.map((p) => p.groupCode))].sort();
}
