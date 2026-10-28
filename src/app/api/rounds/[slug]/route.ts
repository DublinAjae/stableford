import { NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { isAdminFor } from "@/lib/auth";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const state = await getStore().getRound(slug);
  if (!state) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({
    state,
    admin: await isAdminFor(slug),
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!(await isAdminFor(slug))) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as { name?: string };
  const state = await getStore().updateRoundMeta(slug, { name: body.name });
  if (!state) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ state });
}
