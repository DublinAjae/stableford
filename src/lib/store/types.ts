import type { CourseHole, Player, RoundState, Score } from "@/lib/types";

export type UpsertPlayerInput = {
  id?: string;
  name: string;
  courseHandicap: number;
  groupCode: string;
  sortOrder: number;
};

export type RoundStore = {
  listRounds(): Promise<{ slug: string; name: string; updatedAt: string }[]>;
  getRound(slug: string): Promise<RoundState | null>;
  createRound(input: {
    slug: string;
    name: string;
    course?: CourseHole[];
  }): Promise<RoundState>;
  updateRoundMeta(
    slug: string,
    patch: { name?: string },
  ): Promise<RoundState | null>;
  setCourse(slug: string, course: CourseHole[]): Promise<RoundState | null>;
  setPlayers(
    slug: string,
    players: UpsertPlayerInput[],
  ): Promise<RoundState | null>;
  upsertScore(
    slug: string,
    playerId: string,
    hole: number,
    gross: number | null,
  ): Promise<RoundState | null>;
  upsertScores(
    slug: string,
    scores: Score[],
  ): Promise<RoundState | null>;
};
