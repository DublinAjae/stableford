import { NextResponse } from "next/server";
import { isGlobalAdmin } from "@/lib/auth";
import { tournamentSlug } from "@/lib/courses";
import { getStore, storeKind } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = getStore();
  const [rounds, courses, members] = await Promise.all([
    store.listRounds(),
    store.listCourses(),
    store.listMembers(),
  ]);
  return NextResponse.json(
    {
      rounds,
      courses,
      members,
      store: storeKind(),
      admin: await isGlobalAdmin(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!(await isGlobalAdmin())) {
    return NextResponse.json(
      { error: "대회 생성은 admin 로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = (await req.json()) as {
    name?: string;
    date?: string;
    slug?: string;
    courseId?: string;
  };

  const name = (body.name || "").trim();
  const date = (body.date || new Date().toISOString().slice(0, 10)).trim();
  if (!name) {
    return NextResponse.json({ error: "대회 이름이 필요합니다." }, { status: 400 });
  }
  if (!body.courseId) {
    return NextResponse.json({ error: "골프 코스를 선택해 주세요." }, { status: 400 });
  }

  const store = getStore();
  const course = await store.getCourse(body.courseId);
  if (!course) {
    return NextResponse.json({ error: "코스를 찾을 수 없습니다." }, { status: 404 });
  }

  let slug = (body.slug || tournamentSlug(date, course.name))
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  const existing = await store.listRounds();
  if (existing.some((r) => r.slug === slug)) {
    let n = 2;
    while (existing.some((r) => r.slug === `${slug}-${n}`)) n += 1;
    slug = `${slug}-${n}`;
  }

  try {
    const state = await store.createRound({
      slug,
      name,
      date,
      courseId: course.id,
    });
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "생성 실패" },
      { status: 400 },
    );
  }
}
