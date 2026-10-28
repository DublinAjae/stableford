import type {
  CourseHole,
  GolfCourse,
  Member,
  RoundListItem,
  RoundState,
  Score,
  TeeColor,
} from "@/lib/types";

export type UpsertPlayerInput = {
  id?: string;
  memberId?: string | null;
  name: string;
  courseHandicap: number;
  groupCode: string;
  sortOrder: number;
};

export type UpsertMemberInput = {
  id?: string;
  name: string;
  handicap: number;
};

export type CreateRoundInput = {
  slug: string;
  name: string;
  date: string;
  courseId?: string | null;
  course?: CourseHole[];
  courseName?: string;
  teeColor?: TeeColor;
  lengthMeters?: number | null;
};

export type UpsertGolfCourseInput = {
  id?: string;
  name: string;
  lengthMeters: number | null;
  teeColor: TeeColor;
  holeCount: 9 | 18;
  holes: CourseHole[];
};

export type RoundStore = {
  listRounds(): Promise<RoundListItem[]>;
  getRound(slug: string): Promise<RoundState | null>;
  createRound(input: CreateRoundInput): Promise<RoundState>;
  updateRoundMeta(
    slug: string,
    patch: Partial<{
      name: string;
      date: string;
      courseId: string | null;
      courseName: string;
      teeColor: TeeColor;
      lengthMeters: number | null;
    }>,
  ): Promise<RoundState | null>;
  setCourse(slug: string, course: CourseHole[]): Promise<RoundState | null>;
  applyCatalogCourse(
    slug: string,
    courseId: string,
  ): Promise<RoundState | null>;
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
  upsertScores(slug: string, scores: Score[]): Promise<RoundState | null>;

  listCourses(): Promise<GolfCourse[]>;
  getCourse(id: string): Promise<GolfCourse | null>;
  upsertCourse(input: UpsertGolfCourseInput): Promise<GolfCourse>;
  deleteCourse(id: string): Promise<void>;

  listMembers(): Promise<Member[]>;
  getMember(id: string): Promise<Member | null>;
  upsertMember(input: UpsertMemberInput): Promise<Member>;
  deleteMember(id: string): Promise<void>;
};
