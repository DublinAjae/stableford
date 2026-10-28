"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RoundState } from "@/lib/types";

type Options = {
  slug: string;
  intervalMs?: number;
};

export function useRoundState({ slug, intervalMs = 1500 }: Options) {
  const [state, setState] = useState<RoundState | null>(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const updatedAtRef = useRef<string>("");

  /** Apply authoritative server state (also advances the poll watermark). */
  const applyServerState = useCallback((next: RoundState) => {
    updatedAtRef.current = next.round.updatedAt;
    setState(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rounds/${slug}`, { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "불러오기 실패");
      }
      const body = (await res.json()) as {
        state: RoundState;
        admin: boolean;
      };
      const incoming = body.state.round.updatedAt;
      // Only replace local state when the server actually has a newer revision.
      // This preserves unsaved edits (e.g. drafted players/groups).
      if (!updatedAtRef.current || incoming > updatedAtRef.current) {
        updatedAtRef.current = incoming;
        setState(body.state);
      }
      setAdmin(body.admin);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };
    void tick();
    const id = setInterval(() => void tick(), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [slug, intervalMs, refresh]);

  return {
    state,
    setState,
    applyServerState,
    admin,
    loading,
    error,
    refresh,
  };
}
