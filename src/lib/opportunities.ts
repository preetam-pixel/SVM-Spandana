import { DISC_MAP, discFit } from "./data";
import type { CompLevel, DisciplineId, Opportunity, Profile, TrophyPosition } from "./types";

export const LEVELS: { id: CompLevel; label: string }[] = [
  { id: "college", label: "College" },
  { id: "inter-college", label: "Inter-college" },
  { id: "university", label: "University (VTU)" },
  { id: "zonal", label: "Zonal" },
  { id: "national", label: "National" },
  { id: "international", label: "International" },
];
export const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l.label])) as Record<CompLevel, string>;

export const OPP_KINDS: { id: Opportunity["kind"]; label: string }[] = [
  { id: "fest", label: "Fest" },
  { id: "competition", label: "Competition" },
  { id: "audition", label: "Audition" },
  { id: "workshop", label: "Workshop" },
  { id: "scholarship", label: "Scholarship / grant" },
];

export const POSITIONS: { id: TrophyPosition; label: string; color: string; emoji: string }[] = [
  { id: "winner", label: "Winner", color: "#a87a26", emoji: "🥇" },
  { id: "runner-up", label: "Runner-up", color: "#7d8597", emoji: "🥈" },
  { id: "third", label: "Third place", color: "#b5651d", emoji: "🥉" },
  { id: "special", label: "Special mention", color: "#4f7b5f", emoji: "🎖️" },
  { id: "participation", label: "Participated", color: "#5c3a21", emoji: "🎭" },
];
export const POSITION_MAP = Object.fromEntries(POSITIONS.map((p) => [p.id, p])) as Record<TrophyPosition, (typeof POSITIONS)[number]>;

/** Whole days from today (IST) until a YYYY-MM-DD date; negative once it has passed. */
export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(`${date}T00:00:00`).getTime() - today.getTime()) / 86_400_000);
}

export const fmtDate = (d: string | null, withYear = true) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }) : "";

/** A category is a good fit when the member does that art form or scores well in it. */
export function isGoodFit(p: Pick<Profile, "dna" | "declared" | "sparkDone">, discipline: DisciplineId) {
  if (p.declared.includes(discipline)) return true;
  return p.sparkDone && discFit(p.dna, discipline) >= 0.62;
}

/** "trophies" → "trophy" when n is 1 (units in milestones are plural). */
export const unitFor = (n: number, plural: string) =>
  n === 1 ? plural.replace(/ies$/, "y").replace(/ches$/, "ch").replace(/s$/, "") : plural;

export const discName =(d: string | null | undefined) => (d && d in DISC_MAP ? DISC_MAP[d as DisciplineId].name : "");
