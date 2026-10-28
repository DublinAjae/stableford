"use client";

import type { HandicapEntry, Member } from "@/lib/types";

const COLORS = [
  "#d6f06a",
  "#7dd3fc",
  "#fbbf24",
  "#f472b6",
  "#a78bfa",
  "#34d399",
  "#fb7185",
  "#e2e8f0",
];

function seriesOf(m: Member): HandicapEntry[] {
  const hist = m.handicapHistory?.length
    ? m.handicapHistory
    : [{ at: m.createdAt, handicap: m.handicap, source: "manual" as const }];
  return hist.slice().sort((a, b) => a.at.localeCompare(b.at));
}

export default function HandicapChart({
  members,
}: {
  members: Member[];
}) {
  if (members.length === 0) {
    return (
      <p className="text-sm text-[var(--foam)]/45">비교할 회원을 선택하세요.</p>
    );
  }

  const all = members.flatMap((m) => seriesOf(m));
  const times = [...new Set(all.map((e) => e.at))].sort();
  const handicaps = all.map((e) => e.handicap);
  const minH = Math.min(...handicaps, 0);
  const maxH = Math.max(...handicaps, 36);
  const pad = 1;
  const yMin = Math.max(0, minH - pad);
  const yMax = maxH + pad;

  const W = 560;
  const H = 220;
  const L = 36;
  const R = 12;
  const T = 16;
  const B = 28;
  const innerW = W - L - R;
  const innerH = H - T - B;

  function xAt(at: string): number {
    if (times.length <= 1) return L + innerW / 2;
    const i = times.indexOf(at);
    return L + (i / (times.length - 1)) * innerW;
  }
  function yAt(h: number): number {
    const t = (h - yMin) / Math.max(0.001, yMax - yMin);
    return T + (1 - t) * innerH;
  }

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full rounded-sm border border-white/10 bg-black/30"
        role="img"
        aria-label="핸디캡 변동 그래프"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const h = yMin + (1 - t) * (yMax - yMin);
          const y = T + t * innerH;
          return (
            <g key={t}>
              <line
                x1={L}
                x2={W - R}
                y1={y}
                y2={y}
                stroke="rgba(238,246,234,0.08)"
              />
              <text
                x={L - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="10"
                fill="rgba(238,246,234,0.45)"
              >
                {Math.round(h)}
              </text>
            </g>
          );
        })}
        {members.map((m, mi) => {
          const series = seriesOf(m);
          const color = COLORS[mi % COLORS.length];
          const d = series
            .map((e, i) => `${i === 0 ? "M" : "L"} ${xAt(e.at)} ${yAt(e.handicap)}`)
            .join(" ");
          return (
            <g key={m.id}>
              <path d={d} fill="none" stroke={color} strokeWidth="2.2" />
              {series.map((e, i) => (
                <circle
                  key={`${m.id}-${i}`}
                  cx={xAt(e.at)}
                  cy={yAt(e.handicap)}
                  r="3.5"
                  fill={color}
                />
              ))}
            </g>
          );
        })}
      </svg>
      <ul className="flex flex-wrap gap-3 text-xs">
        {members.map((m, mi) => {
          const series = seriesOf(m);
          const first = series[0]?.handicap;
          const last = series[series.length - 1]?.handicap ?? m.handicap;
          const delta =
            first != null ? last - first : 0;
          return (
            <li key={m.id} className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS[mi % COLORS.length] }}
              />
              <span className="player-name text-sm">{m.name}</span>
              <span className="player-hcp">
                {last}
                {delta !== 0 && (
                  <span
                    className={
                      delta < 0 ? "text-[var(--lime)]" : "text-amber-200"
                    }
                  >
                    {" "}
                    ({delta > 0 ? "+" : ""}
                    {delta})
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
