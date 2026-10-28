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
