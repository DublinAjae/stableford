import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { defaultCourse } from "@/lib/ranking";
import type { CourseHole, Player, RoundState, Score } from "@/lib/types";
import type { RoundStore, UpsertPlayerInput } from "./types";

type DbShape = {
  rounds: RoundState[];
};

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "rounds.json");

async function readDb(): Promise<DbShape> {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    return JSON.parse(raw) as DbShape;
  } catch {
    return { rounds: [] };
  }
}

async function writeDb(db: DbShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

function touch(state: RoundState): RoundState {
  return {
    ...state,
    round: { ...state.round, updatedAt: new Date().toISOString() },
  };
}

export const fileStore: RoundStore = {
  async listRounds() {
    const db = await readDb();
    return db.rounds
      .map((r) => ({
        slug: r.round.slug,
        name: r.round.name,
        updatedAt: r.round.updatedAt,
      }))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  async getRound(slug) {
    const db = await readDb();
    return db.rounds.find((r) => r.round.slug === slug) ?? null;
  },

  async createRound({ slug, name, course }) {
    const db = await readDb();
    if (db.rounds.some((r) => r.round.slug === slug)) {
      throw new Error("슬러그가 이미 존재합니다.");
    }
    const now = new Date().toISOString();
    const state: RoundState = {
      round: { id: randomUUID(), slug, name, updatedAt: now },
      course: course ?? defaultCourse(),
      players: [],
      scores: [],
    };
    db.rounds.push(state);
    await writeDb(db);
    return state;
  },

  async updateRoundMeta(slug, patch) {
    const db = await readDb();
    const idx = db.rounds.findIndex((r) => r.round.slug === slug);
    if (idx < 0) return null;
    const next = touch({
      ...db.rounds[idx],
      round: {
        ...db.rounds[idx].round,
        name: patch.name ?? db.rounds[idx].round.name,
      },
    });
    db.rounds[idx] = next;
    await writeDb(db);
    return next;
  },

  async setCourse(slug, course) {
    const db = await readDb();
    const idx = db.rounds.findIndex((r) => r.round.slug === slug);
    if (idx < 0) return null;
    const next = touch({ ...db.rounds[idx], course });
    db.rounds[idx] = next;
    await writeDb(db);
    return next;
  },

  async setPlayers(slug, playersInput) {
    const db = await readDb();
    const idx = db.rounds.findIndex((r) => r.round.slug === slug);
    if (idx < 0) return null;
    const prev = db.rounds[idx];
    const players: Player[] = playersInput.map((p, i) => ({
      id: p.id && prev.players.some((x) => x.id === p.id) ? p.id : randomUUID(),
      name: p.name.trim() || `Player ${i + 1}`,
      courseHandicap: p.courseHandicap,
      groupCode: (p.groupCode || "A").toUpperCase(),
      sortOrder: p.sortOrder ?? i,
    }));
    const keep = new Set(players.map((p) => p.id));
    const scores = prev.scores.filter((s) => keep.has(s.playerId));
    // Ensure score rows exist for each player/hole
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
    await writeDb(db);
    return next;
  },

  async upsertScore(slug, playerId, hole, gross) {
    return this.upsertScores(slug, [{ playerId, hole, gross }]);
  },

  async upsertScores(slug, incoming) {
    const db = await readDb();
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
    await writeDb(db);
    return next;
  },
};

// silence unused type import in some TS configs
export type _CourseHole = CourseHole;
export type _Upsert = UpsertPlayerInput;
