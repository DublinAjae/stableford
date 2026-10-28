"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Shell from "@/components/Shell";
import Podium from "@/components/Podium";
import StandingsTable from "@/components/StandingsTable";
import ScoreGrid from "@/components/ScoreGrid";
import CourseEditor from "@/components/CourseEditor";
import HoleParSiEditor from "@/components/HoleParSiEditor";
import MemberEditor from "@/components/MemberEditor";
import { useRoundState } from "@/hooks/useRoundState";
import { TEE_COLOR_LABELS } from "@/lib/courses";
import { groupCodes, rankPlayers } from "@/lib/ranking";
import type { GolfCourse, Member, RoundState } from "@/lib/types";
import type { UpsertPlayerInput } from "@/lib/store";

export default function AdminPanel({ slug }: { slug: string }) {
  const { state, setState, applyServerState, admin, loading, error, refresh } =
    useRoundState({
      slug,
    });
  const [pin, setPin] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<
    "live" | "course" | "players" | "catalog" | "members"
  >("live");
  const [ocrNote, setOcrNote] = useState<string | null>(null);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  const standings = useMemo(
    () => (state ? rankPlayers(state) : []),
    [state],
  );
  const groups = useMemo(
    () => (state ? groupCodes(state.players) : []),
    [state],
  );

  const loadCourses = useCallback(async () => {
    const res = await fetch("/api/courses", { cache: "no-store" });
    const body = (await res.json()) as { courses: GolfCourse[] };
    setCourses(body.courses || []);
  }, []);

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/members", { cache: "no-store" });
    const body = (await res.json()) as { members: Member[] };
    setMembers(body.members || []);
  }, []);

  useEffect(() => {
    if (admin) {
      void loadCourses();
      void loadMembers();
    }
  }, [admin, loadCourses, loadMembers]);

  useEffect(() => {
    if (state?.round.courseId) setSelectedCourseId(state.round.courseId);
  }, [state?.round.courseId]);

  async function login() {
    setLoginError(null);
    const res = await fetch(`/api/rounds/${slug}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setLoginError(body?.error || "로그인 실패");
      return;
    }
    await refresh();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    await refresh();
  }

  async function applyCatalogCourse() {
    if (!selectedCourseId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: selectedCourseId }),
      });
      const body = (await res.json()) as { state?: RoundState; error?: string };
      if (!res.ok) throw new Error(body.error || "적용 실패");
      if (body.state) applyServerState(body.state);
      setOcrNote("선택한 코스의 Par/SI가 이 대회에 적용되었습니다.");
    } finally {
      setBusy(false);
    }
  }

  async function savePlayers(players: UpsertPlayerInput[]) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${slug}/players`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players }),
      });
      const body = (await res.json()) as { state?: RoundState; error?: string };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      if (body.state) applyServerState(body.state);
      return body.state;
    } finally {
      setBusy(false);
    }
  }

  async function saveScore(playerId: string, hole: number, gross: number | null) {
    if (!state || state.round.closed) return;
    const nextScores = state.scores.filter(
      (s) => !(s.playerId === playerId && s.hole === hole),
    );
    nextScores.push({ playerId, hole, gross });
    setState({ ...state, scores: nextScores });

    const res = await fetch(`/api/rounds/${slug}/scores`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scores: [{ playerId, hole, gross }] }),
    });
    const body = (await res.json()) as { state?: RoundState; error?: string };
    if (body.state) applyServerState(body.state);
    else if (body.error) setOcrNote(body.error);
  }

  async function setClosed(closed: boolean) {
    setBusy(true);
    try {
      const res = await fetch(`/api/rounds/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ closed }),
      });
      const body = (await res.json()) as { state?: RoundState; error?: string };
      if (!res.ok) throw new Error(body.error || "상태 변경 실패");
      if (body.state) applyServerState(body.state);
    } finally {
      setBusy(false);
    }
  }

  if (loading && !state) {
    return (
      <Shell title="Admin">
        <p className="text-[var(--foam)]/60">불러오는 중…</p>
      </Shell>
    );
  }

  if (error || !state) {
    return (
      <Shell title="Admin">
        <p className="text-red-200">{error || "대회 없음"}</p>
      </Shell>
    );
  }

  if (!admin) {
    return (
      <Shell title={`${state.round.name} · Admin`}>
        <div className="mx-auto max-w-sm rounded-sm border border-white/10 bg-black/25 p-6">
          <p className="text-sm text-[var(--foam)]/60">Admin PIN</p>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void login();
            }}
            className="mt-3 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-3 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
          />
          {loginError && (
            <p className="mt-2 text-sm text-red-200">{loginError}</p>
          )}
          <button
            type="button"
            onClick={() => void login()}
            className="mt-4 w-full rounded-sm bg-[var(--lime)] px-4 py-3 font-semibold text-[var(--ink)]"
          >
            로그인
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell
      title={`${state.round.name} · Admin`}
      subtitle={`${state.round.date} · ${state.round.courseName} · ${TEE_COLOR_LABELS[state.round.teeColor]}${
        state.round.lengthMeters != null ? ` · ${state.round.lengthMeters}m` : ""
      }`}
      actions={
        <>
          <Link className="btn-ghost" href={`/r/${slug}`}>
            공개 보드
          </Link>
          {groups.map((g) => (
            <Link key={g} className="btn-ghost" href={`/r/${slug}/g/${g}`}>
              {g}조
            </Link>
          ))}
          <button type="button" className="btn-ghost" onClick={() => void logout()}>
            로그아웃
          </button>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["live", "라이브 보드"],
            ["course", "대회 코스"],
            ["catalog", "코스 관리"],
            ["members", "회원 명단"],
            ["players", "플레이어 / 조"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? "btn-solid" : "btn-ghost"}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "live" && (
        <div className="space-y-8">
          <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-white/10 bg-black/25 px-4 py-3">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--lime)]"
              checked={Boolean(state.round.closed)}
              disabled={busy}
              onChange={(e) => void setClosed(e.target.checked)}
            />
            <span>
              <span className="font-semibold text-[var(--foam)]">대회 종료</span>
              <span className="mt-0.5 block text-sm text-[var(--foam)]/50">
                체크하면 타수·포인트 입력이 잠깁니다. 해제하면 다시 수정할 수
                있습니다.
              </span>
            </span>
          </label>
          {state.round.closed && (
            <p className="rounded-sm border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
              대회가 종료되어 스코어 수정이 잠겨 있습니다.
            </p>
          )}
          <Podium standings={standings} />
          <StandingsTable standings={standings} />
          <ScoreGrid
            state={state}
            players={state.players}
            editable={!state.round.closed}
            onChangeGross={(playerId, hole, gross) =>
              void saveScore(playerId, hole, gross)
            }
          />
        </div>
      )}

      {tab === "course" && (
        <div className="space-y-4">
          <div className="rounded-sm border border-white/10 bg-black/25 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
              골프 코스 선택
            </p>
            <p className="mt-2 text-sm text-[var(--foam)]/50">
              대회 코스의 Par/SI는 여기서 수정할 수 없습니다. 코스 관리에서
              수정한 뒤 다시 적용하세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <select
                className="min-w-[16rem] flex-1 rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
              >
                <option value="">코스 선택</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {TEE_COLOR_LABELS[c.teeColor]}
                    {c.lengthMeters != null ? ` · ${c.lengthMeters}m` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-solid"
                disabled={busy || !selectedCourseId}
                onClick={() => void applyCatalogCourse()}
              >
                이 대회에 적용
              </button>
            </div>
          </div>

          {ocrNote && (
            <p className="text-sm text-[var(--foam)]/55">{ocrNote}</p>
          )}
          <div className="rounded-sm border border-white/10 bg-black/20 p-3">
            <HoleParSiEditor holes={state.course} readOnly />
          </div>
        </div>
      )}

      {tab === "catalog" && (
        <CourseEditor courses={courses} onChanged={loadCourses} />
      )}

      {tab === "members" && (
        <MemberEditor members={members} onChanged={loadMembers} />
      )}

      {tab === "players" && (
        <PlayersEditor
          state={state}
          members={members}
          busy={busy}
          onSave={savePlayers}
        />
      )}
    </Shell>
  );
}

function toPlayerRows(state: RoundState): UpsertPlayerInput[] {
  return state.players.map((p, i) => ({
    id: p.id,
    memberId: p.memberId,
    name: p.name,
    courseHandicap: p.courseHandicap,
    groupCode: p.groupCode,
    sortOrder: p.sortOrder ?? i,
  }));
}

function PlayersEditor({
  state,
  members,
  busy,
  onSave,
}: {
  state: RoundState;
  members: Member[];
  busy: boolean;
  onSave: (players: UpsertPlayerInput[]) => Promise<RoundState | undefined>;
}) {
  const [pickIds, setPickIds] = useState<string[]>([]);
  const [defaultGroup, setDefaultGroup] = useState("A");
  const [draft, setDraft] = useState<UpsertPlayerInput[]>(() =>
    toPlayerRows(state),
  );
  const [note, setNote] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const serverStamp = state.round.updatedAt;

  useEffect(() => {
    setDraft(toPlayerRows(state));
    // Only reset draft when the server revision changes (after save/poll).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverStamp]);

  const already = new Set(
    draft.map((r) => r.memberId).filter(Boolean) as string[],
  );
  const available = members.filter((m) => !already.has(m.id));

  function update(i: number, patch: Partial<UpsertPlayerInput>) {
    setDraft((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  async function persist(next: UpsertPlayerInput[], successMsg: string) {
    setSaveError(null);
    setNote(null);
    try {
      await onSave(next);
      setNote(successMsg);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "저장 실패");
    }
  }

  async function importSelected() {
    const selected = members.filter((m) => pickIds.includes(m.id));
    if (!selected.length) return;
    const group = defaultGroup.toUpperCase() || "A";
    const next = [
      ...draft,
      ...selected.map((m, i) => ({
        memberId: m.id,
        name: m.name,
        courseHandicap: m.handicap,
        groupCode: group,
        sortOrder: draft.length + i,
      })),
    ];
    setDraft(next);
    setPickIds([]);
    await persist(next, `${selected.length}명 ${group}조로 저장됨`);
  }

  function togglePick(id: string) {
    setPickIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-sm border border-white/10 bg-black/25 p-4">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/45">
          회원 명단에서 불러오기
        </p>
        {available.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--foam)]/45">
            불러올 회원이 없습니다. 「회원 명단」탭에서 먼저 추가하세요.
          </p>
        ) : (
          <>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {available.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-sm border border-white/10 bg-black/20 px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={pickIds.includes(m.id)}
                      onChange={() => togglePick(m.id)}
                    />
                    <span className="text-[var(--foam)]">{m.name}</span>
                    <span className="text-[var(--foam)]/45">HCP {m.handicap}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="text-xs text-[var(--foam)]/45">
                기본 조
                <input
                  className="field ml-2"
                  value={defaultGroup}
                  onChange={(e) =>
                    setDefaultGroup(e.target.value.toUpperCase().slice(0, 2))
                  }
                />
              </label>
              <button
                type="button"
                className="btn-solid"
                disabled={busy || !pickIds.length}
                onClick={() => void importSelected()}
              >
                선택 회원으로 조 추가·저장
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost"
          disabled={busy}
          onClick={() =>
            setDraft((prev) => [
              ...prev,
              {
                memberId: null,
                name: `Player ${prev.length + 1}`,
                courseHandicap: 18,
                groupCode: "A",
                sortOrder: prev.length,
              },
            ])
          }
        >
          직접 추가
        </button>
        <button
          type="button"
          className="btn-solid"
          disabled={busy}
          onClick={() => void persist(draft, "플레이어/조 저장됨")}
        >
          플레이어/조 저장
        </button>
      </div>
      {note && <p className="text-sm text-[var(--lime)]">{note}</p>}
      {saveError && <p className="text-sm text-red-200">{saveError}</p>}
      <div className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
        <table className="w-full min-w-[32rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--foam)]/45">
              <th className="px-3 py-3 text-left">이름</th>
              <th className="px-3 py-3 text-left">HCP</th>
              <th className="px-3 py-3 text-left">조</th>
              <th className="px-3 py-3 text-left" />
            </tr>
          </thead>
          <tbody>
            {draft.map((p, i) => (
              <tr key={p.id || `new-${i}`} className="border-b border-white/5">
                <td className="px-2 py-1.5">
                  <input
                    className="w-40 rounded-sm border border-white/15 bg-black/30 px-2 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                    value={p.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="field"
                    value={p.courseHandicap}
                    onChange={(e) =>
                      update(i, {
                        courseHandicap: Number(e.target.value) || 0,
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    className="field"
                    value={p.groupCode}
                    onChange={(e) =>
                      update(i, {
                        groupCode: e.target.value.toUpperCase().slice(0, 2),
                      })
                    }
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    type="button"
                    className="text-sm text-[var(--foam)]/45 hover:text-red-200"
                    onClick={() =>
                      setDraft((prev) => prev.filter((_, idx) => idx !== i))
                    }
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-[var(--foam)]/45">
        조 링크 예:{" "}
        <code className="text-[var(--lime)]">/r/{state.round.slug}/g/A</code>
      </p>
    </div>
  );
}
