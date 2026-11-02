import { DEPTS, DIMS, DISC_MAP, LADDER } from "@/lib/data";
import { admin } from "@/lib/supabase/server";
import type { DNA, Dept, Dim, DisciplineId, FriendStatus, PersonCard, Profile, PublicProfile } from "@/lib/types";
import type { ProfileRow } from "./db";

/** Raised when the friendships table hasn't been created on this database yet. */
export class FriendsNotSetUp extends Error {
  constructor() {
    super("Friends need a one-time database update: run supabase/migrations/002_friends.sql in the Supabase SQL editor.");
  }
}

// PostgREST: "Could not find the table 'public.friendships' in the schema cache"; Postgres: undefined_table.
const missingTable = (e: { code?: string; message?: string }) =>
  e.code === "PGRST205" || e.code === "42P01" || /friendships/.test(e.message ?? "") && /schema cache|does not exist/.test(e.message ?? "");

// Engagement state is written by the browser, so clean it before showing it to other members:
// one malformed profile must not break the People page or a profile view for everyone else.
const DIM_KEYS = DIMS.map((d) => d.key);
const isDisc = (x: unknown): x is DisciplineId => typeof x === "string" && x in DISC_MAP;
const discs = (xs: unknown) => (Array.isArray(xs) ? [...new Set(xs.filter(isDisc))] : []);
const dnaOf = (d: unknown): DNA => {
  const src = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
  return Object.fromEntries(DIM_KEYS.map((k) => [k, Math.min(100, Math.max(0, Number(src[k]) || 0))])) as DNA;
};
const levelOf = (l: unknown) => (Number.isInteger(l) && (l as number) >= 0 && (l as number) < LADDER.length ? (l as number) : 0);
const deptOf = (d: string): Dept => (DEPTS.includes(d as Dept) ? (d as Dept) : "CSE");

function cleanState(r: ProfileRow) {
  const s = (r.state && typeof r.state === "object" ? r.state : {}) as Partial<Record<keyof Profile, unknown>>;
  const contributions = Array.isArray(s.contributions) ? (s.contributions as { kind?: unknown; points?: unknown }[]).filter((c) => c && typeof c === "object") : [];
  return {
    dna: dnaOf(s.dna),
    sparkDone: s.sparkDone === true,
    hiddenSpark: DIM_KEYS.includes(s.hiddenSpark as Dim) ? (s.hiddenSpark as Dim) : null,
    level: levelOf(s.level),
    stamps: discs(s.stamps),
    declared: discs(s.declared),
    points: contributions.reduce((a, c) => a + (Number(c.points) || 0), 0),
    contributions: contributions.filter((c) => c.kind !== "spark").length,
  };
}

export function toCard(r: ProfileRow, status: FriendStatus): PersonCard {
  const s = cleanState(r);
  return {
    id: r.id, name: r.name, dept: deptOf(r.dept), year: r.year, avatar: r.avatar ?? "", bio: r.bio ?? "",
    level: s.level, declared: s.declared, dna: s.dna, sparkDone: s.sparkDone, status,
  };
}

/** Public view of a member. Contact details beyond Instagram/YouTube are only shared with friends. */
export function toPublic(r: ProfileRow, status: FriendStatus): PublicProfile {
  const s = cleanState(r);
  const close = status === "friends" || status === "self";
  return {
    id: r.id, name: r.name, dept: deptOf(r.dept), year: r.year, bio: r.bio ?? "", avatar: r.avatar ?? "",
    instagram: r.instagram ?? "", youtube: r.youtube ?? "", ...s,
    createdAt: new Date(r.created_at).getTime(),
    ...(close ? { email: r.email, usn: r.usn } : {}),
  };
}

export interface FriendRow { requester: string; addressee: string; status: "pending" | "accepted" }

/**
 * All friendship rows involving this user. With `optional`, a database that hasn't run the
 * friends migration yet reads as "no friends" so the directory and profiles still work.
 */
export async function friendRows(me: string, { optional = false } = {}): Promise<FriendRow[]> {
  const { data, error } = await admin()
    .from("friendships")
    .select("requester, addressee, status")
    .or(`requester.eq.${me},addressee.eq.${me}`);
  if (error) {
    if (!missingTable(error)) throw error;
    if (optional) return [];
    throw new FriendsNotSetUp();
  }
  return (data ?? []) as FriendRow[];
}

export function statusWith(me: string | null, other: string, rows: FriendRow[]): FriendStatus {
  if (!me) return "none";
  if (me === other) return "self";
  const r = rows.find((x) => (x.requester === me && x.addressee === other) || (x.requester === other && x.addressee === me));
  if (!r) return "none";
  if (r.status === "accepted") return "friends";
  return r.requester === me ? "outgoing" : "incoming";
}

export const otherSide = (me: string, r: FriendRow) => (r.requester === me ? r.addressee : r.requester);

/** Validates a profile id before it reaches a query (uuid only). */
export const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
