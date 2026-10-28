import { NextResponse } from "next/server";
import { ADMIN_COOKIE, GLOBAL_ADMIN_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const clear = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(GLOBAL_ADMIN_COOKIE, "", clear);
  res.cookies.set(ADMIN_COOKIE, "", clear);
  return res;
}
