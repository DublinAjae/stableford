import { get, put } from "@vercel/blob";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
  type VersionedRead,
} from "./json-db";
import type { RoundState } from "@/lib/types";

const LEGACY_PATH = "stableford/rounds.json";
const CATALOG_POINTER = "stableford/catalog-pointer.json";
const ROUNDS_POINTER = "stableford/rounds-pointer.json";
const MIGRATED_PATH = "stableford/migrated.json";

async function readPath(pathname: string): Promise<unknown | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const result = await get(pathname, {
      access: "public",
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

async function writeVersioned(
  pointerPath: string,
  prefix: string,
  data: unknown,
): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN이 없습니다.");
  const pathname = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    token,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
  // Pointer last — readers follow the latest pointer after the payload exists.
  await put(pointerPath, JSON.stringify({ pathname }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function readVersioned(
  pointerPath: string,
  fallbackPath?: string,
): Promise<unknown | null> {
  const pointer = (await readPath(pointerPath)) as { pathname?: string } | null;
  if (pointer?.pathname) {
    const data = await readPath(pointer.pathname);
    if (data != null) return data;
  }
  if (fallbackPath) return readPath(fallbackPath);
  return null;
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
    cacheControlMaxAge: 60,
  });
}

export const blobStore = createJsonStore({
  readAll: async () => (await readPath(LEGACY_PATH)) ?? emptyDb(),
  readCatalog: async (): Promise<VersionedRead> => ({
    data:
      (await readVersioned(CATALOG_POINTER, "stableford/catalog.json")) ??
      emptyCatalog(),
    etag: null,
  }),
  writeCatalog: async (catalog: CatalogShape) =>
    writeVersioned(CATALOG_POINTER, "stableford/catalog/v-", catalog),
  readRounds: async (): Promise<VersionedRead> => ({
    data:
      (await readVersioned(ROUNDS_POINTER, "stableford/rounds-data.json")) ?? [],
    etag: null,
  }),
  writeRounds: async (rounds: RoundState[]) =>
    writeVersioned(ROUNDS_POINTER, "stableford/rounds/v-", rounds),
  isMigrated: readMigrated,
  markMigrated,
});
