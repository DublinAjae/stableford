import { NextResponse } from "next/server";
import { isAdminFor } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { Score } from "@/lib/types";

type Ctx = { params: Promise<{ slug: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const store = getStore();
  const current = await store.getRound(slug);
  if (!current) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }

  if (current.round.closed) {
    return NextResponse.json(
      { error: "대회가 종료되어 타수를 수정할 수 없습니다." },
      { status: 403 },
    );
  }

  const body = (await req.json()) as {
    scores?: Score[];
    groupCode?: string;
  };
  if (!body.scores?.length) {
    return NextResponse.json({ error: "scores가 필요합니다." }, { status: 400 });
  }

  const admin = await isAdminFor(slug);
  if (!admin) {
    const group = (body.groupCode || "").toUpperCase();
    if (!group) {
      return NextResponse.json(
        { error: "조 코드 또는 admin 권한이 필요합니다." },
        { status: 401 },
      );
    }
    const allowed = new Set(
      current.players.filter((p) => p.groupCode === group).map((p) => p.id),
    );
    for (const s of body.scores) {
      if (!allowed.has(s.playerId)) {
        return NextResponse.json(
          { error: "해당 조 플레이어만 수정할 수 있습니다." },
          { status: 403 },
        );
      }
    }
  }

  const state = await store.upsertScores(slug, body.scores);
  return NextResponse.json({ state });
}
