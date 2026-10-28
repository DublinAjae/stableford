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

export type CatalogShape = {
  courses: GolfCourse[];
  members: Member[];
};

export type DbShape = {
  version: 3;
  courses: GolfCourse[];
  members: Member[];
  rounds: RoundState[];
};

export function emptyDb(): DbShape {
  return { version: 3, courses: [], members: [], rounds: [] };
}

export function emptyCatalog(): CatalogShape {
  return { courses: [], members: [] };
}

function migrate(raw: unknown): DbShape {
  if (!raw || typeof raw !== "object") return emptyDb();
  const obj = raw as {
    courses?: GolfCourse[];
    members?: Member[];
    rounds?: RoundState[];
  };
  return {
    version: 3,
    courses: Array.isArray(obj.courses) ? obj.courses : [],
    members: Array.isArray(obj.members) ? obj.members : [],
    rounds: (Array.isArray(obj.rounds) ? obj.rounds : []).map(normalizeRound),
  };
}

function migrateCatalog(raw: unknown): CatalogShape {
  if (!raw || typeof raw !== "object") return emptyCatalog();
  const obj = raw as { courses?: GolfCourse[]; members?: Member[] };
  return {
    courses: Array.isArray(obj.courses) ? obj.courses : [],
    members: Array.isArray(obj.members) ? obj.members : [],
  };
}

function migrateRounds(raw: unknown): RoundState[] {
  if (Array.isArray(raw)) return raw.map(normalizeRound);
  if (raw && typeof raw === "object" && Array.isArray((raw as DbShape).rounds)) {
    return ((raw as DbShape).rounds || []).map(normalizeRound);
  }
  return [];
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
      date:
        meta.date ||
        meta.updatedAt?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
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

export type StoreIO = {
  /** Full legacy read (used once for migration). */
  readAll?: () => Promise<unknown>;
  readCatalog: () => Promise<unknown>;
  writeCatalog: (catalog: CatalogShape) => Promise<void>;
  readRounds: () => Promise<unknown>;
  writeRounds: (rounds: RoundState[]) => Promise<void>;
};

export function createJsonStore(io: StoreIO): RoundStore {
  let migrated = false;

  async function ensureMigrated(): Promise<void> {
    if (migrated || !io.readAll) {
      migrated = true;
      return;
    }
    migrated = true;
    try {
      const catalog = migrateCatalog(await io.readCatalog());
      const rounds = migrateRounds(await io.readRounds());
      if (
        catalog.courses.length ||
        catalog.members.length ||
        rounds.length
      ) {
        return;
      }

      const legacy = migrate(await io.readAll());
      if (
        legacy.courses.length ||
        legacy.members.length ||
        legacy.rounds.length
      ) {
        await io.writeCatalog({
          courses: legacy.courses,
          members: legacy.members,
        });
        await io.writeRounds(legacy.rounds);
      }
    } catch {
      // ignore migration errors; fresh stores start empty
    }
  }

  async function loadCatalog(): Promise<CatalogShape> {
    await ensureMigrated();
    return migrateCatalog(await io.readCatalog());
  }

  async function loadRounds(): Promise<RoundState[]> {
    await ensureMigrated();
    return migrateRounds(await io.readRounds());
  }

  return {
    async listRounds() {
      const rounds = await loadRounds();
      return rounds.map(listItem).sort((a, b) => {
        if (b.date !== a.date) return b.date.localeCompare(a.date);
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    },

    async getRound(slug) {
      const rounds = await loadRounds();
      return rounds.find((r) => r.round.slug === slug) ?? null;
    },

    async createRound(input: CreateRoundInput) {
      const [catalog, rounds] = await Promise.all([
        loadCatalog(),
        loadRounds(),
      ]);
      if (rounds.some((r) => r.round.slug === input.slug)) {
        throw new Error("슬러그가 이미 존재합니다.");
      }

      let holes: CourseHole[] = input.course ?? defaultCourse();
      let courseName = input.courseName || "Course";
      let teeColor: TeeColor = input.teeColor || "white";
      let lengthMeters = input.lengthMeters ?? null;
      let courseId = input.courseId ?? null;

      if (courseId) {
        const found = catalog.courses.find((c) => c.id === courseId);
        if (!found) throw new Error("선택한 코스를 찾을 수 없습니다.");
        holes = found.holes;
        courseName = found.name;
        teeColor = found.teeColor;
        lengthMeters = found.lengthMeters;
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
      await io.writeRounds([...rounds, state]);
      return state;
    },

    async updateRoundMeta(slug, patch) {
      const rounds = await loadRounds();
      const idx = rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = rounds[idx];
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
      const copy = [...rounds];
      copy[idx] = next;
      await io.writeRounds(copy);
      return next;
    },

    async setCourse(slug, course) {
      const rounds = await loadRounds();
      const idx = rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const next = touch({ ...rounds[idx], course });
      const copy = [...rounds];
      copy[idx] = next;
      await io.writeRounds(copy);
      return next;
    },

    async applyCatalogCourse(slug, courseId) {
      const [catalog, rounds] = await Promise.all([
        loadCatalog(),
        loadRounds(),
      ]);
      const idx = rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const found = catalog.courses.find((c) => c.id === courseId);
      if (!found) throw new Error("코스를 찾을 수 없습니다.");
      const prev = rounds[idx];
      const next = touch({
        ...prev,
        course: found.holes,
        round: {
          ...prev.round,
          courseId: found.id,
          courseName: found.name,
          teeColor: found.teeColor,
          lengthMeters: found.lengthMeters,
        },
      });
      const copy = [...rounds];
      copy[idx] = next;
      await io.writeRounds(copy);
      return next;
    },

    async setPlayers(slug, playersInput: UpsertPlayerInput[]) {
      const rounds = await loadRounds();
      const idx = rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = rounds[idx];
      const players: Player[] = playersInput.map((p, i) => ({
        id:
          p.id && prev.players.some((x) => x.id === p.id)
            ? p.id
            : randomUUID(),
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
      const copy = [...rounds];
      copy[idx] = next;
      await io.writeRounds(copy);
      return next;
    },

    async upsertScore(slug, playerId, hole, gross) {
      return this.upsertScores(slug, [{ playerId, hole, gross }]);
    },

    async upsertScores(slug, incoming) {
      const rounds = await loadRounds();
      const idx = rounds.findIndex((r) => r.round.slug === slug);
      if (idx < 0) return null;
      const prev = rounds[idx];
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
      const copy = [...rounds];
      copy[idx] = next;
      await io.writeRounds(copy);
      return next;
    },

    async listCourses() {
      const catalog = await loadCatalog();
      return catalog.courses.slice().sort((a, b) => a.name.localeCompare(b.name));
    },

    async getCourse(id) {
      const catalog = await loadCatalog();
      return catalog.courses.find((c) => c.id === id) ?? null;
    },

    async upsertCourse(input: UpsertGolfCourseInput) {
      const catalog = await loadCatalog();
      const now = new Date().toISOString();
      const holes = normalizeHoles(input.holes, input.holeCount);
      if (input.id) {
        const idx = catalog.courses.findIndex((c) => c.id === input.id);
        if (idx >= 0) {
          const next: GolfCourse = {
            ...catalog.courses[idx],
            name: input.name.trim(),
            lengthMeters: input.lengthMeters,
            teeColor: input.teeColor,
            holeCount: input.holeCount,
            holes,
            updatedAt: now,
          };
          const courses = [...catalog.courses];
          courses[idx] = next;
          await io.writeCatalog({ ...catalog, courses });
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
      await io.writeCatalog({
        ...catalog,
        courses: [...catalog.courses, created],
      });
      return created;
    },

    async deleteCourse(id) {
      const catalog = await loadCatalog();
      await io.writeCatalog({
        ...catalog,
        courses: catalog.courses.filter((c) => c.id !== id),
      });
    },

    async listMembers() {
      const catalog = await loadCatalog();
      return catalog.members.slice().sort((a, b) => a.name.localeCompare(b.name));
    },

    async getMember(id) {
      const catalog = await loadCatalog();
      return catalog.members.find((m) => m.id === id) ?? null;
    },

    async upsertMember(input: UpsertMemberInput) {
      const catalog = await loadCatalog();
      const now = new Date().toISOString();
      const name = input.name.trim() || "Untitled";
      const handicap = Number.isFinite(input.handicap) ? input.handicap : 18;
      if (input.id) {
        const idx = catalog.members.findIndex((m) => m.id === input.id);
        if (idx >= 0) {
          const next: Member = {
            ...catalog.members[idx],
            name,
            handicap,
            updatedAt: now,
          };
          const members = [...catalog.members];
          members[idx] = next;
          await io.writeCatalog({ ...catalog, members });
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
      await io.writeCatalog({
        ...catalog,
        members: [...catalog.members, created],
      });
      return created;
    },

    async deleteMember(id) {
      const catalog = await loadCatalog();
      await io.writeCatalog({
        ...catalog,
        members: catalog.members.filter((m) => m.id !== id),
      });
    },
  };
}
