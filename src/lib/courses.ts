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
