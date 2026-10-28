import { randomUUID } from "crypto";
import {
  assertUniqueStrokeIndexes,
  emptyHoles,
  normalizeHoles,
} from "@/lib/courses";
import { appendHandicapHistory, normalizeMember } from "@/lib/members";
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

export type VersionedRead = {
  data: unknown;
  etag: string | null;
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
    members: (Array.isArray(obj.members) ? obj.members : []).map((m) =>
      normalizeMember(m),
    ),
    rounds: (Array.isArray(obj.rounds) ? obj.rounds : []).map(normalizeRound),
  };
}

function migrateCatalog(raw: unknown): CatalogShape {
  if (!raw || typeof raw !== "object") return emptyCatalog();
  const obj = raw as { courses?: GolfCourse[]; members?: Member[] };
  return {
    courses: Array.isArray(obj.courses) ? obj.courses : [],
    members: (Array.isArray(obj.members) ? obj.members : []).map((m) =>
      normalizeMember(m),
    ),
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
    closed?: boolean;
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
      closed: Boolean(meta.closed),
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

function isConflict(e: unknown): boolean {
  if (!e) return false;
  if (typeof e === "object" && e !== null && "name" in e) {
    if (String((e as { name: string }).name).includes("Precondition")) {
      return true;
    }
  }
  return e instanceof Error && /precondition|412|conflict/i.test(e.message);
}

export type StoreIO = {
  readAll?: () => Promise<unknown>;
  readCatalog: () => Promise<VersionedRead>;
  writeCatalog: (catalog: CatalogShape, etag: string | null) => Promise<void>;
  readRounds: () => Promise<VersionedRead>;
  writeRounds: (rounds: RoundState[], etag: string | null) => Promise<void>;
  isMigrated?: () => Promise<boolean>;
  markMigrated?: () => Promise<void>;
};

export function createJsonStore(io: StoreIO): RoundStore {
  let migrated = false;

  async function ensureMigrated(): Promise<void> {
    if (migrated) return;
    migrated = true;
    if (!io.readAll) return;
    try {
      if (io.isMigrated && (await io.isMigrated())) return;

      const catalog = migrateCatalog((await io.readCatalog()).data);
      const rounds = migrateRounds((await io.readRounds()).data);
      if (
        catalog.courses.length ||
        catalog.members.length ||
        rounds.length
      ) {
        await io.markMigrated?.();
        return;
      }

      const legacy = migrate(await io.readAll());
      if (
        legacy.courses.length ||
        legacy.members.length ||
        legacy.rounds.length
      ) {
        await io.writeCatalog(
          { courses: legacy.courses, members: legacy.members },
          null,
        );
        await io.writeRounds(legacy.rounds, null);
      }
      await io.markMigrated?.();
    } catch {
      // ignore migration errors
    }
  }

  async function withCatalogRetry<T>(
    mutator: (catalog: CatalogShape) => { catalog: CatalogShape; result: T },
  ): Promise<T> {
    await ensureMigrated();
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      const versioned = await io.readCatalog();
      const catalog = migrateCatalog(versioned.data);
      const { catalog: next, result } = mutator(catalog);
      try {
        await io.writeCatalog(next, versioned.etag);
        return result;
      } catch (e) {
        lastError = e;
        if (!isConflict(e)) throw e;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("코스/회원 저장 충돌이 반복되었습니다.");
  }

  async function withRoundsRetry<T>(
    mutator: (rounds: RoundState[]) => { rounds: RoundState[]; result: T },
  ): Promise<T> {
    await ensureMigrated();
    let lastError: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      const versioned = await io.readRounds();
      const rounds = migrateRounds(versioned.data);
      const { rounds: next, result } = mutator(rounds);
      try {
        await io.writeRounds(next, versioned.etag);
        return result;
      } catch (e) {
        lastError = e;
        if (!isConflict(e)) throw e;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error("대회 데이터 저장 충돌이 반복되었습니다.");
  }

  async function loadCatalog(): Promise<CatalogShape> {
    await ensureMigrated();
    return migrateCatalog((await io.readCatalog()).data);
  }

  async function loadRounds(): Promise<RoundState[]> {
    await ensureMigrated();
    return migrateRounds((await io.readRounds()).data);
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
      const catalog = await loadCatalog();
      let holes: CourseHole[] = input.course ?? defaultCourse();
      let courseName = input.courseName || "Course";
      let teeColor: TeeColor = input.teeColor || "white";
      let lengthMeters = input.lengthMeters ?? null;
      const courseId = input.courseId ?? null;

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
          closed: false,
          updatedAt: now,
        },
        course: holes,
        players: [],
        scores: [],
      };

      return withRoundsRetry((rounds) => {
        if (rounds.some((r) => r.round.slug === input.slug)) {
          throw new Error("슬러그가 이미 존재합니다.");
        }
        return { rounds: [...rounds, state], result: state };
      });
    },

    async updateRoundMeta(slug, patch) {
      return withRoundsRetry((rounds) => {
        const idx = rounds.findIndex((r) => r.round.slug === slug);
        if (idx < 0) return { rounds, result: null };
        const prev = rounds[idx];
        const next = touch({
          ...prev,
          round: {
            ...prev.round,
            name: patch.name ?? prev.round.name,
            date: patch.date ?? prev.round.date,
            courseId:
              patch.courseId !== undefined
                ? patch.courseId
                : prev.round.courseId,
            courseName: patch.courseName ?? prev.round.courseName,
            teeColor: patch.teeColor ?? prev.round.teeColor,
            lengthMeters:
              patch.lengthMeters !== undefined
                ? patch.lengthMeters
                : prev.round.lengthMeters,
            closed:
              patch.closed !== undefined ? patch.closed : prev.round.closed,
          },
        });
        const copy = [...rounds];
        copy[idx] = next;
        return { rounds: copy, result: next };
      });
    },

    async setCourse(slug, course) {
      return withRoundsRetry((rounds) => {
        const idx = rounds.findIndex((r) => r.round.slug === slug);
        if (idx < 0) return { rounds, result: null };
        const next = touch({ ...rounds[idx], course });
        const copy = [...rounds];
        copy[idx] = next;
        return { rounds: copy, result: next };
      });
    },

    async applyCatalogCourse(slug, courseId) {
      const catalog = await loadCatalog();
      const found = catalog.courses.find((c) => c.id === courseId);
      if (!found) throw new Error("코스를 찾을 수 없습니다.");
      return withRoundsRetry((rounds) => {
        const idx = rounds.findIndex((r) => r.round.slug === slug);
        if (idx < 0) return { rounds, result: null };
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
        return { rounds: copy, result: next };
      });
    },

    async setPlayers(slug, playersInput: UpsertPlayerInput[]) {
      return withRoundsRetry((rounds) => {
        const idx = rounds.findIndex((r) => r.round.slug === slug);
        if (idx < 0) return { rounds, result: null };
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
        return { rounds: copy, result: next };
      });
    },

    async upsertScore(slug, playerId, hole, gross) {
      return this.upsertScores(slug, [{ playerId, hole, gross }]);
    },

    async upsertScores(slug, incoming) {
      return withRoundsRetry((rounds) => {
        const idx = rounds.findIndex((r) => r.round.slug === slug);
        if (idx < 0) return { rounds, result: null };
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
        return { rounds: copy, result: next };
      });
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
      const now = new Date().toISOString();
      const holes = normalizeHoles(input.holes, input.holeCount);
      assertUniqueStrokeIndexes(holes);
      return withCatalogRetry((catalog) => {
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
            return { catalog: { ...catalog, courses }, result: next };
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
        return {
          catalog: {
            ...catalog,
            courses: [...catalog.courses, created],
          },
          result: created,
        };
      });
    },

    async deleteCourse(id) {
      await withCatalogRetry((catalog) => ({
        catalog: {
          ...catalog,
          courses: catalog.courses.filter((c) => c.id !== id),
        },
        result: undefined,
      }));
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
      const now = new Date().toISOString();
      const name = input.name.trim() || "Untitled";
      const handicap = Number.isFinite(input.handicap) ? input.handicap : 18;
      const notes = typeof input.notes === "string" ? input.notes : "";
      return withCatalogRetry((catalog) => {
        if (input.id) {
          const idx = catalog.members.findIndex((m) => m.id === input.id);
          if (idx >= 0) {
            const prev = normalizeMember(catalog.members[idx]);
            const next: Member = {
              ...prev,
              name,
              handicap,
              notes: input.notes !== undefined ? notes : prev.notes,
              handicapHistory: appendHandicapHistory(prev, handicap, now),
              updatedAt: now,
            };
            const members = [...catalog.members];
            members[idx] = next;
            return { catalog: { ...catalog, members }, result: next };
          }
        }
        const created: Member = normalizeMember({
          id: randomUUID(),
          name,
          handicap,
          notes,
          handicapHistory: [
            { at: now, handicap, source: "manual" },
          ],
          createdAt: now,
          updatedAt: now,
        });
        return {
          catalog: {
            ...catalog,
            members: [...catalog.members, created],
          },
          result: created,
        };
      });
    },

    async deleteMember(id) {
      await withCatalogRetry((catalog) => ({
        catalog: {
          ...catalog,
          members: catalog.members.filter((m) => m.id !== id),
        },
        result: undefined,
      }));
    },
  };
}
