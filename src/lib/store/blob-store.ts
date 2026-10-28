import { get, head, put } from "@vercel/blob";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
  type VersionedRead,
} from "./json-db";
import type { RoundState } from "@/lib/types";

const LEGACY_PATH = "stableford/rounds.json";
const CATALOG_PATH = "stableford/catalog.json";
const ROUNDS_PATH = "stableford/rounds-data.json";
const MIGRATED_PATH = "stableford/.migrated";

async function readBlob(pathname: string): Promise<VersionedRead> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return { data: null, etag: null };
  try {
    const result = await get(pathname, {
      access: "public",
      token,
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return { data: null, etag: null };
    }
    const text = await new Response(result.stream).text();
    if (!text) return { data: null, etag: null };
    return { data: JSON.parse(text) as unknown, etag: null };
  } catch {
    return { data: null, etag: null };
  }
}

async function writeBlob(pathname: string, data: unknown): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN이 없습니다.");
  await put(pathname, JSON.stringify(data), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
    contentType: "application/json",
    cacheControlMaxAge: 60,
  });
}

async function exists(pathname: string): Promise<boolean> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return false;
  try {
    await head(pathname, { token });
    return true;
  } catch {
    return false;
  }
}

export const blobStore = createJsonStore({
  readAll: async () => (await readBlob(LEGACY_PATH)).data ?? emptyDb(),
  readCatalog: async () => {
    const v = await readBlob(CATALOG_PATH);
    return { data: v.data ?? emptyCatalog(), etag: null };
  },
  writeCatalog: async (catalog: CatalogShape) => writeBlob(CATALOG_PATH, catalog),
  readRounds: async () => {
    const v = await readBlob(ROUNDS_PATH);
    return { data: v.data ?? [], etag: null };
  },
  writeRounds: async (rounds: RoundState[]) => writeBlob(ROUNDS_PATH, rounds),
  isMigrated: async () => exists(MIGRATED_PATH),
  markMigrated: async () => writeBlob(MIGRATED_PATH, { ok: true, at: Date.now() }),
});
