"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { emptyRound, scoreRound } from "@/lib/stableford";
import { recognizeScorecard, type OcrProgress } from "@/lib/ocr";
import type { HoleData } from "@/lib/types";

type Phase = "home" | "working";

function clampInt(
  value: string,
  min: number,
  max: number,
): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default function ScorecardApp() {
  const [phase, setPhase] = useState<Phase>("home");
  const [holes, setHoles] = useState<HoleData[]>(() => emptyRound(18));
  const [courseHandicap, setCourseHandicap] = useState(18);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgress | null>(null);
  const [ocrNotes, setOcrNotes] = useState<string[]>([]);
  const [ocrText, setOcrText] = useState<string>("");
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary = useMemo(
    () => scoreRound(holes, courseHandicap),
    [holes, courseHandicap],
  );

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  function startManual() {
    setPhase("working");
    setHoles(emptyRound(18));
    setOcrNotes(["직접 입력 모드입니다."]);
    setOcrText("");
    setError(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setError(null);
    setPhase("working");
    setOcrBusy(true);
    setOcrProgress({ status: "loading", progress: 0 });
    setOcrNotes([]);
    setOcrText("");

    if (imageUrl) URL.revokeObjectURL(imageUrl);
    const url = URL.createObjectURL(file);
    setImageUrl(url);

    try {
      const result = await recognizeScorecard(file, setOcrProgress);
      setHoles(result.holes);
      if (result.courseHandicap != null) {
        setCourseHandicap(result.courseHandicap);
      }
      setOcrNotes(result.notes);
      setOcrText(result.text);
    } catch (e) {
      console.error(e);
      setError(
        "OCR에 실패했습니다. 사진을 확인하거나 아래에서 직접 입력해 주세요.",
      );
      setHoles(emptyRound(18));
      setOcrNotes(["OCR 실패 — 수동 입력으로 전환했습니다."]);
    } finally {
      setOcrBusy(false);
      setOcrProgress(null);
    }
  }

  function updateHole(
    index: number,
    field: keyof Omit<HoleData, "hole">,
    value: string,
  ) {
    setHoles((prev) => {
      const next = [...prev];
      const hole = { ...next[index] };
      if (field === "par") hole.par = clampInt(value, 3, 6);
      if (field === "strokeIndex") hole.strokeIndex = clampInt(value, 1, 18);
      if (field === "gross") hole.gross = clampInt(value, 1, 20);
      next[index] = hole;
      return next;
    });
  }

  function resetHome() {
    setPhase("home");
    setHoles(emptyRound(18));
    setOcrNotes([]);
    setOcrText("");
    setError(null);
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
  }

  return (
    <div className="relative min-h-full overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-fairway" aria-hidden />
      <div className="pointer-events-none absolute inset-0 bg-mist" aria-hidden />

      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
        <button
          type="button"
          onClick={resetHome}
          className="font-display text-lg tracking-[0.18em] text-[var(--foam)] transition hover:text-[var(--lime)]"
        >
          STABLEFORD
        </button>
        {phase === "working" && (
          <button
            type="button"
            onClick={resetHome}
            className="text-sm text-[var(--foam)]/70 transition hover:text-[var(--foam)]"
          >
            새로 시작
          </button>
        )}
      </header>

      {phase === "home" ? (
        <section className="relative z-10 mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-5xl flex-col justify-center px-5 pb-16 pt-10 sm:px-8">
          <p className="animate-rise font-display text-[clamp(3.2rem,12vw,7.5rem)] leading-[0.9] tracking-[-0.03em] text-[var(--foam)]">
            STABLEFORD
          </p>
          <p className="animate-rise-delay mt-5 max-w-md text-base leading-relaxed text-[var(--foam)]/75 sm:text-lg">
            스코어카드 사진을 올리면 무료 OCR로 읽고, Stableford 점수를 바로
            계산합니다.
          </p>

          <div className="animate-rise-delay-2 mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                void handleFile(e.dataTransfer.files?.[0]);
              }}
              className={`group inline-flex h-14 items-center justify-center rounded-sm bg-[var(--lime)] px-7 text-base font-semibold text-[var(--ink)] transition ${
                dragOver ? "scale-[1.02] brightness-110" : "hover:brightness-110"
              }`}
            >
              스코어카드 사진 업로드
            </button>
            <button
              type="button"
              onClick={startManual}
              className="inline-flex h-14 items-center justify-center rounded-sm border border-[var(--foam)]/25 px-7 text-base text-[var(--foam)] transition hover:border-[var(--foam)]/50 hover:bg-white/5"
            >
              직접 입력
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
          <p className="mt-6 text-sm text-[var(--foam)]/45">
            Tesseract.js · API 키 불필요 · 인식 후 숫자 수정 가능
          </p>
        </section>
      ) : (
        <main className="relative z-10 mx-auto w-full max-w-5xl px-5 pb-20 pt-8 sm:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.2fr)]">
            <aside className="space-y-4">
              <div className="overflow-hidden rounded-sm border border-white/10 bg-black/20">
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="업로드한 스코어카드"
                    className="max-h-72 w-full object-contain bg-black/40"
                  />
                ) : (
                  <div className="flex h-48 items-center justify-center text-sm text-[var(--foam)]/40">
                    업로드된 사진 없음
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-sm bg-[var(--lime)] px-4 py-2 text-sm font-semibold text-[var(--ink)] transition hover:brightness-110"
                >
                  {imageUrl ? "다른 사진" : "사진 업로드"}
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => void handleFile(e.target.files?.[0])}
                />
              </div>

              <label className="block">
                <span className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/50">
                  Course Handicap
                </span>
                <input
                  type="number"
                  value={courseHandicap}
                  onChange={(e) =>
                    setCourseHandicap(
                      clampInt(e.target.value, -10, 54) ?? 0,
                    )
                  }
                  className="mt-2 w-full rounded-sm border border-white/15 bg-black/25 px-3 py-3 text-2xl font-semibold text-[var(--foam)] outline-none focus:border-[var(--lime)]"
                />
              </label>

              <div className="rounded-sm border border-white/10 bg-black/25 p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--foam)]/50">
                  Total points
                </p>
                <p className="mt-2 font-display text-6xl tracking-tight text-[var(--lime)] tabular-nums">
                  {summary.totalPoints}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm text-[var(--foam)]/70">
                  <div>
                    <p className="text-[var(--foam)]/40">Out</p>
                    <p className="text-lg tabular-nums text-[var(--foam)]">
                      {summary.outPoints}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--foam)]/40">In</p>
                    <p className="text-lg tabular-nums text-[var(--foam)]">
                      {summary.inPoints}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--foam)]/40">Holes</p>
                    <p className="text-lg tabular-nums text-[var(--foam)]">
                      {summary.holesPlayed}
                    </p>
                  </div>
                </div>
              </div>

              {ocrBusy && (
                <div className="rounded-sm border border-[var(--lime)]/30 bg-[var(--lime)]/10 p-4 text-sm text-[var(--foam)]">
                  <p className="font-medium text-[var(--lime)]">읽는 중…</p>
                  <p className="mt-1 text-[var(--foam)]/70">
                    {ocrProgress?.status ?? "preparing"}{" "}
                    {ocrProgress
                      ? `· ${Math.round(ocrProgress.progress * 100)}%`
                      : ""}
                  </p>
                  <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-[var(--lime)] transition-all duration-300"
                      style={{
                        width: `${Math.round((ocrProgress?.progress ?? 0) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="rounded-sm border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {error}
                </p>
              )}

              {ocrNotes.length > 0 && (
                <ul className="space-y-1 text-sm text-[var(--foam)]/55">
                  {ocrNotes.map((note) => (
                    <li key={note}>· {note}</li>
                  ))}
                </ul>
              )}

              {ocrText && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowRaw((v) => !v)}
                    className="text-sm text-[var(--foam)]/45 underline-offset-2 hover:text-[var(--foam)]/80 hover:underline"
                  >
                    {showRaw ? "OCR 원문 숨기기" : "OCR 원문 보기"}
                  </button>
                  {showRaw && (
                    <pre className="mt-2 max-h-48 overflow-auto rounded-sm bg-black/40 p-3 text-xs leading-relaxed text-[var(--foam)]/60">
                      {ocrText}
                    </pre>
                  )}
                </div>
              )}
            </aside>

            <section className="overflow-x-auto rounded-sm border border-white/10 bg-black/20">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[var(--foam)]/45">
                    <th className="px-3 py-3 font-medium">Hole</th>
                    <th className="px-3 py-3 font-medium">Par</th>
                    <th className="px-3 py-3 font-medium">SI</th>
                    <th className="px-3 py-3 font-medium">Gross</th>
                    <th className="px-3 py-3 font-medium">Net</th>
                    <th className="px-3 py-3 font-medium">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.holes.map((hole, index) => (
                    <tr
                      key={hole.hole}
                      className={`border-b border-white/5 ${
                        index === 8 ? "border-b-white/20" : ""
                      }`}
                    >
                      <td className="px-3 py-2 font-medium tabular-nums text-[var(--foam)]">
                        {hole.hole}
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          inputMode="numeric"
                          value={hole.par ?? ""}
                          onChange={(e) =>
                            updateHole(index, "par", e.target.value)
                          }
                          className="field"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          inputMode="numeric"
                          value={hole.strokeIndex ?? ""}
                          onChange={(e) =>
                            updateHole(index, "strokeIndex", e.target.value)
                          }
                          className="field"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          inputMode="numeric"
                          value={hole.gross ?? ""}
                          onChange={(e) =>
                            updateHole(index, "gross", e.target.value)
                          }
                          className="field field-strong"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-[var(--foam)]/70">
                        {hole.net ?? "—"}
                        {hole.strokes > 0 && (
                          <span className="ml-1 text-[10px] text-[var(--lime)]/80">
                            −{hole.strokes}
                          </span>
                        )}
                        {hole.strokes < 0 && (
                          <span className="ml-1 text-[10px] text-orange-300/80">
                            +{Math.abs(hole.strokes)}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-[var(--lime)]">
                        {hole.points ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      )}
    </div>
  );
}
