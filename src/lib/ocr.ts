import { createWorker, type Worker } from "tesseract.js";
import type { HoleData } from "./types";
import { emptyRound } from "./stableford";

export type OcrProgress = {
  status: string;
  progress: number;
};

export type OcrResult = {
  text: string;
  holes: HoleData[];
  courseHandicap: number | null;
  confidence: "low" | "medium" | "high";
  notes: string[];
};

let workerPromise: Promise<Worker> | null = null;

async function getWorker(
  onProgress?: (p: OcrProgress) => void,
): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (!onProgress) return;
          if (typeof m.progress === "number") {
            onProgress({
              status: String(m.status ?? "recognizing"),
              progress: m.progress,
            });
          }
        },
      });
      await worker.setParameters({
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .+/-:",
      });
      return worker;
    })();
  }
  return workerPromise;
}

function extractNumberRows(text: string): number[][] {
  const rows: number[][] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    // Prefer space/punctuation-separated integers (scorecard cells).
    const cleaned = line.replaceAll("|", " ").replaceAll("[", " ").replaceAll("]", " ");
    const nums = cleaned
      .match(/(?<!\d)\d{1,2}(?!\d)/g)
      ?.map((n) => Number(n))
      .filter((n) => Number.isFinite(n));
    if (nums && nums.length >= 5) rows.push(nums);
  }
  return rows;
}

function pickRow(
  rows: number[][],
  predicate: (row: number[]) => boolean,
): number[] | null {
  const hit = rows.find(predicate);
  return hit ?? null;
}

function isLikelyParRow(row: number[]): boolean {
  const cells = row.filter((n) => n >= 3 && n <= 5);
  return cells.length >= 7 && cells.length / row.length >= 0.7;
}

function isLikelySiRow(row: number[]): boolean {
  const cells = row.filter((n) => n >= 1 && n <= 18);
  if (cells.length < 7) return false;
  const unique = new Set(cells);
  return unique.size >= Math.min(7, cells.length - 1);
}

function isLikelyScoreRow(row: number[]): boolean {
  const cells = row.filter((n) => n >= 1 && n <= 15);
  return cells.length >= 7 && cells.length / row.length >= 0.7;
}

function sliceNineOrEighteen(row: number[]): number[] {
  if (row.length >= 18) return row.slice(0, 18);
  if (row.length >= 9) return row.slice(0, 9);
  return row;
}

function parseHandicap(text: string): number | null {
  const patterns = [
    /(?:course\s*)?h(?:and)?i?c(?:ap)?[:\s]*([+-]?\d{1,2})/i,
    /(?:ch|hcp|hc)[:\s]*([+-]?\d{1,2})/i,
    /handicap[:\s]*([+-]?\d{1,2})/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = Number(m[1]);
      if (n >= -10 && n <= 54) return n;
    }
  }
  return null;
}

/**
 * Best-effort mapping of OCR number rows onto an 18-hole card.
 * Golf cards vary a lot — callers should always let the user edit results.
 */
export function parseScorecardText(text: string): Omit<OcrResult, "text"> {
  const notes: string[] = [];
  const rows = extractNumberRows(text);
  const holes = emptyRound(18);
  const courseHandicap = parseHandicap(text);

  if (rows.length === 0) {
    notes.push("숫자 행을 찾지 못했습니다. 아래에서 직접 입력해 주세요.");
    return { holes, courseHandicap, confidence: "low", notes };
  }

  const parRow = pickRow(rows, isLikelyParRow);
  const siRow = pickRow(
    rows.filter((r) => r !== parRow),
    isLikelySiRow,
  );
  const scoreCandidates = rows.filter(
    (r) => r !== parRow && r !== siRow && isLikelyScoreRow(r),
  );
  // Prefer a score row that is not identical to SI/par heuristics.
  const scoreRow = scoreCandidates[0] ?? null;

  if (parRow) {
    const pars = sliceNineOrEighteen(parRow.filter((n) => n >= 3 && n <= 5));
    pars.forEach((par, i) => {
      if (holes[i]) holes[i].par = par;
    });
    notes.push(`Par 행 추정: ${pars.length}홀`);
  } else {
    notes.push("Par 행을 추정하지 못했습니다. 기본값 4를 유지합니다.");
  }

  if (siRow) {
    const sis = sliceNineOrEighteen(siRow.filter((n) => n >= 1 && n <= 18));
    sis.forEach((si, i) => {
      if (holes[i]) holes[i].strokeIndex = si;
    });
    notes.push(`Stroke Index 행 추정: ${sis.length}홀`);
  } else {
    notes.push("Stroke Index를 추정하지 못했습니다. 홀 번호를 기본 SI로 둡니다.");
  }

  if (scoreRow) {
    const scores = sliceNineOrEighteen(
      scoreRow.filter((n) => n >= 1 && n <= 15),
    );
    scores.forEach((gross, i) => {
      if (holes[i]) holes[i].gross = gross;
    });
    notes.push(`스코어 행 추정: ${scores.length}홀`);
  } else {
    notes.push("스코어 행을 추정하지 못했습니다. 타수를 직접 입력해 주세요.");
  }

  const filled = holes.filter((h) => h.gross != null).length;
  const confidence =
    filled >= 14 && parRow && siRow
      ? "high"
      : filled >= 7 || (parRow && scoreRow)
        ? "medium"
        : "low";

  return { holes, courseHandicap, confidence, notes };
}

export async function recognizeScorecard(
  image: File | Blob | string,
  onProgress?: (p: OcrProgress) => void,
): Promise<OcrResult> {
  const worker = await getWorker(onProgress);
  onProgress?.({ status: "recognizing text", progress: 0 });
  const { data } = await worker.recognize(image);
  const parsed = parseScorecardText(data.text);
  return { text: data.text, ...parsed };
}

export async function terminateOcrWorker(): Promise<void> {
  if (!workerPromise) return;
  const worker = await workerPromise;
  workerPromise = null;
  await worker.terminate();
}
