import { createClient } from "@supabase/supabase-js";
import { createJsonStore, emptyDb, type DbShape } from "./json-db";

const ROW_ID = 1;

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

async function read(): Promise<unknown> {
  const sb = client();
  const { data, error } = await sb
    .from("app_data")
    .select("payload")
    .eq("id", ROW_ID)
    .maybeSingle();
  if (error) throw error;
  return data?.payload ?? emptyDb();
}

async function write(db: DbShape): Promise<void> {
  const sb = client();
  const { error } = await sb.from("app_data").upsert({
    id: ROW_ID,
    payload: db,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export const supabaseStore = createJsonStore({ read, write });
