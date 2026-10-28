import { createClient } from "@supabase/supabase-js";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
  type DbShape,
} from "./json-db";
import type { RoundState } from "@/lib/types";

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase 환경변수가 없습니다.");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function readKey(id: string): Promise<unknown | null> {
  const sb = client();
  const { data, error } = await sb
    .from("app_data")
    .select("payload")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data?.payload ?? null;
}

async function writeKey(id: string, payload: unknown): Promise<void> {
  const sb = client();
  const { error } = await sb.from("app_data").upsert({
    id,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const supabaseStore = createJsonStore({
  readAll: async () => ((await readKey("1")) as DbShape | null) ?? emptyDb(),
  readCatalog: async () =>
    ((await readKey("catalog")) as CatalogShape | null) ?? emptyCatalog(),
  writeCatalog: async (catalog: CatalogShape) => writeKey("catalog", catalog),
  readRounds: async () =>
    ((await readKey("rounds")) as RoundState[] | null) ?? [],
  writeRounds: async (rounds: RoundState[]) => writeKey("rounds", rounds),
});
