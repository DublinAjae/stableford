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

export const TEE_COLORS = [
  "white",
  "yellow",
  "blue",
  "red",
  "black",
  "gold",
  "green",
  "orange",
] as const;

export type TeeColor = (typeof TEE_COLORS)[number];

export type GolfCourse = {
  id: string;
  name: string;
  /** Total course length (meters). */
  lengthMeters: number | null;
  teeColor: TeeColor;
  holeCount: 9 | 18;
  holes: CourseHole[];
  createdAt: string;
  updatedAt: string;
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
  /** Tournament / event name */
  name: string;
  /** YYYY-MM-DD */
  date: string;
  courseId: string | null;
  courseName: string;
  teeColor: TeeColor;
  lengthMeters: number | null;
  updatedAt: string;
};

export type RoundState = {
  round: RoundMeta;
  course: CourseHole[];
  players: Player[];
  scores: Score[];
};

export type RoundListItem = {
  slug: string;
  name: string;
  date: string;
  courseName: string;
  teeColor: TeeColor;
  updatedAt: string;
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
