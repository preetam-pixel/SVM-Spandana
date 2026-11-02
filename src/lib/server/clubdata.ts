import { DISC_MAP, DEPTS } from "@/lib/data";
import { LEVELS, POSITIONS } from "@/lib/opportunities";
import { admin } from "@/lib/supabase/server";
import type { ClubTrophy, CompLevel, DisciplineId, Milestone, Opportunity, OpportunityCategory, TrophyPosition } from "@/lib/types";
import { isMissing } from "./setup";
import { DEMO_EMAILS } from "./stats";

export interface TrophyRow {
  id: string; title: string; fest: string; level: string; position: string; discipline: string | null; won_on: string | null;
  member_ids: string[] | null; team: string; description: string; photo: string | null; photo_path: string | null;
  created_by: string | null; created_at: string;
}

export interface OpportunityRow {
  id: string; title: string; organiser: string; level: string; kind: string; location: string; starts_on: string | null;
  ends_on: string | null; deadline: string | null; link: string | null; description: string; categories: unknown; created_at: string;
}

export interface InterestRow { opportunity_id: string; user_id: string; category: string }

const LEVEL_IDS = LEVELS.map((l) => l.id) as string[];
const POSITION_IDS = POSITIONS.map((p) => p.id) as string[];
const KIND_IDS = ["fest", "competition", "audition", "workshop", "scholarship"];
const isDisc = (d: unknown): d is DisciplineId => typeof d === "string" && d in DISC_MAP;
const text = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export function categoriesOf(raw: unknown): OpportunityCategory[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((c) => c && typeof c === "object" && typeof c.name === "string" && isDisc(c.discipline))
    .map((c, i) => ({ id: typeof c.id === "string" && c.id ? c.id : `cat-${i}`, name: c.name, discipline: c.discipline, team: c.team === true }));
}

export function toTrophy(r: TrophyRow, people: Map<string, { name: string; avatar: string }>, me: string | null): ClubTrophy {
  const ids = r.member_ids ?? [];
  return {
    id: r.id, title: r.title, fest: r.fest,
    level: (LEVEL_IDS.includes(r.level) ? r.level : "university") as CompLevel,
    position: (POSITION_IDS.includes(r.position) ? r.position : "winner") as TrophyPosition,
    discipline: isDisc(r.discipline) ? r.discipline : null,
    wonOn: r.won_on, team: r.team ?? "", description: r.description ?? "", photo: r.photo,
    members: ids.filter((id) => people.has(id)).map((id) => ({ id, ...people.get(id)! })),
    mine: !!me && ids.includes(me),
  };
}

export function toOpportunity(r: OpportunityRow, interests: InterestRow[], me: string, friends: Set<string>): Opportunity {
  const mineRows = interests.filter((i) => i.opportunity_id === r.id);
  const people = new Set(mineRows.map((i) => i.user_id));
  return {
    id: r.id, title: r.title, organiser: r.organiser ?? "",
    level: (LEVEL_IDS.includes(r.level) ? r.level : "university") as CompLevel,
    kind: (KIND_IDS.includes(r.kind) ? r.kind : "fest") as Opportunity["kind"],
    location: r.location ?? "", startsOn: r.starts_on, endsOn: r.ends_on, deadline: r.deadline, link: r.link ?? "",
    description: r.description ?? "",
    categories: categoriesOf(r.categories).map((c) => ({ ...c, interested: mineRows.filter((i) => i.category === c.id).length })),
    interested: people.size,
    mine: mineRows.filter((i) => i.user_id === me).map((i) => i.category),
    friendsInterested: [...people].filter((id) => friends.has(id)).length,
  };
}

/** Validates the trophy form; returns DB columns or an error message. */
export function parseTrophy(b: Record<string, unknown>): { values: Record<string, unknown> } | { error: string } {
  const title = text(b.title, 80);
  const fest = text(b.fest, 100);
  if (title.length < 2) return { error: "What was the trophy for? (e.g. Folk Dance)" };
  if (fest.length < 2) return { error: "Which fest or competition?" };
  const level = LEVEL_IDS.includes(String(b.level)) ? b.level : "university";
  const position = POSITION_IDS.includes(String(b.position)) ? b.position : "winner";
  const memberIds = Array.isArray(b.memberIds) ? [...new Set(b.memberIds.filter((x) => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)))].slice(0, 40) : [];
  return {
    values: {
      title, fest, level, position, discipline: isDisc(b.discipline) ? b.discipline : null, won_on: day(b.wonOn),
      member_ids: memberIds, team: text(b.team, 300), description: text(b.description, 600),
    },
  };
}

/** Validates the opportunity form; returns DB columns or an error message. */
export function parseOpportunity(b: Record<string, unknown>): { values: Record<string, unknown> } | { error: string } {
  const title = text(b.title, 100);
  if (title.length < 3) return { error: "Give the opportunity a title" };
  const link = text(b.link, 300);
  if (link && !/^https?:\/\//i.test(link)) return { error: "The link should start with https://" };
  const cats = categoriesOf(b.categories).slice(0, 40).map((c) => ({ ...c, name: c.name.trim().slice(0, 60) })).filter((c) => c.name);
  return {
    values: {
      title, organiser: text(b.organiser, 100), location: text(b.location, 100), description: text(b.description, 2000),
      level: LEVEL_IDS.includes(String(b.level)) ? b.level : "university",
      kind: KIND_IDS.includes(String(b.kind)) ? b.kind : "fest",
      starts_on: day(b.startsOn), ends_on: day(b.endsOn), deadline: day(b.deadline), link: link || null, categories: cats,
    },
  };
}

/** Club-wide goals everyone contributes to. Tables from later migrations count as 0 until they exist. */
export async function milestones(): Promise<Milestone[]> {
  const sb = admin();
  const count = async (q: PromiseLike<{ count: number | null; error: { code?: string; message?: string } | null }>) => {
    const { count: n, error } = await q;
    if (error && !isMissing(error)) throw error;
    return error ? 0 : n ?? 0;
  };
  const head = { count: "exact" as const, head: true };
  const demo = `(${DEMO_EMAILS.map((e) => `"${e}"`).join(",")})`;
  const [members, events, checkins, works, friends, stars, raised, trophies, branches] = await Promise.all([
    count(sb.from("profiles").select("id", head).not("email", "in", demo)),
    count(sb.from("events").select("id", head).eq("cancelled", false).lt("starts_at", new Date().toISOString())),
    count(sb.from("event_signups").select("event_id", head).eq("attended", true)),
    count(sb.from("posts").select("id", head).not("user_id", "is", null)),
    count(sb.from("friendships").select("requester", head).eq("status", "accepted")),
    count(sb.from("recognitions").select("id", head)),
    count(sb.from("opportunity_interests").select("user_id", head)),
    count(sb.from("club_trophies").select("id", head)),
    Promise.all(DEPTS.map((d) => count(sb.from("profiles").select("id", head).eq("dept", d).not("email", "in", demo)))).then((ns) => ns.filter((n) => n > 0).length),
  ]);
  return [
    { id: "members", label: "Members on Spandana", unit: "members", icon: "Users", value: members, tiers: [10, 25, 50, 100, 250, 500] },
    { id: "branches", label: "Branches represented", unit: "branches", icon: "GitBranch", value: branches, tiers: [3, 5, 7] },
    { id: "events", label: "SVM events held", unit: "events", icon: "CalendarDays", value: events, tiers: [3, 10, 25, 50] },
    { id: "checkins", label: "Verified check-ins", unit: "check-ins", icon: "CalendarCheck", value: checkins, tiers: [25, 100, 250, 500, 1000] },
    { id: "works", label: "Works shared in Mask Mode", unit: "works", icon: "Images", value: works, tiers: [10, 25, 50, 100, 250] },
    { id: "friends", label: "Friendships made", unit: "friendships", icon: "Handshake", value: friends, tiers: [10, 50, 100, 250] },
    { id: "raised", label: "Hands raised for fests", unit: "sign-ups", icon: "Flag", value: raised, tiers: [10, 25, 50, 100] },
    { id: "stars", label: "Members recognised", unit: "recognitions", icon: "Star", value: stars, tiers: [5, 25, 50, 100] },
    { id: "trophies", label: "Trophies won", unit: "trophies", icon: "Trophy", value: trophies, tiers: [1, 5, 10, 25] },
  ];
}
