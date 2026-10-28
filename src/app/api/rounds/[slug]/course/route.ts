import { NextResponse } from "next/server";
import { isAdminFor } from "@/lib/auth";
import { getStore } from "@/lib/store";
import type { CourseHole } from "@/lib/types";

type Ctx = { params: Promise<{ slug: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  if (!(await isAdminFor(slug))) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as { course?: CourseHole[] };
  if (!body.course || body.course.length !== 18) {
    return NextResponse.json({ error: "18홀 course가 필요합니다." }, { status: 400 });
  }
  const state = await getStore().setCourse(slug, body.course);
  if (!state) {
    return NextResponse.json({ error: "라운드를 찾을 수 없습니다." }, { status: 404 });
  }
  return NextResponse.json({ state });
}
