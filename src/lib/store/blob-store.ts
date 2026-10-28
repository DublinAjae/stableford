import { get, list, put } from "@vercel/blob";
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

async function readPath(pathname: string): Promise<unknown | null> {
  noStore();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    // Public CDN ignores useCache:false — private + cache=0 is required for fresh reads.
    const result = await get(pathname, {
      access: "private",
      token,
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    const text = await new Response(result.stream).text();
    if (!text) return null;
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function readLatest(
  prefix: string,
  fallbackPath?: string,
): Promise<unknown | null> {
  noStore();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const { blobs } = await list({ prefix, token, limit: 1000 });
    if (blobs.length > 0) {
      // Pathnames are v-{Date.now()}-{rand}.json — lexicographic max is newest.
      const latest = blobs.map((b) => b.pathname).sort().at(-1)!;
      const data = await readPath(latest);
      if (data != null) return data;
    }
  } catch {
    // fall through
  }
  if (fallbackPath) return readPath(fallbackPath);
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
  return Boolean(await readPath(MIGRATED_PATH));
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

export const blobStore = createJsonStore({
  readAll: async () => (await readPath(LEGACY_PATH)) ?? emptyDb(),
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
