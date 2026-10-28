import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultCourse } from "@/lib/ranking";
import type { CourseHole, Player, RoundState, Score } from "@/lib/types";
import type { RoundStore, UpsertPlayerInput } from "./types";

type RoundRow = {
  id: string;
  slug: string;
  name: string;
  updated_at: string;
};

function client(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase 환경변수가 없습니다.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function loadState(
  sb: SupabaseClient,
  round: RoundRow,
): Promise<RoundState> {
  const [{ data: course }, { data: players }] = await Promise.all([
    sb
      .from("course_holes")
      .select("hole, par, stroke_index")
      .eq("round_id", round.id)
      .order("hole"),
    sb
      .from("players")
      .select("id, name, course_handicap, group_code, sort_order")
      .eq("round_id", round.id)
      .order("sort_order"),
  ]);

  const playerRows = (players ?? []) as {
    id: string;
    name: string;
    course_handicap: number;
    group_code: string;
    sort_order: number;
  }[];

  let scoreRows: { player_id: string; hole: number; gross: number | null }[] =
    [];
  if (playerRows.length) {
    const { data: scores } = await sb
      .from("scores")
      .select("player_id, hole, gross")
      .in(
        "player_id",
        playerRows.map((p) => p.id),
      );
    scoreRows = (scores ?? []) as typeof scoreRows;
  }

  return {
    round: {
      id: round.id,
      slug: round.slug,
      name: round.name,
      updatedAt: round.updated_at,
    },
    course: (
      (course ?? []) as { hole: number; par: number; stroke_index: number }[]
    ).map((c) => ({
      hole: c.hole,
      par: c.par,
      strokeIndex: c.stroke_index,
    })),
    players: playerRows.map((p) => ({
      id: p.id,
      name: p.name,
      courseHandicap: p.course_handicap,
      groupCode: p.group_code,
      sortOrder: p.sort_order,
    })),
    scores: scoreRows.map((s) => ({
      playerId: s.player_id,
      hole: s.hole,
      gross: s.gross,
    })),
  };
}

async function getRoundRow(sb: SupabaseClient, slug: string) {
  const { data, error } = await sb
    .from("rounds")
    .select("id, slug, name, updated_at")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as RoundRow | null;
}

async function touch(sb: SupabaseClient, roundId: string) {
  await sb
    .from("rounds")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", roundId);
}

export const supabaseStore: RoundStore = {
  async listRounds() {
    const sb = client();
    const { data, error } = await sb
      .from("rounds")
      .select("slug, name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((r) => ({
      slug: r.slug as string,
      name: r.name as string,
      updatedAt: r.updated_at as string,
    }));
  },

  async getRound(slug) {
    const sb = client();
    const round = await getRoundRow(sb, slug);
    if (!round) return null;
    return loadState(sb, round);
  },

  async createRound({ slug, name, course }) {
    const sb = client();
    const { data, error } = await sb
      .from("rounds")
      .insert({ slug, name })
      .select("id, slug, name, updated_at")
      .single();
    if (error) throw error;
    const round = data as RoundRow;
    const holes = course ?? defaultCourse();
    const { error: cErr } = await sb.from("course_holes").insert(
      holes.map((h) => ({
        round_id: round.id,
        hole: h.hole,
        par: h.par,
        stroke_index: h.strokeIndex,
      })),
    );
    if (cErr) throw cErr;
    return loadState(sb, round);
  },

  async updateRoundMeta(slug, patch) {
    const sb = client();
    const round = await getRoundRow(sb, slug);
    if (!round) return null;
    const { error } = await sb
      .from("rounds")
      .update({
        name: patch.name ?? round.name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", round.id);
    if (error) throw error;
    return this.getRound(slug);
  },

  async setCourse(slug, course) {
    const sb = client();
    const round = await getRoundRow(sb, slug);
    if (!round) return null;
    const { error } = await sb.from("course_holes").upsert(
      course.map((h) => ({
        round_id: round.id,
        hole: h.hole,
        par: h.par,
        stroke_index: h.strokeIndex,
      })),
      { onConflict: "round_id,hole" },
    );
    if (error) throw error;
    await touch(sb, round.id);
    return this.getRound(slug);
  },

  async setPlayers(slug, playersInput: UpsertPlayerInput[]) {
    const sb = client();
    const round = await getRoundRow(sb, slug);
    if (!round) return null;

    const existing = await this.getRound(slug);
    if (!existing) return null;

    const nextPlayers: Player[] = [];
    for (let i = 0; i < playersInput.length; i++) {
      const p = playersInput[i];
      if (p.id && existing.players.some((x) => x.id === p.id)) {
        const { error } = await sb
          .from("players")
          .update({
            name: p.name.trim() || `Player ${i + 1}`,
            course_handicap: p.courseHandicap,
            group_code: (p.groupCode || "A").toUpperCase(),
            sort_order: p.sortOrder ?? i,
          })
          .eq("id", p.id);
        if (error) throw error;
        nextPlayers.push({
          id: p.id,
          name: p.name.trim() || `Player ${i + 1}`,
          courseHandicap: p.courseHandicap,
          groupCode: (p.groupCode || "A").toUpperCase(),
          sortOrder: p.sortOrder ?? i,
        });
      } else {
        const { data, error } = await sb
          .from("players")
          .insert({
            round_id: round.id,
            name: p.name.trim() || `Player ${i + 1}`,
            course_handicap: p.courseHandicap,
            group_code: (p.groupCode || "A").toUpperCase(),
            sort_order: p.sortOrder ?? i,
          })
          .select("id")
          .single();
        if (error) throw error;
        nextPlayers.push({
          id: data.id as string,
          name: p.name.trim() || `Player ${i + 1}`,
          courseHandicap: p.courseHandicap,
          groupCode: (p.groupCode || "A").toUpperCase(),
          sortOrder: p.sortOrder ?? i,
        });
      }
    }

    const keep = new Set(nextPlayers.map((p) => p.id));
    const toDelete = existing.players.filter((p) => !keep.has(p.id)).map((p) => p.id);
    if (toDelete.length) {
      const { error } = await sb.from("players").delete().in("id", toDelete);
      if (error) throw error;
    }

    // Ensure score placeholders
    const scoreRows = nextPlayers.flatMap((player) =>
      existing.course.map((h) => ({
        player_id: player.id,
        hole: h.hole,
        gross: existing.scores.find(
          (s) => s.playerId === player.id && s.hole === h.hole,
        )?.gross ?? null,
      })),
    );
    if (scoreRows.length) {
      const { error } = await sb.from("scores").upsert(scoreRows, {
        onConflict: "player_id,hole",
      });
      if (error) throw error;
    }

    await touch(sb, round.id);
    return this.getRound(slug);
  },

  async upsertScore(slug, playerId, hole, gross) {
    return this.upsertScores(slug, [{ playerId, hole, gross }]);
  },

  async upsertScores(slug, incoming: Score[]) {
    const sb = client();
    const round = await getRoundRow(sb, slug);
    if (!round) return null;
    if (incoming.length) {
      const { error } = await sb.from("scores").upsert(
        incoming.map((s) => ({
          player_id: s.playerId,
          hole: s.hole,
          gross: s.gross,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "player_id,hole" },
      );
      if (error) throw error;
    }
    await touch(sb, round.id);
    return this.getRound(slug);
  },
};

export type _CH = CourseHole;
