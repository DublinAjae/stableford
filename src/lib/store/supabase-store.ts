import { createClient } from "@supabase/supabase-js";
import {
  createJsonStore,
  emptyCatalog,
  emptyDb,
  type CatalogShape,
  type DbShape,
  type VersionedRead,
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

async function readKey(id: string): Promise<VersionedRead> {
  const sb = client();
  const { data, error } = await sb
    .from("app_data")
    .select("payload, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return {
    data: data?.payload ?? null,
    etag: (data?.updated_at as string | undefined) ?? null,
  };
}

async function writeKey(
  id: string,
  payload: unknown,
  _etag: string | null,
): Promise<void> {
  const sb = client();
  const { error } = await sb.from("app_data").upsert({
    id,
    payload,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const supabaseStore = createJsonStore({
  readAll: async () => ((await readKey("1")).data as DbShape | null) ?? emptyDb(),
  readCatalog: async () => {
    const v = await readKey("catalog");
    return { data: v.data ?? emptyCatalog(), etag: v.etag };
  },
  writeCatalog: async (catalog: CatalogShape, etag) =>
    writeKey("catalog", catalog, etag),
  readRounds: async () => {
    const v = await readKey("rounds");
    return { data: v.data ?? [], etag: v.etag };
  },
  writeRounds: async (rounds: RoundState[], etag) =>
    writeKey("rounds", rounds, etag),
  isMigrated: async () => Boolean((await readKey("migrated")).data),
  markMigrated: async () => writeKey("migrated", { ok: true }, null),
});
