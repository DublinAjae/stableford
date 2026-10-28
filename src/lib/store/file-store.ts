import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
} from "./json-db";
import type { RoundState } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const LEGACY = path.join(DATA_DIR, "rounds.json");
const CATALOG = path.join(DATA_DIR, "catalog.json");
const ROUNDS = path.join(DATA_DIR, "rounds-data.json");

async function readJson(file: string): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function writeJson(file: string, data: unknown): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(data, null, 2), "utf8");
}

export const fileStore = createJsonStore({
  readAll: async () => (await readJson(LEGACY)) ?? emptyDb(),
  readCatalog: async () => (await readJson(CATALOG)) ?? emptyCatalog(),
  writeCatalog: async (catalog: CatalogShape) => writeJson(CATALOG, catalog),
  readRounds: async () => (await readJson(ROUNDS)) ?? [],
  writeRounds: async (rounds: RoundState[]) => writeJson(ROUNDS, rounds),
});
