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
      if (body.state.round.updatedAt !== updatedAtRef.current || !state) {
        updatedAtRef.current = body.state.round.updatedAt;
        setState(body.state);
      } else {
        // still sync admin flag
        setState(body.state);
      }
      setAdmin(body.admin);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [slug, state]);

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
  }, [slug, intervalMs]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state,
    setState,
    admin,
    loading,
    error,
    refresh,
  };
}
