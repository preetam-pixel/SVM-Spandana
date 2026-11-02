import { admin } from "@/lib/supabase/server";
import type { Dept, FriendStatus, PersonCard, Profile, PublicProfile } from "@/lib/types";
import type { ProfileRow } from "./db";

const EMPTY_DNA = { rhythm: 0, melody: 0, visual: 0, verbal: 0, movement: 0, stage: 0 };

export function toCard(r: ProfileRow, status: FriendStatus): PersonCard {
  const s = (r.state ?? {}) as Partial<Profile>;
  return {
    id: r.id, name: r.name, dept: r.dept as Dept, year: r.year, avatar: r.avatar, bio: r.bio,
    level: s.level ?? 0, declared: s.declared ?? [], dna: s.dna ?? EMPTY_DNA, sparkDone: !!s.sparkDone, status,
  };
}

/** Public view of a member. Contact details beyond Instagram/YouTube are only shared with friends. */
export function toPublic(r: ProfileRow, status: FriendStatus): PublicProfile {
  const s = (r.state ?? {}) as Partial<Profile>;
  const contributions = s.contributions ?? [];
  const close = status === "friends" || status === "self";
  return {
    id: r.id, name: r.name, dept: r.dept as Dept, year: r.year, bio: r.bio, avatar: r.avatar,
    instagram: r.instagram, youtube: r.youtube, dna: s.dna ?? EMPTY_DNA, sparkDone: !!s.sparkDone,
    hiddenSpark: s.hiddenSpark ?? null, level: s.level ?? 0, stamps: s.stamps ?? [], declared: s.declared ?? [],
    points: contributions.reduce((a, c) => a + (c.points ?? 0), 0),
    contributions: contributions.filter((c) => c.kind !== "spark").length,
    createdAt: new Date(r.created_at).getTime(),
    ...(close ? { email: r.email, usn: r.usn } : {}),
  };
}

export interface FriendRow { requester: string; addressee: string; status: "pending" | "accepted" }

/** All friendship rows involving this user. */
export async function friendRows(me: string): Promise<FriendRow[]> {
  const { data, error } = await admin()
    .from("friendships")
    .select("requester, addressee, status")
    .or(`requester.eq.${me},addressee.eq.${me}`);
  if (error) throw error;
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
