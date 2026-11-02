import { EMPTY_STATS } from "@/lib/achievements";
import { AUDIENCE } from "@/lib/club";
import { admin } from "@/lib/supabase/server";
import type { Stats } from "@/lib/types";
import { type EventRow, type SignupRow, rolesOf } from "./club";
import type { ProfileRow } from "./db";
import { cleanState } from "./people";
import { rowsOrEmpty } from "./setup";

export const DEMO_EMAILS = ["demo@svm-spandana.app", "demo-core@svm-spandana.app"];

const MONTH = 30 * 86_400_000;

export interface MemberStats {
  profile: ProfileRow;
  stats: Stats;
  /** Activity points in the last 30 days (verified events, unmasked works, recognitions, hosting). */
  recent: number;
  hidden: boolean; // opted out of leaderboards
}

type PostLite = { user_id: string; unmasked: string | null; heart: number; fire: number; wow: number; clap: number; created_at: string };
type RecLite = { user_id: string; event_id: string | null; created_at: string };
type EventLite = Pick<EventRow, "id" | "created_by" | "roles" | "starts_at" | "cancelled">;

/**
 * Achievement facts for members, straight from the database. Everyone's stats only count unmasked works;
 * `privateFor` (the viewer's own id) also counts their masked works, which only they ever see.
 * Tables from later migrations count as empty until they exist.
 */
export async function collectStats({ ids, privateFor }: { ids?: string[]; privateFor?: string } = {}): Promise<Map<string, MemberStats>> {
  const sb = admin();
  let profilesQ = sb.from("profiles").select("*").limit(5000);
  let postsQ = sb.from("posts").select("user_id, unmasked, heart, fire, wow, clap, created_at").not("user_id", "is", null).limit(20000);
  let commentsQ = sb.from("comments").select("user_id").not("user_id", "is", null).limit(50000);
  let friendsQ = sb.from("friendships").select("requester, addressee").eq("status", "accepted").limit(20000);
  let signupsQ = sb.from("event_signups").select("event_id, user_id, role_id, attended, created_at").limit(50000);
  let recsQ = sb.from("recognitions").select("user_id, event_id, created_at").limit(20000);
  let interestsQ = sb.from("opportunity_interests").select("user_id").limit(50000);
  if (ids) {
    profilesQ = profilesQ.in("id", ids);
    postsQ = postsQ.in("user_id", ids);
    commentsQ = commentsQ.in("user_id", ids);
    friendsQ = friendsQ.or(`requester.in.(${ids.join(",")}),addressee.in.(${ids.join(",")})`);
    signupsQ = signupsQ.in("user_id", ids);
    recsQ = recsQ.in("user_id", ids);
    interestsQ = interestsQ.in("user_id", ids);
  }

  const [profiles, posts, comments, friendships, signups, recs, events, interests, trophies] = await Promise.all([
    rowsOrEmpty<ProfileRow>(profilesQ),
    rowsOrEmpty<PostLite>(postsQ),
    rowsOrEmpty<{ user_id: string }>(commentsQ),
    rowsOrEmpty<{ requester: string; addressee: string }>(friendsQ),
    rowsOrEmpty<SignupRow>(signupsQ),
    rowsOrEmpty<RecLite>(recsQ),
    rowsOrEmpty<EventLite>(sb.from("events").select("id, created_by, roles, starts_at, cancelled").limit(5000)),
    rowsOrEmpty<{ user_id: string }>(interestsQ),
    rowsOrEmpty<{ member_ids: string[] | null; won_on: string | null; created_at: string }>(sb.from("club_trophies").select("member_ids, won_on, created_at").limit(5000)),
  ]);

  const eventById = new Map(events.map((e) => [e.id, e]));
  // Sign-up counts per event, for "Crowd Gatherer". With an id filter we only loaded these members'
  // own sign-ups, so fetch the sign-ups of events they host separately.
  const hostedIds = events.filter((e) => e.created_by && (!ids || ids.includes(e.created_by)) && !e.cancelled).map((e) => e.id);
  const hostedSignups = ids && hostedIds.length
    ? await rowsOrEmpty<{ event_id: string }>(sb.from("event_signups").select("event_id").in("event_id", hostedIds).limit(50000))
    : signups;
  const perEvent = new Map<string, number>();
  for (const s of hostedSignups) perEvent.set(s.event_id, (perEvent.get(s.event_id) ?? 0) + 1);

  const now = Date.now();
  const recentTime = (t: string) => now - new Date(t).getTime() <= MONTH;
  const out = new Map<string, MemberStats>();
  for (const p of profiles) {
    const s = cleanState(p);
    out.set(p.id, { profile: p, stats: { ...EMPTY_STATS, sparkDone: s.sparkDone, stamps: s.stamps.length, quests: s.quests }, recent: 0, hidden: s.hideFromBoards });
  }

  for (const post of posts) {
    const m = out.get(post.user_id);
    if (!m) continue;
    const visible = !!post.unmasked || post.user_id === privateFor;
    if (post.unmasked) m.stats.unmasked++;
    if (!visible) continue;
    m.stats.posts++;
    m.stats.reactions += (post.heart ?? 0) + (post.fire ?? 0) + (post.wow ?? 0) + (post.clap ?? 0);
    if (post.unmasked && recentTime(post.created_at)) m.recent += 5;
  }
  for (const c of comments) {
    const m = out.get(c.user_id);
    if (m) m.stats.comments++;
  }
  for (const f of friendships) {
    for (const id of [f.requester, f.addressee]) {
      const m = out.get(id);
      if (m) m.stats.friends++;
    }
  }
  for (const su of signups) {
    const m = out.get(su.user_id);
    const ev = eventById.get(su.event_id);
    if (!m || !ev || ev.cancelled) continue;
    m.stats.signups++;
    if (!su.attended) continue;
    m.stats.attended++;
    const role = rolesOf(ev.roles).find((r) => r.id === su.role_id);
    if (role && role.id !== AUDIENCE.id) {
      if (role.stage) m.stats.stage++;
      else m.stats.crew++;
    }
    if (recentTime(ev.starts_at)) m.recent += role && role.id !== AUDIENCE.id ? 15 : 10;
  }
  for (const r of recs) {
    const m = out.get(r.user_id);
    if (!m) continue;
    m.stats.recognitions++;
    if (r.event_id) m.stats.stars++;
    if (recentTime(r.created_at)) m.recent += 20;
  }
  for (const i of interests) {
    const m = out.get(i.user_id);
    if (m) m.stats.interests++;
  }
  for (const t of trophies) {
    for (const id of t.member_ids ?? []) {
      const m = out.get(id);
      if (!m) continue;
      m.stats.trophies++;
      if (recentTime(t.won_on ?? t.created_at)) m.recent += 30;
    }
  }
  for (const e of events) {
    const m = e.created_by ? out.get(e.created_by) : undefined;
    if (!m || e.cancelled) continue;
    m.stats.hosted++;
    m.stats.biggestEvent = Math.max(m.stats.biggestEvent, perEvent.get(e.id) ?? 0);
    if (recentTime(e.starts_at) && new Date(e.starts_at).getTime() <= now) m.recent += 15;
  }
  return out;
}

export async function statsFor(id: string, opts: { private?: boolean } = {}): Promise<MemberStats | null> {
  const map = await collectStats({ ids: [id], privateFor: opts.private ? id : undefined });
  return map.get(id) ?? null;
}

export const isDemoProfile = (p: Pick<ProfileRow, "email">) => DEMO_EMAILS.includes(p.email);
