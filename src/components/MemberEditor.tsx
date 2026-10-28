"use client";

import { useState } from "react";
import type { Member } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  handicap: string;
};

function toDraft(m?: Member | null): Draft {
  if (!m) return { name: "", handicap: "18" };
  return { id: m.id, name: m.name, handicap: String(m.handicap) };
}

export default function MemberEditor({
  members,
  onChanged,
}: {
  members: Member[];
  onChanged: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(null));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function edit(m: Member) {
    setDraft(toDraft(m));
    setNote(null);
    setError(null);
  }

  function reset() {
    setDraft(toDraft(null));
    setNote(null);
    setError(null);
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const handicap = Number(draft.handicap);
      const payload = {
        id: draft.id,
        name: draft.name.trim(),
        handicap: Number.isFinite(handicap) ? handicap : 18,
      };
      const res = await fetch(
        draft.id ? `/api/members/${draft.id}` : "/api/members",
        {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      await onChanged();
      setNote("회원 저장됨");
      if (!draft.id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 회원을 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error || "삭제 실패");
      }
      await onChanged();
      if (draft.id === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--foam)]/55">회원 명단</p>
          <button type="button" className="btn-ghost" onClick={reset}>
            새 회원
          </button>
        </div>
        {members.length === 0 ? (
          <p className="text-sm text-[var(--foam)]/40">아직 회원이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-sm border border-white/10 bg-black/25 px-3 py-2"
              >
                <button type="button" className="text-left" onClick={() => edit(m)}>
                  <p className="font-medium text-[var(--foam)]">{m.name}</p>
                  <p className="text-xs text-[var(--foam)]/45">HCP {m.handicap}</p>
                </button>
                <button
                  type="button"
                  className="text-xs text-[var(--foam)]/40 hover:text-red-200"
                  onClick={() => void remove(m.id)}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-4 rounded-sm border border-white/10 bg-black/25 p-4">
        <p className="text-sm font-medium text-[var(--foam)]">
          {draft.id ? "회원 수정" : "회원 추가"}
        </p>
        <label className="block text-xs text-[var(--foam)]/45">
          이름
          <input
            className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="예: Kim"
          />
        </label>
        <label className="block text-xs text-[var(--foam)]/45">
          핸디캡
          <input
            className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
            inputMode="numeric"
            value={draft.handicap}
            onChange={(e) => setDraft({ ...draft, handicap: e.target.value })}
          />
        </label>
        <button
          type="button"
          className="btn-solid"
          disabled={busy || !draft.name.trim()}
          onClick={() => void save()}
        >
          회원 저장
        </button>
        {note && <p className="text-sm text-[var(--foam)]/55">{note}</p>}
        {error && <p className="text-sm text-red-200">{error}</p>}
      </div>
    </div>
  );
}
