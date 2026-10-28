import { blobStore } from "./blob-store";
import { fileStore } from "./file-store";
import { supabaseStore } from "./supabase-store";
import type { RoundStore } from "./types";

export function storeKind(): "supabase" | "blob" | "file" {
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return "supabase";
  }
  if (process.env.BLOB_READ_WRITE_TOKEN) return "blob";
  return "file";
}

export function getStore(): RoundStore {
  const kind = storeKind();
  if (kind === "supabase") return supabaseStore;
  if (kind === "blob") return blobStore;
  return fileStore;
}

export type {
  RoundStore,
  UpsertPlayerInput,
  UpsertGolfCourseInput,
  UpsertMemberInput,
  CreateRoundInput,
} from "./types";
