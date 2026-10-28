import { NextResponse } from "next/server";
import { isGlobalAdmin } from "@/lib/auth";
import { getStore, type UpsertGolfCourseInput } from "@/lib/store";

export async function GET() {
  const courses = await getStore().listCourses();
  return NextResponse.json({ courses, admin: await isGlobalAdmin() });
}

export async function POST(req: Request) {
  if (!(await isGlobalAdmin())) {
    return NextResponse.json({ error: "admin 권한이 필요합니다." }, { status: 401 });
  }
  const body = (await req.json()) as UpsertGolfCourseInput;
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "코스 이름이 필요합니다." }, { status: 400 });
  }
  const course = await getStore().upsertCourse(body);
  return NextResponse.json({ course });
}
