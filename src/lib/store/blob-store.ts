import { head, put } from "@vercel/blob";
import { createJsonStore, emptyDb, type DbShape } from "./json-db";

const PATH = "stableford/rounds.json";

async function read(): Promise<unknown> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return emptyDb();
  try {
    const meta = await head(PATH, { token });
    const res = await fetch(meta.url, { cache: "no-store" });
    if (!res.ok) return emptyDb();
    return await res.json();
  } catch {
    return emptyDb();
  }
}

async function write(db: DbShape): Promise<void> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN이 없습니다.");
  await put(PATH, JSON.stringify(db), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    token,
    contentType: "application/json",
  });
}

export const blobStore = createJsonStore({ read, write });
