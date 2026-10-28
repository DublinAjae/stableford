import { NextResponse } from "next/server";
import {
  GLOBAL_ADMIN_COOKIE,
  pinMatches,
  signGlobalAdminToken,
} from "@/lib/auth";

export async function POST(req: Request) {
  const body = (await req.json()) as { pin?: string };
  if (!pinMatches(body.pin || "")) {
    return NextResponse.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(GLOBAL_ADMIN_COOKIE, signGlobalAdminToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
