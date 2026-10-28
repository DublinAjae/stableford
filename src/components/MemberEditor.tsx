"use client";

import { useEffect, useMemo, useState } from "react";
import HandicapChart from "@/components/HandicapChart";
import { awardLabel, awardsForMembers } from "@/lib/members";
import type { Member, RoundListItem, RoundState } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  handicap: string;
  notes: string;
};

function toDraft(m?: Member | null): Draft {
  if (!m) return { name: "", handicap: "18", notes: "" };
  return {
    id: m.id,
    name: m.name,
    handicap: String(m.handicap),
    notes: m.notes || "",
  };
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
  const [rounds, setRounds] = useState<RoundState[]>([]);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const listRes = await fetch("/api/rounds", { cache: "no-store" });
      const listBody = (await listRes.json()) as { rounds?: RoundListItem[] };
      const items = listBody.rounds || [];
      const loaded: RoundState[] = [];
      for (const item of items.slice(0, 20)) {
        const res = await fetch(`/api/rounds/${item.slug}`, {
          cache: "no-store",
        });
        if (!res.ok) continue;
        const body = (await res.json()) as { state?: RoundState };
        if (body.state) loaded.push(body.state);
      }
      if (!cancelled) setRounds(loaded);
    })().catch(() => {
      /* ignore */
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const awardsMap = useMemo(
    () => awardsForMembers(members, rounds),
    [members, rounds],
  );

  const selected = members.find((m) => m.id === draft.id) || null;
  const compareMembers = members.filter((m) => compareIds.includes(m.id));

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
        notes: draft.notes,
      };
      const res = await fetch(
        draft.id ? `/api/members/${draft.id}` : "/api/members",
        {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as { member?: Member; error?: string };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      await onChanged();
      setNote("회원 저장됨");
      if (body.member) setDraft(toDraft(body.member));
      else if (!draft.id) reset();
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
      setCompareIds((prev) => prev.filter((x) => x !== id));
      if (draft.id === id) reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  function toggleCompare(id: string) {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-6),
    );
  }

  return (
    <div className="space-y-8">
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
              {members.map((m) => {
                const awards = awardsMap.get(m.id) || [];
                return (
                  <li
                    key={m.id}
                    className={`rounded-sm border px-3 py-2 ${
                      draft.id === m.id
                        ? "border-[var(--lime)]/50 bg-[var(--lime)]/10"
                        : "border-white/10 bg-black/25"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => edit(m)}
                      >
                        <p className="player-name">{m.name}</p>
                        <p className="player-hcp">HCP {m.handicap}</p>
                        {m.notes ? (
                          <p className="mt-1 line-clamp-1 text-xs text-[var(--foam)]/45">
                            {m.notes}
                          </p>
                        ) : null}
                        {awards.length > 0 && (
                          <p className="mt-1 text-xs text-[var(--lime)]">
                            {awards
                              .slice(0, 3)
                              .map((a) => `${a.date.slice(5)} ${awardLabel(a.rank)}`)
                              .join(" · ")}
                          </p>
                        )}
                      </button>
                      <div className="flex flex-col items-end gap-1">
                        <label className="flex cursor-pointer items-center gap-1 text-[10px] text-[var(--foam)]/45">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(m.id)}
                            onChange={() => toggleCompare(m.id)}
                          />
                          비교
                        </label>
                        <button
                          type="button"
                          className="text-xs text-[var(--foam)]/40 hover:text-red-200"
                          onClick={() => void remove(m.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
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
          <label className="block text-xs text-[var(--foam)]/45">
            비고
            <textarea
              className="mt-1 min-h-[5rem] w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-sm text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              placeholder="메모, 부상, 선호 티 등"
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

          {selected && (
            <div className="space-y-3 border-t border-white/10 pt-4">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
                최근 수상
              </p>
              {(awardsMap.get(selected.id) || []).length === 0 ? (
                <p className="text-sm text-[var(--foam)]/40">
                  아직 기록된 수상이 없습니다.
                </p>
              ) : (
                <ul className="space-y-1.5 text-sm">
                  {(awardsMap.get(selected.id) || []).slice(0, 8).map((a) => (
                    <li
                      key={`${a.roundSlug}-${a.rank}-${a.date}`}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="text-[var(--foam)]">
                        <span className="font-semibold text-[var(--lime)]">
                          {awardLabel(a.rank)}
                        </span>{" "}
                        {a.roundName}
                      </span>
                      <span className="tabular-nums text-[var(--foam)]/45">
                        {a.date} · {a.points}pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
                핸디 이력
              </p>
              <HandicapChart members={[selected]} />
            </div>
          )}
        </div>
      </div>

      <div className="rounded-sm border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
          회원별 핸디캡 비교
        </p>
        <p className="mt-1 text-sm text-[var(--foam)]/45">
          목록에서 「비교」를 체크하면 최대 6명까지 한 그래프에 표시됩니다.
        </p>
        <div className="mt-4">
          <HandicapChart
            members={
              compareMembers.length > 0
                ? compareMembers
                : selected
                  ? [selected]
                  : []
            }
          />
        </div>
      </div>
    </div>
  );
}
