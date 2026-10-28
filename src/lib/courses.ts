import { defaultCourse } from "@/lib/ranking";
import type { CourseHole, GolfCourse, TeeColor } from "@/lib/types";

export const TEE_COLOR_LABELS: Record<TeeColor, string> = {
  white: "White",
  yellow: "Yellow",
  blue: "Blue",
  red: "Red",
  black: "Black",
  gold: "Gold",
  green: "Green",
  orange: "Orange",
};

export function emptyHoles(holeCount: 9 | 18 = 18): CourseHole[] {
  return Array.from({ length: holeCount }, (_, i) => ({
    hole: i + 1,
    par: 4,
    strokeIndex: i + 1,
  }));
}

export function normalizeHoles(
  holes: CourseHole[],
  holeCount: 9 | 18,
): CourseHole[] {
  const base = emptyHoles(holeCount);
  return base.map((h) => {
    const found = holes.find((x) => x.hole === h.hole);
    return {
      hole: h.hole,
      par: found?.par ?? h.par,
      strokeIndex: found?.strokeIndex ?? h.strokeIndex,
    };
  });
}

export function assertUniqueStrokeIndexes(holes: CourseHole[]): void {
  const counts = new Map<number, number>();
  for (const h of holes) {
    counts.set(h.strokeIndex, (counts.get(h.strokeIndex) || 0) + 1);
  }
  const dupes = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([si]) => si)
    .sort((a, b) => a - b);
  if (dupes.length) {
    throw new Error(
      `SI 중복(${dupes.join(", ")}) — 각 홀 SI는 서로 달라야 저장할 수 있습니다.`,
    );
  }
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/gi, "-")
    .replace(/[^a-z0-9-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

export function tournamentSlug(date: string, courseName: string): string {
  const d = date || new Date().toISOString().slice(0, 10);
  const c = slugify(courseName) || "course";
  return `${d}-${c}`;
}

export function courseLabel(c: Pick<GolfCourse, "name" | "teeColor" | "lengthMeters">): string {
  const len = c.lengthMeters != null ? ` · ${c.lengthMeters}m` : "";
  return `${c.name} (${TEE_COLOR_LABELS[c.teeColor]}${len})`;
}

export function holesFromLegacy(course?: CourseHole[]): CourseHole[] {
  return course && course.length ? course : defaultCourse();
}
