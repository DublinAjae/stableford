import { rankPlayers } from "@/lib/ranking";
import type {
  HandicapEntry,
  Member,
  MemberAward,
  RoundState,
} from "@/lib/types";

export function normalizeMember(raw: Partial<Member> & { id: string }): Member {
  const handicap = Number.isFinite(raw.handicap) ? Number(raw.handicap) : 18;
  const createdAt = raw.createdAt || new Date().toISOString();
  const history = Array.isArray(raw.handicapHistory)
    ? raw.handicapHistory
    : [];
  const seeded: HandicapEntry[] =
    history.length > 0
      ? history
      : [{ at: createdAt, handicap, source: "manual" }];
  return {
    id: raw.id,
    name: raw.name || "Untitled",
    handicap,
    notes: typeof raw.notes === "string" ? raw.notes : "",
    handicapHistory: seeded,
    createdAt,
    updatedAt: raw.updatedAt || createdAt,
  };
}

export function appendHandicapHistory(
  member: Member,
  handicap: number,
  at: string,
  source: HandicapEntry["source"] = "manual",
  meta?: { roundSlug?: string; roundName?: string },
): HandicapEntry[] {
  const prev = member.handicapHistory || [];
  const last = prev[prev.length - 1];
  if (last && last.handicap === handicap) return prev;
  return [
    ...prev,
    {
      at,
      handicap,
      source,
      roundSlug: meta?.roundSlug,
      roundName: meta?.roundName,
    },
  ];
}

export function awardsForMembers(
  members: Member[],
  rounds: RoundState[],
): Map<string, MemberAward[]> {
  const byMember = new Map<string, MemberAward[]>();
  for (const m of members) byMember.set(m.id, []);

  const sorted = rounds
    .slice()
    .sort((a, b) => b.round.date.localeCompare(a.round.date));

  for (const state of sorted) {
    if (!state.players.some((p) => p.memberId)) continue;
    const standings = rankPlayers(state);
    for (const row of standings) {
      if (!row.player.memberId) continue;
      if (row.rank > 3) continue;
      if (row.holesPlayed === 0) continue;
      const list = byMember.get(row.player.memberId);
      if (!list) continue;
      list.push({
        roundSlug: state.round.slug,
        roundName: state.round.name,
        date: state.round.date,
        rank: row.rank as 1 | 2 | 3,
        points: row.totalPoints,
      });
    }
  }
  return byMember;
}

export function awardLabel(rank: 1 | 2 | 3): string {
  if (rank === 1) return "우승";
  if (rank === 2) return "준우승";
  return "3위";
}
