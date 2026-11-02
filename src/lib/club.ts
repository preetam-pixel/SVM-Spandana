import type { ClubEvent, ClubEventKind, EventLevel, EventRole } from "./types";

/** Shared helpers for SVM events (used by both server routes and pages). */

export const EVENT_KINDS: { id: ClubEventKind; label: string }[] = [
  { id: "performance", label: "Performance" },
  { id: "workshop", label: "Workshop" },
  { id: "jam", label: "Jam session" },
  { id: "showcase", label: "Showcase" },
  { id: "competition", label: "Competition" },
  { id: "audition", label: "Auditions" },
  { id: "meeting", label: "Club meeting" },
];
export const KIND_LABEL = Object.fromEntries(EVENT_KINDS.map((k) => [k.id, k.label])) as Record<ClubEventKind, string>;

export const LEVEL_LABEL: Record<EventLevel, string> = { beginner: "🌱 Beginner-friendly", open: "Open to all", experienced: "Experienced" };

/** Everyone can come and watch; this role is always present and has no limit. */
export const AUDIENCE: EventRole = { id: "audience", label: "Audience", slots: 0, stage: false };

export const ROLE_PRESETS: { label: string; stage: boolean; slots: number }[] = [
  { label: "Performer", stage: true, slots: 8 },
  { label: "Singer", stage: true, slots: 4 },
  { label: "Instrumentalist", stage: true, slots: 4 },
  { label: "Dancer", stage: true, slots: 6 },
  { label: "Anchor", stage: true, slots: 2 },
  { label: "Stage crew", stage: false, slots: 4 },
  { label: "Sound & lights", stage: false, slots: 2 },
  { label: "Photographer", stage: false, slots: 2 },
  { label: "Videographer", stage: false, slots: 1 },
  { label: "Poster design", stage: false, slots: 1 },
  { label: "Volunteer", stage: false, slots: 5 },
];

export const RECOGNITION_TITLES: { title: string; emoji: string }[] = [
  { title: "Star Performer", emoji: "🌟" },
  { title: "Backstage Hero", emoji: "🛠️" },
  { title: "Rising Star", emoji: "🌱" },
  { title: "Team Player", emoji: "🤝" },
  { title: "Creative Spark", emoji: "✨" },
  { title: "Crowd Favourite", emoji: "👏" },
  { title: "Kind Soul", emoji: "💛" },
  { title: "Event Hero", emoji: "🏆" },
];
export const recognitionEmoji = (title: string) => RECOGNITION_TITLES.find((r) => r.title === title)?.emoji ?? "🏅";

const IST = "Asia/Kolkata";

export function fmtEventDate(ms: number, opts: { long?: boolean } = {}): string {
  const d = new Date(ms);
  const day = d.toLocaleDateString("en-IN", { timeZone: IST, weekday: opts.long ? "long" : "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-IN", { timeZone: IST, hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
}

/** Day number and short month (IST) for date tiles. */
export function dateTile(ms: number): { day: string; month: string; weekday: string } {
  const d = new Date(ms);
  return {
    day: d.toLocaleDateString("en-IN", { timeZone: IST, day: "numeric" }),
    month: d.toLocaleDateString("en-IN", { timeZone: IST, month: "short" }),
    weekday: d.toLocaleDateString("en-IN", { timeZone: IST, weekday: "short" }),
  };
}

export const eventEnd = (e: Pick<ClubEvent, "startsAt" | "durationMin">) => e.startsAt + e.durationMin * 60_000;
export const isPast = (e: Pick<ClubEvent, "startsAt" | "durationMin">, now = Date.now()) => eventEnd(e) < now;
export const isLive = (e: Pick<ClubEvent, "startsAt" | "durationMin">, now = Date.now()) => e.startsAt <= now && now <= eventEnd(e);

/** Members can check in from an hour before the start until three hours after the end. */
export const checkInOpen = (e: Pick<ClubEvent, "startsAt" | "durationMin">, now = Date.now()) =>
  now >= e.startsAt - 60 * 60_000 && now <= eventEnd(e) + 3 * 60 * 60_000;

export function relativeDay(ms: number, now = Date.now()): string {
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-CA", { timeZone: IST }); // YYYY-MM-DD in IST
  const days = Math.round((Date.parse(fmt(ms)) - Date.parse(fmt(now))) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < 0 && days > -7) return days === -1 ? "Yesterday" : `${-days} days ago`;
  return "";
}

/** Open slots across on-stage and backstage roles (audience excluded); null when there's no limit. */
export function openSpots(e: Pick<ClubEvent, "roles">): number | null {
  const limited = e.roles.filter((r) => r.id !== AUDIENCE.id && r.slots > 0);
  if (!limited.length) return null;
  return limited.reduce((n, r) => n + Math.max(0, r.slots - r.filled), 0);
}

export function whatsappText(e: Pick<ClubEvent, "title" | "startsAt" | "venue" | "roles">, url: string): string {
  const needs = e.roles.filter((r) => r.id !== AUDIENCE.id && (r.slots === 0 || r.filled < r.slots)).map((r) => r.label);
  return [
    `🎭 *${e.title}* (SVM)`,
    `🗓 ${fmtEventDate(e.startsAt, { long: true })}`,
    e.venue && `📍 ${e.venue}`,
    needs.length ? `🙋 Looking for: ${needs.join(", ")}` : "",
    `Sign up on Spandana: ${url}`,
  ].filter(Boolean).join("\n");
}
