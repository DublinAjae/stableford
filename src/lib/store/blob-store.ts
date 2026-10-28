import { list, put } from "@vercel/blob";
import { unstable_noStore as noStore } from "next/cache";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
  type VersionedRead,
} from "./json-db";
import type { RoundState } from "@/lib/types";

const LEGACY_PATH = "stableford/rounds.json";
const CATALOG_PREFIX = "stableford/catalog/v-";
const ROUNDS_PREFIX = "stableford/rounds/v-";
const CATALOG_FALLBACK = "stableford/catalog.json";
const ROUNDS_FALLBACK = "stableford/rounds-data.json";
const MIGRATED_PATH = "stableford/migrated.json";

function tokenOrThrow(): string {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN이 없습니다.");
  return token;
}

/**
 * Versioned blobs are immutable unique paths, so CDN cache is safe.
 * We discover the latest via list() (Blob API, not CDN), then fetch that URL
 * with cache:'no-store' so Next.js never reuses a cached GET.
 */
async function fetchJson(url: string): Promise<unknown | null> {
  noStore();
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!response.ok) return null;
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function readLatest(
  prefix: string,
  fallbackPathname?: string,
): Promise<unknown | null> {
  noStore();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { blobs } = await list({ prefix, token, limit: 1000 });
    if (blobs.length > 0) {
      // Pathnames are v-{Date.now()}-{rand}.json — lexicographic max is newest.
      const latest = blobs.slice().sort((a, b) => a.pathname.localeCompare(b.pathname)).at(-1)!;
      const data = await fetchJson(latest.url);
      if (data != null) return data;
    }
  } catch {
    // fall through
  }
  if (fallbackPathname) {
    try {
      const { blobs } = await list({
        prefix: fallbackPathname,
        token,
        limit: 10,
      });
      const exact = blobs.find((b) => b.pathname === fallbackPathname);
      if (exact) return fetchJson(exact.url);
    } catch {
      // ignore
    }
  }
  return null;
}

async function writeVersioned(prefix: string, data: unknown): Promise<void> {
  const token = tokenOrThrow();
  const pathname = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    token,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readMigrated(): Promise<boolean> {
  const data = await readLatest(MIGRATED_PATH);
  // list prefix match may return the file itself when prefix==pathname
  if (data) return true;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    const { blobs } = await list({ prefix: MIGRATED_PATH, token, limit: 5 });
    const exact = blobs.find((b) => b.pathname === MIGRATED_PATH);
    if (!exact) return false;
    const body = await fetchJson(exact.url);
    return Boolean(body);
  } catch {
    return false;
  }
}

async function markMigrated(): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return;
  await put(MIGRATED_PATH, JSON.stringify({ ok: true, at: Date.now() }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
    contentType: "application/json",
    cacheControlMaxAge: 0,
  });
}

async function readLegacy(): Promise<unknown | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { blobs } = await list({ prefix: LEGACY_PATH, token, limit: 5 });
    const exact = blobs.find((b) => b.pathname === LEGACY_PATH);
    if (!exact) return null;
    return fetchJson(exact.url);
  } catch {
    return null;
  }
}

export const blobStore = createJsonStore({
  readAll: async () => (await readLegacy()) ?? emptyDb(),
  readCatalog: async (): Promise<VersionedRead> => ({
    data: (await readLatest(CATALOG_PREFIX, CATALOG_FALLBACK)) ?? emptyCatalog(),
    etag: null,
  }),
  writeCatalog: async (catalog: CatalogShape) =>
    writeVersioned(CATALOG_PREFIX, catalog),
  readRounds: async (): Promise<VersionedRead> => ({
    data: (await readLatest(ROUNDS_PREFIX, ROUNDS_FALLBACK)) ?? [],
    etag: null,
  }),
  writeRounds: async (rounds: RoundState[]) =>
    writeVersioned(ROUNDS_PREFIX, rounds),
  isMigrated: readMigrated,
  markMigrated,
});
