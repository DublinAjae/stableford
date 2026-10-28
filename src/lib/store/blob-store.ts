import { head, put } from "@vercel/blob";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
} from "./json-db";
import type { RoundState } from "@/lib/types";

const LEGACY_PATH = "stableford/rounds.json";
const CATALOG_PATH = "stableford/catalog.json";
const ROUNDS_PATH = "stableford/rounds-data.json";

async function readBlob(pathname: string): Promise<unknown | null> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return null;
  try {
    const meta = await head(pathname, { token });
    const url = `${meta.url}${meta.url.includes("?") ? "&" : "?"}t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
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
    cacheControlMaxAge: 0,
  });
}

export const blobStore = createJsonStore({
  readAll: async () => (await readBlob(LEGACY_PATH)) ?? emptyDb(),
  readCatalog: async () => (await readBlob(CATALOG_PATH)) ?? emptyCatalog(),
  writeCatalog: async (catalog: CatalogShape) =>
    writeBlob(CATALOG_PATH, catalog),
  readRounds: async () => (await readBlob(ROUNDS_PATH)) ?? [],
  writeRounds: async (rounds: RoundState[]) => writeBlob(ROUNDS_PATH, rounds),
});
