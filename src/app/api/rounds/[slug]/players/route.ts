import { NextResponse } from "next/server";
import { isAdminFor } from "@/lib/auth";
import { getStore, type UpsertPlayerInput } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!(await isAdminFor(slug))) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as { players?: UpsertPlayerInput[] };
  if (!body.players || !Array.isArray(body.players)) {
    return NextResponse.json({ error: "players 배열이 필요합니다." }, { status: 400 });
  }
  const state = await getStore().setPlayers(slug, body.players);
  if (!state) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ state });
}
