import { NextResponse } from "next/server";
import { isAdminFor } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { TeeColor } from "@/lib/types";

type Ctx = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const state = await getStore().getRound(slug);
  if (!state) {
    return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json(
    {
      state,
      admin: await isAdminFor(slug),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!(await isAdminFor(slug))) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as {
    name?: string;
    date?: string;
    courseId?: string | null;
    courseName?: string;
    teeColor?: TeeColor;
    lengthMeters?: number | null;
    closed?: boolean;
  };
  const store = getStore();

  if (body.courseId) {
    const state = await store.applyCatalogCourse(slug, body.courseId);
    if (!state) {
      return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
    }
    if (body.name || body.date) {
      const updated = await store.updateRoundMeta(slug, {
        name: body.name,
        date: body.date,
      });
      return NextResponse.json({ state: updated });
    }
    return NextResponse.json({ state });
  }

  const state = await store.updateRoundMeta(slug, body);
  if (!state) {
    return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ state });
}
