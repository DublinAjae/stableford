import { randomUUID } from "crypto";
import { emptyHoles, normalizeHoles } from "@/lib/courses";
import { defaultCourse } from "@/lib/ranking";
import type {
  CourseHole,
  GolfCourse,
  Member,
  Player,
  RoundListItem,
  RoundState,
  Score,
  TeeColor,
} from "@/lib/types";
import type {
  CreateRoundInput,
  RoundStore,
  UpsertGolfCourseInput,
  UpsertMemberInput,
  UpsertPlayerInput,
} from "./types";

export type DbShape = {
  version: 3;
  courses: GolfCourse[];
  members: Member[];
  rounds: RoundState[];
};

export function emptyDb(): DbShape {
  return { version: 3, courses: [], members: [], rounds: [] };
}

function migrate(raw: unknown): DbShape {
  if (!raw || typeof raw !== "object") return emptyDb();
  const obj = raw as {
    version?: number;
    courses?: GolfCourse[];
    members?: Member[];
    rounds?: RoundState[];
  };
  const courses = Array.isArray(obj.courses) ? obj.courses : [];
  const members = Array.isArray(obj.members) ? obj.members : [];
  const rounds = (Array.isArray(obj.rounds) ? obj.rounds : []).map((r) =>
    normalizeRound(r),
  );
  return { version: 3, courses, members, rounds };
}

function normalizeRound(r: RoundState): RoundState {
  const meta = r.round as RoundState["round"] & {
    date?: string;
    courseId?: string | null;
    courseName?: string;
    teeColor?: TeeColor;
    lengthMeters?: number | null;
  };
  return {
    ...r,
    round: {
      id: meta.id,
      slug: meta.slug,
      name: meta.name,
      date: meta.date || meta.updatedAt?.slice(0, 10) || new Date().toISOString().slice(0, 10),
      courseId: meta.courseId ?? null,
      courseName: meta.courseName || "Course",
      teeColor: meta.teeColor || "white",
      lengthMeters: meta.lengthMeters ?? null,
      updatedAt: meta.updatedAt,
    },
    course: r.course?.length ? r.course : defaultCourse(),
    players: (r.players || []).map((p) => ({
      ...p,
      memberId: p.memberId ?? null,
    })),
    scores: r.scores || [],
  };
}

function touch(state: RoundState): RoundState {
  return {
    ...state,
    round: { ...state.round, updatedAt: new Date().toISOString() },
  };
}

function listItem(r: RoundState): RoundListItem {
  return {
    slug: r.round.slug,
    name: r.round.name,
    date: r.round.date,
    courseName: r.round.courseName,
    teeColor: r.round.teeColor,
    updatedAt: r.round.updatedAt,
  };
}

export function createJsonStore(io: {
  read: () => Promise<unknown>;
  write: (db: DbShape) => Promise<void>;
}): RoundStore {
  async function load(): Promise<DbShape> {
    return migrate(await io.read());
  }

  async function save(db: DbShape): Promise<void> {
    await io.write(db);
  }

  return {
    async listRounds() {
      const db = await load();
      return db.rounds.map(listItem).sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    },

    async getRound(slug) {
      const db = await load();
      return db.rounds.find((r) => r.round.slug === slug) ?? null;
    },

    async createRound(input: CreateRoundInput) {
      const db = await load();
      if (db.rounds.some((r) => r.round.slug === input.slug)) {
        throw new Error("슬러그가 이미 존재합니다.");
      }

      let holes: CourseHole[] = input.course ?? defaultCourse();
      let courseName = input.courseName || "Course";
      let teeColor: TeeColor = input.teeColor || "white";
      let lengthMeters = input.lengthMeters ?? null;
      let courseId = input.courseId ?? null;

      if (courseId) {
        const catalog = db.courses.find((c) => c.id === courseId);
        if (!catalog) throw new Error("선택한 코스를 찾을 수 없습니다.");
        holes = catalog.holes;
        courseName = catalog.name;
        teeColor = catalog.teeColor;
        lengthMeters = catalog.lengthMeters;
      }

      const now = new Date().toISOString();
      const state: RoundState = {
        round: {
          id: randomUUID(),
          slug: input.slug,
          name: input.name,
          date: input.date,
          courseId,
          courseName,
          teeColor,
          lengthMeters,
          updatedAt: now,
        },
        course: holes,
        players: [],
        scores: [],
      };
      db.rounds.push(state);
      await save(db);
      return state;
    },

    async updateRoundMeta(slug, patch) {
      const db = await load();
      const idx = db.rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = db.rounds[idx];
      const next = touch({
        ...prev,
        round: {
          ...prev.round,
          name: patch.name ?? prev.round.name,
          date: patch.date ?? prev.round.date,
          courseId:
            patch.courseId !== undefined ? patch.courseId : prev.round.courseId,
          courseName: patch.courseName ?? prev.round.courseName,
          teeColor: patch.teeColor ?? prev.round.teeColor,
          lengthMeters:
            patch.lengthMeters !== undefined
              ? patch.lengthMeters
              : prev.round.lengthMeters,
        },
      });
      db.rounds[idx] = next;
      await save(db);
      return next;
    },

    async setCourse(slug, course) {
      const db = await load();
      const idx = db.rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const next = touch({ ...db.rounds[idx], course });
      db.rounds[idx] = next;
      await save(db);
      return next;
    },

    async applyCatalogCourse(slug, courseId) {
      const db = await load();
      const idx = db.rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const catalog = db.courses.find((c) => c.id === courseId);
      if (!catalog) throw new Error("코스를 찾을 수 없습니다.");
      const prev = db.rounds[idx];
      const next = touch({
        ...prev,
        course: catalog.holes,
        round: {
          ...prev.round,
          courseId: catalog.id,
          courseName: catalog.name,
          teeColor: catalog.teeColor,
          lengthMeters: catalog.lengthMeters,
        },
      });
      db.rounds[idx] = next;
      await save(db);
      return next;
    },

    async setPlayers(slug, playersInput: UpsertPlayerInput[]) {
      const db = await load();
      const idx = db.rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = db.rounds[idx];
      const players: Player[] = playersInput.map((p, i) => ({
        id: p.id && prev.players.some((x) => x.id === p.id) ? p.id : randomUUID(),
        memberId: p.memberId ?? null,
        name: p.name.trim() || `Player ${i + 1}`,
        courseHandicap: p.courseHandicap,
        groupCode: (p.groupCode || "A").toUpperCase(),
        sortOrder: p.sortOrder ?? i,
      }));
      const keep = new Set(players.map((p) => p.id));
      const scores = prev.scores.filter((s) => keep.has(s.playerId));
      const scoreMap = new Map<string, Score>(
        scores.map((s) => [`${s.playerId}:${s.hole}`, s]),
      );
      for (const player of players) {
        for (const hole of prev.course) {
          const key = `${player.id}:${hole.hole}`;
          if (!scoreMap.has(key)) {
            scoreMap.set(key, {
              playerId: player.id,
              hole: hole.hole,
              gross: null,
            });
          }
        }
      }
      const next = touch({
        ...prev,
        players,
        scores: [...scoreMap.values()],
      });
      db.rounds[idx] = next;
      await save(db);
      return next;
    },

    async upsertScore(slug, playerId, hole, gross) {
      return this.upsertScores(slug, [{ playerId, hole, gross }]);
    },

    async upsertScores(slug, incoming) {
      const db = await load();
      const idx = db.rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = db.rounds[idx];
      const map = new Map<string, Score>(
        prev.scores.map((s) => [`${s.playerId}:${s.hole}`, s]),
      );
      for (const s of incoming) {
        map.set(`${s.playerId}:${s.hole}`, {
          playerId: s.playerId,
          hole: s.hole,
          gross: s.gross,
        });
      }
      const next = touch({ ...prev, scores: [...map.values()] });
      db.rounds[idx] = next;
      await save(db);
      return next;
    },

    async listCourses() {
      const db = await load();
      return db.courses
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    },

    async getCourse(id) {
      const db = await load();
      return db.courses.find((c) => c.id === id) ?? null;
    },

    async upsertCourse(input: UpsertGolfCourseInput) {
      const db = await load();
      const now = new Date().toISOString();
      const holes = normalizeHoles(input.holes, input.holeCount);
      if (input.id) {
        const idx = db.courses.findIndex((c) => c.id === input.id);
        if (idx >= 0) {
          const next: GolfCourse = {
            ...db.courses[idx],
            name: input.name.trim(),
            lengthMeters: input.lengthMeters,
            teeColor: input.teeColor,
            holeCount: input.holeCount,
            holes,
            updatedAt: now,
          };
          db.courses[idx] = next;
          await save(db);
          return next;
        }
      }
      const created: GolfCourse = {
        id: randomUUID(),
        name: input.name.trim() || "Untitled course",
        lengthMeters: input.lengthMeters,
        teeColor: input.teeColor,
        holeCount: input.holeCount,
        holes: holes.length ? holes : emptyHoles(input.holeCount),
        createdAt: now,
        updatedAt: now,
      };
      db.courses.push(created);
      await save(db);
      return created;
    },

    async deleteCourse(id) {
      const db = await load();
      db.courses = db.courses.filter((c) => c.id !== id);
      await save(db);
    },

    async listMembers() {
      const db = await load();
      return db.members.slice().sort((a, b) => a.name.localeCompare(b.name));
    },

    async getMember(id) {
      const db = await load();
      return db.members.find((m) => m.id === id) ?? null;
    },

    async upsertMember(input: UpsertMemberInput) {
      const db = await load();
      const now = new Date().toISOString();
      const name = input.name.trim() || "Untitled";
      const handicap = Number.isFinite(input.handicap) ? input.handicap : 18;
      if (input.id) {
        const idx = db.members.findIndex((m) => m.id === input.id);
        if (idx >= 0) {
          const next: Member = {
            ...db.members[idx],
            name,
            handicap,
            updatedAt: now,
          };
          db.members[idx] = next;
          await save(db);
          return next;
        }
      }
      const created: Member = {
        id: randomUUID(),
        name,
        handicap,
        createdAt: now,
        updatedAt: now,
      };
      db.members.push(created);
      await save(db);
      return created;
    },

    async deleteMember(id) {
      const db = await load();
      db.members = db.members.filter((m) => m.id !== id);
      await save(db);
    },
  };
}
