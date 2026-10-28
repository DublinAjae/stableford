"use client";

import { useState } from "react";
import HoleParSiEditor, {
  hasDuplicateStrokeIndexes,
  parTotals,
} from "@/components/HoleParSiEditor";
import { emptyHoles, TEE_COLOR_LABELS } from "@/lib/courses";
import { recognizeScorecard } from "@/lib/ocr";
import type { CourseHole, GolfCourse, TeeColor } from "@/lib/types";
import { TEE_COLORS } from "@/lib/types";

type Draft = {
  id?: string;
  name: string;
  lengthMeters: string;
  teeColor: TeeColor;
  holeCount: 9 | 18;
  holes: CourseHole[];
};

function toDraft(c?: GolfCourse | null): Draft {
  if (!c) {
    return {
      name: "",
      lengthMeters: "",
      teeColor: "white",
      holeCount: 18,
      holes: emptyHoles(18),
    };
  }
  return {
    id: c.id,
    name: c.name,
    lengthMeters: c.lengthMeters != null ? String(c.lengthMeters) : "",
    teeColor: c.teeColor,
    holeCount: c.holeCount,
    holes: c.holes,
  };
}

export default function CourseEditor({
  courses,
  onChanged,
}: {
  courses: GolfCourse[];
  onChanged: () => Promise<void> | void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(null));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function edit(c: GolfCourse) {
    setDraft(toDraft(c));
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
      if (hasDuplicateStrokeIndexes(draft.holes)) {
        throw new Error(
          "SI가 중복된 홀이 있어 저장할 수 없습니다. 하이라이트된 SI를 수정하세요.",
        );
      }
      const payload = {
        id: draft.id,
        name: draft.name.trim(),
        lengthMeters: draft.lengthMeters.trim()
          ? Number(draft.lengthMeters)
          : null,
        teeColor: draft.teeColor,
        holeCount: draft.holeCount,
        holes: draft.holes,
      };
      const res = await fetch(
        draft.id ? `/api/courses/${draft.id}` : "/api/courses",
        {
          method: draft.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const body = (await res.json()) as {
        course?: GolfCourse;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error || "저장 실패");
      if (body.course) setDraft(toDraft(body.course));
      await onChanged();
      setNote("코스 저장됨");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 코스를 삭제할까요?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
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

  async function onPhoto(file: File) {
    setNote("스코어카드에서 Par / SI 읽는 중…");
    try {
      const result = await recognizeScorecard(file);
      const holes = draft.holes.map((h) => {
        const parsed = result.holes.find((x) => x.hole === h.hole);
        return {
          hole: h.hole,
          par: parsed?.par ?? h.par,
          strokeIndex: parsed?.strokeIndex ?? h.strokeIndex,
        };
      });
      setDraft({ ...draft, holes });
      setNote(`OCR 완료 (${result.confidence}). 확인 후 저장하세요.`);
    } catch {
      setNote("OCR 실패 — 수동 입력해 주세요.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--foam)]/55">
            저장된 코스 ({courses.length})
          </p>
          <button type="button" className="btn-ghost" onClick={reset}>
            새 코스
          </button>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-[var(--foam)]/40">아직 코스가 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {courses.map((c) => {
              const totals = parTotals(c.holes);
              return (
                <li
                  key={c.id}
                  className={`flex items-center justify-between gap-2 rounded-sm border px-3 py-2 ${
                    draft.id === c.id
                      ? "border-[var(--lime)]/50 bg-[var(--lime)]/10"
                      : "border-white/10 bg-black/25"
                  }`}
                >
                  <button
                    type="button"
                    className="text-left"
                    onClick={() => edit(c)}
                  >
                    <p className="font-medium text-[var(--foam)]">{c.name}</p>
                    <p className="text-xs text-[var(--foam)]/45">
                      {TEE_COLOR_LABELS[c.teeColor]}
                      {c.lengthMeters != null ? ` · ${c.lengthMeters}m` : ""} ·{" "}
                      {c.holeCount}홀 · Par {totals.total}
                    </p>
                  </button>
                  <button
                    type="button"
                    className="text-xs text-[var(--foam)]/40 hover:text-red-200"
                    onClick={() => void remove(c.id)}
                  >
                    삭제
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-4 rounded-sm border border-white/10 bg-black/25 p-4">
        <p className="text-sm font-medium text-[var(--foam)]">
          {draft.id ? "코스 수정" : "코스 추가"}
        </p>
        <label className="block text-xs text-[var(--foam)]/45">
          코스 이름
          <input
            className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="예: Stackstown GC"
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-xs text-[var(--foam)]/45">
            길이 (m)
            <input
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              inputMode="numeric"
              value={draft.lengthMeters}
              onChange={(e) =>
                setDraft({ ...draft, lengthMeters: e.target.value })
              }
              placeholder="5800"
            />
          </label>
          <label className="block text-xs text-[var(--foam)]/45">
            티오프 색깔
            <select
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              value={draft.teeColor}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  teeColor: e.target.value as TeeColor,
                })
              }
            >
              {TEE_COLORS.map((c) => (
                <option key={c} value={c}>
                  {TEE_COLOR_LABELS[c]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-[var(--foam)]/45">
            홀 수
            <select
              className="mt-1 w-full rounded-sm border border-white/15 bg-black/30 px-3 py-2 text-[var(--foam)] outline-none focus:border-[var(--lime)]"
              value={draft.holeCount}
              onChange={(e) => {
                const holeCount = Number(e.target.value) as 9 | 18;
                setDraft({
                  ...draft,
                  holeCount,
                  holes: emptyHoles(holeCount).map((h) => {
                    const prev = draft.holes.find((x) => x.hole === h.hole);
                    return prev ?? h;
                  }),
                });
              }}
            >
              <option value={18}>18</option>
              <option value={9}>9</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="btn-ghost cursor-pointer">
            사진으로 Par/SI
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onPhoto(f);
              }}
            />
          </label>
          <button
            type="button"
            className="btn-solid"
            disabled={
              busy ||
              !draft.name.trim() ||
              hasDuplicateStrokeIndexes(draft.holes)
            }
            onClick={() => void save()}
          >
            코스 저장
          </button>
        </div>
        {hasDuplicateStrokeIndexes(draft.holes) && (
          <p className="text-sm text-amber-100">
            SI 중복이 있어 저장할 수 없습니다. 하이라이트된 값을 수정하세요.
          </p>
        )}
        {note && <p className="text-sm text-[var(--foam)]/55">{note}</p>}
        {error && <p className="text-sm text-red-200">{error}</p>}

        <HoleParSiEditor
          holes={draft.holes}
          onChange={(holes) => setDraft({ ...draft, holes })}
        />
      </div>
    </div>
  );
}
