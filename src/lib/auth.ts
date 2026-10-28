import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "stableford_admin";
export const GLOBAL_ADMIN_COOKIE = "stableford_admin_global";

function secret(): string {
  return (
    process.env.ADMIN_SECRET ||
    process.env.ADMIN_PIN ||
    "stableford-dev-secret"
  );
}

export function expectedAdminPin(): string {
  return process.env.ADMIN_PIN || "admin";
}

export function signAdminToken(slug: string): string {
  const body = `${slug}:${Date.now()}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return Buffer.from(`${body}:${sig}`).toString("base64url");
}

export function signGlobalAdminToken(): string {
  const body = `global:${Date.now()}`;
  const sig = createHmac("sha256", secret()).update(body).digest("hex");
  return Buffer.from(`${body}:${sig}`).toString("base64url");
}

export function verifyAdminToken(token: string, slug: string): boolean {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [tokenSlug, ts, sig] = raw.split(":");
    if (!tokenSlug || !ts || !sig) return false;
    if (tokenSlug !== slug) return false;
    if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return false;
    const expect = createHmac("sha256", secret())
      .update(`${tokenSlug}:${ts}`)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyGlobalAdminToken(token: string): boolean {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [scope, ts, sig] = raw.split(":");
    if (scope !== "global" || !ts || !sig) return false;
    if (Date.now() - Number(ts) > 30 * 24 * 60 * 60 * 1000) return false;
    const expect = createHmac("sha256", secret())
      .update(`global:${ts}`)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expect);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function pinMatches(pin: string): boolean {
  const expect = expectedAdminPin();
  const a = Buffer.from(pin);
  const b = Buffer.from(expect);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function isAdminFor(slug: string): Promise<boolean> {
  const jar = await cookies();
  const global = jar.get(GLOBAL_ADMIN_COOKIE)?.value;
  if (global && verifyGlobalAdminToken(global)) return true;
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  return verifyAdminToken(token, slug);
}

export async function isGlobalAdmin(): Promise<boolean> {
  const jar = await cookies();
  const global = jar.get(GLOBAL_ADMIN_COOKIE)?.value;
  if (global && verifyGlobalAdminToken(global)) return true;
  // Also treat any per-round admin cookie as enough for catalog edits
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [slug, ts, sig] = raw.split(":");
    if (!slug || !ts || !sig) return false;
    return verifyAdminToken(token, slug);
  } catch {
    return false;
  }
}
