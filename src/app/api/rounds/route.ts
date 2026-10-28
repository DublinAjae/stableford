import { NextResponse } from "next/server";
import { getStore, storeKind } from "@/lib/store";
import { defaultCourse } from "@/lib/ranking";
import { isAdminFor } from "@/lib/auth";

export async function GET() {
  const store = getStore();
  const rounds = await store.listRounds();
  return NextResponse.json({ rounds, store: storeKind() });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    slug?: string;
    name?: string;
  };
  const slug = (body.slug || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const name = (body.name || "").trim();
  if (!slug || !name) {
    return NextResponse.json(
      { error: "name과 slug가 필요합니다." },
      { status: 400 },
    );
  }

  // Creating a round requires either no rounds yet, or admin of an existing slug via header — for MVP, require admin pin cookie for any existing round OR allow if list empty / ADMIN creating
  const store = getStore();
  const existing = await store.listRounds();
  if (existing.length > 0) {
    // allow if admin of any known round cookie matches first round, or body includes being first-time
    const ok = await isAdminFor(existing[0].slug);
    if (!ok) {
      return NextResponse.json(
        { error: "라운드 생성은 admin 로그인이 필요합니다." },
        { status: 401 },
      );
    }
  }

  try {
    const state = await store.createRound({
      slug,
      name,
      course: defaultCourse(),
    });
    return NextResponse.json({ state });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "생성 실패" },
      { status: 400 },
    );
  }
}
