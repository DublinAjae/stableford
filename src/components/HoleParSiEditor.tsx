"use client";

import type { CourseHole } from "@/lib/types";

function Stepper({
  value,
  min,
  max,
  onChange,
  disabled,
  invalid,
  tone,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  invalid?: boolean;
  tone?: string;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <input
        className={`field ${invalid ? "field-invalid" : ""} ${tone || ""}`}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
      />
      {!disabled && (
        <div className="flex flex-col gap-0.5">
          <button
            type="button"
            className="stepper-btn"
            aria-label="증가"
            onClick={() => onChange(Math.min(max, value + 1))}
          >
            ▲
          </button>
          <button
            type="button"
            className="stepper-btn"
            aria-label="감소"
            onClick={() => onChange(Math.max(min, value - 1))}
          >
            ▼
          </button>
        </div>
      )}
    </div>
  );
}

export function parTotals(holes: CourseHole[]) {
  const out = holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
  const inn = holes.slice(9, 18).reduce((s, h) => s + h.par, 0);
  return { out, inn, total: out + inn, holes: holes.length };
}

export function duplicateStrokeIndexes(holes: CourseHole[]): Set<number> {
  const counts = new Map<number, number>();
  for (const h of holes) {
    counts.set(h.strokeIndex, (counts.get(h.strokeIndex) || 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, n]) => n > 1).map(([si]) => si),
  );
}

export function hasDuplicateStrokeIndexes(holes: CourseHole[]): boolean {
  return duplicateStrokeIndexes(holes).size > 0;
}

function parClass(par: number): string {
  if (par === 3) return "par-3";
  if (par === 5) return "par-5";
  return "";
}

function parFieldTone(par: number): string {
  if (par === 3) return "field-par-3";
  if (par === 5) return "field-par-5";
  return "";
}

export default function HoleParSiEditor({
  holes,
  onChange,
  readOnly = false,
}: {
  holes: CourseHole[];
  onChange?: (holes: CourseHole[]) => void;
  readOnly?: boolean;
}) {
  const totals = parTotals(holes);
  const maxSi = Math.max(holes.length, 18);
  const dupes = duplicateStrokeIndexes(holes);

  function patch(idx: number, field: "par" | "strokeIndex", value: number) {
    if (readOnly || !onChange) return;
    onChange(
      holes.map((h, i) =>
        i === idx
          ? {
              ...h,
              [field]: value,
            }
          : h,
      ),
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2 rounded-sm border border-white/10 bg-black/25 p-3 text-sm">
        <div>
          <p className="text-xs text-[var(--foam)]/45">Out Par</p>
          <p className="font-semibold tabular-nums text-[var(--lime)]">
            {totals.out}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--foam)]/45">In Par</p>
          <p className="font-semibold tabular-nums text-[var(--lime)]">
            {totals.holes > 9 ? totals.inn : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--foam)]/45">Total Par</p>
          <p className="font-semibold tabular-nums text-[var(--lime)]">
            {totals.total}
          </p>
        </div>
      </div>

      {dupes.size > 0 && !readOnly && (
        <p className="rounded-sm border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          SI 중복: {[...dupes].sort((a, b) => a - b).join(", ")} — 각 홀 SI는
          서로 달라야 저장할 수 있습니다.
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[var(--foam)]/45">
              <th className="px-2 py-2 text-left">Hole</th>
              <th className="px-2 py-2 text-left">Par</th>
              <th className="px-2 py-2 text-left">SI</th>
            </tr>
          </thead>
          <tbody>
            {holes.map((h, idx) => {
              const siDup = dupes.has(h.strokeIndex);
              return (
                <tr
                  key={h.hole}
                  className={`border-b border-white/5 ${
                    h.hole === 9 ? "border-b-white/20" : ""
                  } ${siDup ? "bg-amber-400/10" : ""}`}
                >
                  <td className="px-2 py-1.5 font-medium tabular-nums">
                    {h.hole}
                  </td>
                  <td className={`px-2 py-1.5 ${parClass(h.par)}`}>
                    {readOnly ? (
                      <span className="inline-block min-w-[2rem] font-semibold tabular-nums">
                        {h.par}
                      </span>
                    ) : (
                      <Stepper
                        value={h.par}
                        min={3}
                        max={6}
                        tone={parFieldTone(h.par)}
                        onChange={(n) => patch(idx, "par", n)}
                      />
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {readOnly ? (
                      <span
                        className={`inline-block min-w-[2rem] tabular-nums ${
                          siDup ? "font-semibold text-amber-200" : ""
                        }`}
                      >
                        {h.strokeIndex}
                      </span>
                    ) : (
                      <Stepper
                        value={h.strokeIndex}
                        min={1}
                        max={maxSi}
                        invalid={siDup}
                        onChange={(n) => patch(idx, "strokeIndex", n)}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15">
              <td className="px-2 py-2 font-medium">합계</td>
              <td className="px-2 py-2 font-semibold tabular-nums text-[var(--lime)]">
                {totals.total}
              </td>
              <td className="px-2 py-2 text-[var(--foam)]/40">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
