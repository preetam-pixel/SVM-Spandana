import crypto from "node:crypto";
import { AUDIENCE, EVENT_KINDS } from "@/lib/club";
import { DISC_MAP, LADDER, discFit } from "@/lib/data";
import type { Announcement, ClubEvent, ClubEventKind, DisciplineId, EventLevel, EventRole, Recognition, Suggestion } from "@/lib/types";
import { admin } from "@/lib/supabase/server";
import type { ProfileRow } from "./db";
import { cleanState, deptOf } from "./people";
import { rowsOrEmpty } from "./setup";

export interface EventRow {
  id: string; created_by: string | null; title: string; description: string; discipline: string; kind: string; level: string;
  venue: string; starts_at: string; duration_min: number; roles: unknown; poster: string | null; poster_path: string | null;
  checkin_code: string; cancelled: boolean; created_at: string;
}
export interface SignupRow { event_id: string; user_id: string; role_id: string; note: string; attended: boolean; created_at: string }
export interface InviteRow { event_id: string; user_id: string; invited_by: string | null; role_id: string; status: "pending" | "accepted" | "declined"; created_at: string }

export const isCore = (a: { role?: string } | null | undefined) => a?.role === "core";
export const newCheckinCode = () => String(crypto.randomInt(0, 10_000)).padStart(4, "0");

const int = (v: unknown, min: number, max: number, fallback: number) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Roles stored on an event, always led by the built-in audience role. */
export function rolesOf(raw: unknown): EventRole[] {
  const list = Array.isArray(raw) ? raw : [];
  const roles = list
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && typeof r.id === "string" && typeof r.label === "string")
    .map((r) => ({ id: String(r.id).slice(0, 40), label: String(r.label).slice(0, 40), slots: int(r.slots, 0, 500, 0), stage: r.stage === true }))
    .filter((r) => r.id !== AUDIENCE.id);
  return [AUDIENCE, ...roles.slice(0, 10)];
}

/** Roles from the post-event form. Ids are slugs of the labels; existing ids are kept so sign-ups survive edits. */
export function parseRoles(input: unknown): EventRole[] | string {
  if (!Array.isArray(input)) return [];
  if (input.length > 10) return "Up to 10 roles per event";
  const used = new Set<string>([AUDIENCE.id]);
  const out: EventRole[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const label = text(r.label, 40);
    if (label.length < 2) return "Each role needs a name";
    let id = typeof r.id === "string" && /^[a-z0-9-]{1,40}$/.test(r.id) && !used.has(r.id) ? r.id : label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "role";
    for (let i = 2; used.has(id); i++) id = `${id.replace(/-\d+$/, "")}-${i}`;
    used.add(id);
    out.push({ id, label, slots: int(r.slots, 0, 500, 0), stage: r.stage === true });
  }
  return out;
}

export interface EventInput {
  title: string; description: string; discipline: DisciplineId; kind: ClubEventKind; level: EventLevel; venue: string;
  starts_at: string; duration_min: number; roles: EventRole[];
}

/** Validates the post-event form. With `partial`, only the fields present are checked (for edits). */
export function parseEventInput(body: Record<string, unknown>, partial = false): { values: Partial<EventInput> } | { error: string } {
  const v: Partial<EventInput> = {};
  const has = (k: string) => !partial || body[k] !== undefined;
  if (has("title")) {
    v.title = text(body.title, 80);
    if (v.title.length < 3) return { error: "Give the event a title" };
  }
  if (has("description")) v.description = text(body.description, 1500);
  if (has("discipline")) {
    if (typeof body.discipline !== "string" || !(body.discipline in DISC_MAP)) return { error: "Pick an art form" };
    v.discipline = body.discipline as DisciplineId;
  }
  if (has("kind")) {
    if (!EVENT_KINDS.some((k) => k.id === body.kind)) return { error: "Pick an event type" };
    v.kind = body.kind as ClubEventKind;
  }
  if (has("level")) {
    if (!["beginner", "open", "experienced"].includes(String(body.level))) return { error: "Pick who it's for" };
    v.level = body.level as EventLevel;
  }
  if (has("venue")) v.venue = text(body.venue, 80);
  if (has("startsAt")) {
    const t = typeof body.startsAt === "number" ? body.startsAt : Date.parse(String(body.startsAt ?? ""));
    const now = Date.now();
    if (!Number.isFinite(t)) return { error: "Pick a date and time" };
    if (t < now - 60 * 86_400_000 || t > now + 400 * 86_400_000) return { error: "That date is too far away" };
    v.starts_at = new Date(t).toISOString();
  }
  if (has("durationMin")) v.duration_min = int(body.durationMin, 15, 720, 60);
  if (has("roles")) {
    const roles = parseRoles(body.roles);
    if (typeof roles === "string") return { error: roles };
    v.roles = roles;
  }
  return { values: v };
}

export function toClubEvent(
  row: EventRow,
  signups: SignupRow[],
  ctx: { me: string | null; friends: Map<string, string>; host: string; invite?: InviteRow },
): ClubEvent {
  const roles = rolesOf(row.roles);
  const known = new Set(roles.map((r) => r.id));
  const count = new Map<string, number>();
  for (const s of signups) {
    const id = known.has(s.role_id) ? s.role_id : AUDIENCE.id; // role removed in an edit: count as audience
    count.set(id, (count.get(id) ?? 0) + 1);
  }
  const mine = ctx.me ? signups.find((s) => s.user_id === ctx.me) : undefined;
  return {
    id: row.id, title: row.title, description: row.description ?? "",
    discipline: (row.discipline in DISC_MAP ? row.discipline : "vocal") as DisciplineId,
    kind: (EVENT_KINDS.some((k) => k.id === row.kind) ? row.kind : "performance") as ClubEventKind,
    level: (["beginner", "open", "experienced"].includes(row.level) ? row.level : "open") as EventLevel,
    venue: row.venue ?? "", startsAt: new Date(row.starts_at).getTime(), durationMin: row.duration_min, cancelled: row.cancelled,
    poster: row.poster ?? undefined,
    roles: roles.map((r) => ({ ...r, filled: count.get(r.id) ?? 0 })),
    going: signups.length,
    host: ctx.host,
    friendsGoing: signups.filter((s) => ctx.friends.has(s.user_id)).map((s) => ctx.friends.get(s.user_id)!).slice(0, 5),
    mine: mine ? { roleId: known.has(mine.role_id) ? mine.role_id : AUDIENCE.id, attended: mine.attended } : undefined,
    invite: ctx.invite ? { roleId: ctx.invite.role_id, status: ctx.invite.status } : undefined,
  };
}

/** Day and time of an event in IST, in the same "Thu 16:00" format as the free-slot timetable. */
function istSlot(ms: number): { day: string; minutes: number; label: string } {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(ms));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hh = get("hour") === "24" ? "00" : get("hour");
  return { day: get("weekday"), minutes: Number(hh) * 60 + Number(get("minute")), label: `${get("weekday")} ${hh}:${get("minute")}` };
}

/**
 * Ranks members who haven't signed up yet by how well the event suits them: Creative DNA fit for the
 * art form, art forms they said they love, free timetable slots, and comfort level. Every score has reasons.
 */
export function suggestFor(ev: ClubEvent, candidates: ProfileRow[], exclude: Set<string>): Suggestion[] {
  const disc = DISC_MAP[ev.discipline];
  const when = istSlot(ev.startsAt);
  return candidates
    .filter((p) => !exclude.has(p.id))
    .map((p) => {
      const s = cleanState(p);
      const raw = (p.state ?? {}) as { freeSlots?: unknown };
      const slots = Array.isArray(raw.freeSlots) ? raw.freeSlots.filter((x): x is string => typeof x === "string") : [];
      const reasons: string[] = [];
      let score = 0;
      if (s.sparkDone) {
        const fit = discFit(s.dna, ev.discipline);
        score += 0.5 * fit;
        if (fit >= 0.55) reasons.push(`Creative DNA fits ${disc.name} (${Math.round(fit * 100)}%)`);
      } else score += 0.15;
      if (s.declared.includes(ev.discipline)) {
        score += 0.25;
        reasons.push(`Loves ${disc.name}`);
      } else if (s.stamps.includes(ev.discipline)) {
        score += 0.12;
        reasons.push(`Has tried ${disc.name} before`);
      }
      const free = slots.some((x) => {
        const [d, t] = x.split(" ");
        if (d !== when.day || !t) return false;
        const [h, m] = t.split(":").map(Number);
        return Math.abs(h * 60 + (m || 0) - when.minutes) <= 60;
      });
      if (free) {
        score += 0.2;
        reasons.push(`Free around ${when.label}`);
      }
      if (ev.level === "beginner" && s.level <= 1) {
        score += 0.1;
        reasons.push("New to SVM: a gentle first event");
      } else if (ev.level === "experienced" && s.level >= 2) {
        score += 0.1;
        reasons.push(`Experienced (${LADDER[s.level].name})`);
      } else if (ev.level === "open") score += 0.05;
      return {
        id: p.id, name: p.name, avatar: p.avatar ?? "", dept: deptOf(p.dept), year: p.year, level: s.level,
        fit: Math.round(Math.min(1, score) * 100), reasons: reasons.slice(0, 3),
      };
    })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 15);
}

export interface RecognitionRow { id: string; user_id: string; given_by: string | null; event_id: string | null; title: string; message: string; created_at: string }
export interface AnnouncementRow { id: string; created_by: string | null; title: string; body: string; link: string | null; pinned: boolean; created_at: string }

type Lite = Pick<ProfileRow, "id" | "name" | "avatar" | "dept" | "year">;

/** Name, avatar, branch and year for a set of members, keyed by id. */
export async function profilesById(ids: (string | null | undefined)[]): Promise<Map<string, Lite>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const { data, error } = await admin().from("profiles").select("id, name, avatar, dept, year").in("id", unique);
  if (error) throw error;
  return new Map(((data ?? []) as Lite[]).map((p) => [p.id, p]));
}

export function toRecognition(r: RecognitionRow, people: Map<string, Lite>, eventTitles: Map<string, string>): Recognition {
  const p = people.get(r.user_id);
  return {
    id: r.id, userId: r.user_id, name: p?.name ?? "Member", avatar: p?.avatar ?? "", dept: deptOf(p?.dept ?? ""), year: p?.year ?? 1,
    title: r.title, message: r.message ?? "", eventId: r.event_id ?? undefined, eventTitle: r.event_id ? eventTitles.get(r.event_id) : undefined,
    by: (r.given_by && people.get(r.given_by)?.name) || "SVM Core", createdAt: new Date(r.created_at).getTime(),
  };
}

export function toAnnouncement(a: AnnouncementRow, people: Map<string, Lite>): Announcement {
  return {
    id: a.id, title: a.title, body: a.body ?? "", link: a.link ?? undefined, pinned: a.pinned,
    createdAt: new Date(a.created_at).getTime(), by: (a.created_by && people.get(a.created_by)?.name) || "SVM Core",
  };
}

/** Recognitions for some members (or the latest for everyone), with names and event titles filled in. */
export async function loadRecognitions(opts: { userId?: string; limit?: number } = {}): Promise<Recognition[]> {
  let q = admin().from("recognitions").select("*").order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  if (opts.userId) q = q.eq("user_id", opts.userId);
  const rows = await rowsOrEmpty<RecognitionRow>(q);
  if (!rows.length) return [];
  const eventIds = [...new Set(rows.map((r) => r.event_id).filter((x): x is string => !!x))];
  const [people, events] = await Promise.all([
    profilesById(rows.flatMap((r) => [r.user_id, r.given_by])),
    eventIds.length ? rowsOrEmpty<{ id: string; title: string }>(admin().from("events").select("id, title").in("id", eventIds)) : Promise.resolve([]),
  ]);
  const titles = new Map(events.map((e) => [e.id, e.title]));
  return rows.map((r) => toRecognition(r, people, titles));
}
