import { NextResponse } from "next/server";
import { AUDIENCE } from "@/lib/club";
import { DISCIPLINES, DISC_MAP } from "@/lib/data";
import { daysUntil } from "@/lib/opportunities";
import { currentUser, failure } from "@/lib/server/auth";
import { type EventRow, type SignupRow, isCore, rolesOf } from "@/lib/server/club";
import { type InterestRow, type OpportunityRow, categoriesOf } from "@/lib/server/clubdata";
import type { ProfileRow } from "@/lib/server/db";
import { cleanState, deptOf } from "@/lib/server/people";
import { rowsOrEmpty } from "@/lib/server/setup";
import { DEMO_EMAILS } from "@/lib/server/stats";
import { admin } from "@/lib/supabase/server";
import type { CoreDashboard, DisciplineId } from "@/lib/types";

export const runtime = "nodejs";

type Member = Pick<ProfileRow, "id" | "name" | "avatar" | "dept" | "year" | "role" | "state" | "created_at" | "email">;

const DAY = 86_400_000;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Live club numbers for core members: members, events, check-ins, fest interest and what needs doing next. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "The Core Dashboard is for SVM core members" }, { status: 403 });

    const sb = admin();
    const now = Date.now();
    const since = new Date(now - 60 * DAY).toISOString();
    const [profiles, events, opps, interests, trophies] = await Promise.all([
      rowsOrEmpty<Member>(sb.from("profiles").select("id, name, avatar, dept, year, role, state, created_at, email").limit(5000)),
      rowsOrEmpty<EventRow>(sb.from("events").select("*").gte("starts_at", since).eq("cancelled", false).order("starts_at").limit(200)),
      rowsOrEmpty<OpportunityRow>(sb.from("opportunities").select("*").order("deadline", { ascending: true, nullsFirst: false }).limit(50)),
      rowsOrEmpty<InterestRow>(sb.from("opportunity_interests").select("opportunity_id, user_id, category").limit(5000)),
      rowsOrEmpty<{ id: string }>(sb.from("club_trophies").select("id").limit(1000)),
    ]);
    const signups = events.length
      ? await rowsOrEmpty<SignupRow>(sb.from("event_signups").select("*").in("event_id", events.map((e) => e.id)))
      : [];

    // ---------- Members (demo accounts left out) ----------
    const members = profiles.filter((p) => !DEMO_EMAILS.includes(p.email));
    const states = new Map(members.map((p) => [p.id, cleanState(p)]));
    const names = new Map(profiles.map((p) => [p.id, p.name]));
    const sparked = members.filter((p) => states.get(p.id)!.sparkDone).length;
    const newThisWeek = members.filter((p) => now - new Date(p.created_at).getTime() < 7 * DAY).length;
    const team = members.filter((p) => p.role === "core");

    const branchCount = new Map<string, number>();
    for (const p of members) branchCount.set(deptOf(p.dept), (branchCount.get(deptOf(p.dept)) ?? 0) + 1);
    const artCount = new Map<DisciplineId, number>();
    for (const s of states.values()) for (const d of s.declared) artCount.set(d, (artCount.get(d) ?? 0) + 1);

    // ---------- Events ----------
    const byEvent = new Map<string, SignupRow[]>();
    for (const s of signups) byEvent.set(s.event_id, [...(byEvent.get(s.event_id) ?? []), s]);
    const endsAt = (e: EventRow) => new Date(e.starts_at).getTime() + e.duration_min * 60_000;

    const upcoming = events
      .filter((e) => endsAt(e) >= now)
      .slice(0, 12)
      .map((e) => {
        const list = byEvent.get(e.id) ?? [];
        const roles = rolesOf(e.roles).filter((r) => r.id !== AUDIENCE.id).map((r) => ({
          label: r.label, slots: r.slots, filled: list.filter((s) => s.role_id === r.id).length,
        }));
        return {
          id: e.id, title: e.title, startsAt: new Date(e.starts_at).getTime(), venue: e.venue ?? "",
          discipline: (e.discipline in DISC_MAP ? e.discipline : "vocal") as DisciplineId,
          going: list.length, checkinCode: e.checkin_code, roles,
          openSlots: roles.reduce((a, r) => a + (r.slots > 0 ? Math.max(0, r.slots - r.filled) : 0), 0),
        };
      });
    const past = events
      .filter((e) => endsAt(e) < now)
      .reverse()
      .slice(0, 8)
      .map((e) => {
        const list = byEvent.get(e.id) ?? [];
        return { id: e.id, title: e.title, startsAt: new Date(e.starts_at).getTime(), signedUp: list.length, attended: list.filter((s) => s.attended).length };
      });
    const pastSigned = past.reduce((a, e) => a + e.signedUp, 0);
    const pastAttended = past.reduce((a, e) => a + e.attended, 0);

    // ---------- Fests and competitions ----------
    const open = opps.filter((o) => (daysUntil(o.deadline ?? o.ends_on ?? o.starts_on) ?? 0) >= 0);
    const fests = open.map((o) => {
      const mine = interests.filter((i) => i.opportunity_id === o.id);
      return {
        id: o.id, title: o.title, deadline: o.deadline, startsOn: o.starts_on, people: new Set(mine.map((i) => i.user_id)).size,
        categories: categoriesOf(o.categories)
          .map((c) => ({
            id: c.id, name: c.name, discipline: c.discipline,
            people: mine.filter((i) => i.category === c.id).map((i) => ({ id: i.user_id, name: names.get(i.user_id) ?? "Member" })),
          }))
          .sort((a, b) => b.people.length - a.people.length),
      };
    });

    // ---------- What needs doing ----------
    const attention: CoreDashboard["attention"] = [];
    for (const e of upcoming) {
      const days = Math.floor((e.startsAt - now) / DAY);
      if (days <= 7 && e.openSlots > 0)
        attention.push({ tone: "urgent", text: `${e.title} is ${days <= 0 ? "today" : `in ${plural(days, "day")}`} and ${plural(e.openSlots, "role slot")} ${e.openSlots === 1 ? "is" : "are"} still open. Use Find people to invite members.`, href: `/events/${e.id}` });
    }
    for (const e of past.filter((p) => p.signedUp > 0 && p.attended === 0 && now - p.startsAt < 14 * DAY))
      attention.push({ tone: "urgent", text: `No check-ins recorded for ${e.title}. Mark who attended so it counts on their Passport.`, href: `/events/${e.id}` });
    for (const f of fests) {
      const d = daysUntil(f.deadline);
      if (d !== null && d <= 21)
        attention.push({ tone: d <= 7 ? "urgent" : "info", text: `${f.title}: registration closes in ${plural(d, "day")}. ${plural(f.people, "member")} raised a hand so far.`, href: "/opportunities" });
      else if (!f.deadline && !f.startsOn)
        attention.push({ tone: "info", text: `${f.title} has no dates yet. Add them once the official circular is out.`, href: "/opportunities" });
    }
    if (!upcoming.length) attention.push({ tone: "info", text: "No events coming up. Post one so members have something to join.", href: "/events" });
    const noSpark = members.length - sparked;
    if (noSpark > 0) attention.push({ tone: "info", text: `${plural(noSpark, "member")} ${noSpark === 1 ? "hasn't" : "haven't"} taken the Creative Spark, so role suggestions for them are guesses.`, href: "/people" });
    if (!trophies.length) attention.push({ tone: "info", text: "The trophy cabinet is empty. Add SVM's past wins so new members see them.", href: "/club" });

    const body: CoreDashboard = {
      kpis: {
        members: members.length, newThisWeek, sparkPct: members.length ? Math.round((sparked / members.length) * 100) : 0, core: team.length,
        upcomingEvents: upcoming.length, upcomingSignups: upcoming.reduce((a, e) => a + e.going, 0),
        checkinRate: pastSigned ? Math.round((pastAttended / pastSigned) * 100) : null,
        handsRaised: new Set(interests.map((i) => i.user_id)).size, trophies: trophies.length,
      },
      attention: attention.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "urgent" ? -1 : 1)),
      upcoming,
      past,
      fests,
      newMembers: [...members]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 8)
        .map((p) => {
          const s = states.get(p.id)!;
          return { id: p.id, name: p.name, avatar: p.avatar ?? "", dept: deptOf(p.dept), year: p.year, createdAt: new Date(p.created_at).getTime(), sparkDone: s.sparkDone, declared: s.declared };
        }),
      branches: [...branchCount].map(([dept, n]) => ({ dept, members: n })).sort((a, b) => b.members - a.members),
      artForms: DISCIPLINES.map((d) => ({ id: d.id, name: d.name, color: d.color, members: artCount.get(d.id) ?? 0 })).sort((a, b) => b.members - a.members),
      team: team.map((p) => ({ id: p.id, name: p.name, avatar: p.avatar ?? "", dept: deptOf(p.dept), year: p.year })),
    };
    return NextResponse.json(body);
  } catch (e) {
    return failure(e);
  }
}
