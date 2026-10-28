import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  GLOBAL_ADMIN_COOKIE,
  pinMatches,
  signAdminToken,
  signGlobalAdminToken,
} from "@/lib/auth";
import { getStore } from "@/lib/store";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const state = await getStore().getRound(slug);
  if (!state) {
    return NextResponse.json({ error: "대회를 찾을 수 없습니다." }, { status: 404 });
  }
  const body = (await req.json()) as { pin?: string };
  if (!pinMatches(body.pin || "")) {
    return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, signAdminToken(slug), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  res.cookies.set(GLOBAL_ADMIN_COOKIE, signGlobalAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
