"use client";

import type { CourseHole } from "@/lib/types";

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1">
      <input
        className="field"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (!Number.isFinite(n)) return;
          onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
      />
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
    </div>
  );
}

export function parTotals(holes: CourseHole[]) {
  const out = holes.slice(0, 9).reduce((s, h) => s + h.par, 0);
  const inn = holes.slice(9, 18).reduce((s, h) => s + h.par, 0);
  return { out, inn, total: out + inn, holes: holes.length };
}

export default function HoleParSiEditor({
  holes,
  onChange,
}: {
  holes: CourseHole[];
  onChange: (holes: CourseHole[]) => void;
}) {
  const totals = parTotals(holes);
  const maxSi = Math.max(holes.length, 18);

  function patch(idx: number, field: "par" | "strokeIndex", value: number) {
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
            {holes.map((h, idx) => (
              <tr
                key={h.hole}
                className={`border-b border-white/5 ${
                  h.hole === 9 ? "border-b-white/20" : ""
                }`}
              >
                <td className="px-2 py-1.5 font-medium tabular-nums">{h.hole}</td>
                <td className="px-2 py-1.5">
                  <Stepper
                    value={h.par}
                    min={3}
                    max={6}
                    onChange={(n) => patch(idx, "par", n)}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Stepper
                    value={h.strokeIndex}
                    min={1}
                    max={maxSi}
                    onChange={(n) => patch(idx, "strokeIndex", n)}
                  />
                </td>
              </tr>
            ))}
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
