import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createJsonStore, emptyDb, type DbShape } from "./json-db";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "rounds.json");

async function read(): Promise<unknown> {
  try {
    return JSON.parse(await readFile(DATA_FILE, "utf8"));
  } catch {
    return emptyDb();
  }
}

async function write(db: DbShape): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf8");
}

export const fileStore = createJsonStore({ read, write });
