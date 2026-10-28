export type HoleData = {
  hole: number;
  par: number | null;
  strokeIndex: number | null;
  gross: number | null;
};

export type HoleResult = HoleData & {
  strokes: number;
  net: number | null;
  points: number | null;
};

export type RoundSummary = {
  holes: HoleResult[];
  totalPoints: number;
  holesPlayed: number;
  outPoints: number;
  inPoints: number;
};

export type CourseHole = {
  hole: number;
  par: number;
  strokeIndex: number;
};

export type Player = {
  id: string;
  name: string;
  courseHandicap: number;
  groupCode: string;
  sortOrder: number;
};

export type Score = {
  playerId: string;
  hole: number;
  gross: number | null;
};

export type RoundMeta = {
  id: string;
  slug: string;
  name: string;
  updatedAt: string;
};

export type RoundState = {
  round: RoundMeta;
  course: CourseHole[];
  players: Player[];
  scores: Score[];
};

export type PlayerStanding = {
  player: Player;
  totalPoints: number;
  holesPlayed: number;
  outPoints: number;
  inPoints: number;
  holePoints: (number | null)[];
  rank: number;
};
