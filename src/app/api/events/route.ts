import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import {
  type AnnouncementRow, type EventRow, type InviteRow, type SignupRow,
  isCore, newCheckinCode, parseEventInput, profilesById, toAnnouncement, toClubEvent,
} from "@/lib/server/club";
import { friendRows, otherSide } from "@/lib/server/people";
import { EventsNotSetUp, eventRows } from "@/lib/server/setup";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Upcoming and recent SVM events (with the viewer's sign-ups and invites) plus the notice board. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const sb = admin();
    const since = new Date(Date.now() - 60 * 86_400_000).toISOString();

    let rows: EventRow[];
    try {
      rows = await eventRows<EventRow>(sb.from("events").select("*").gte("starts_at", since).order("starts_at").limit(200));
    } catch (e) {
      if (e instanceof EventsNotSetUp) return NextResponse.json({ core: isCore(me), events: [], announcements: [], setup: e.message });
      throw e;
    }
    const ids = rows.map((r) => r.id);
    const [signups, invites, notices, friends] = await Promise.all([
      ids.length ? eventRows<SignupRow>(sb.from("event_signups").select("*").in("event_id", ids)) : Promise.resolve([] as SignupRow[]),
      eventRows<InviteRow>(sb.from("event_invites").select("*").eq("user_id", me.id)),
      eventRows<AnnouncementRow>(sb.from("announcements").select("*").order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(20)),
      friendRows(me.id, { optional: true }),
    ]);
    const friendIds = friends.filter((f) => f.status === "accepted").map((f) => otherSide(me.id, f));
    const people = await profilesById([...friendIds, ...rows.map((r) => r.created_by), ...notices.map((n) => n.created_by)]);
    const friendNames = new Map(friendIds.map((id) => [id, (people.get(id)?.name ?? "Friend").split(" ")[0]]));

    const events = rows.map((r) =>
      toClubEvent(r, signups.filter((s) => s.event_id === r.id), {
        me: me.id, friends: friendNames, host: (r.created_by && people.get(r.created_by)?.name) || "SVM Core",
        invite: invites.find((i) => i.event_id === r.id),
      }),
    );
    return NextResponse.json({ core: isCore(me), events, announcements: notices.map((n) => toAnnouncement(n, people)) });
  } catch (e) {
    return failure(e);
  }
}

/** Core members post a new event with its call for participants. */
export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can post events" }, { status: 403 });
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseEventInput(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    let poster: { poster: string; poster_path: string } | object = {};
    if (typeof body.posterPath === "string" && body.posterPath) {
      // Uploaded through /api/uploads, so it must be in this member's own folder.
      if (!body.posterPath.startsWith(`${me.id}/`)) return NextResponse.json({ error: "Invalid poster" }, { status: 400 });
      poster = { poster: admin().storage.from(MEDIA_BUCKET).getPublicUrl(body.posterPath).data.publicUrl, poster_path: body.posterPath };
    }
    const [created] = await eventRows<{ id: string }>(
      admin().from("events").insert({ ...parsed.values, ...poster, created_by: me.id, checkin_code: newCheckinCode() }).select("id"),
    );
    return NextResponse.json({ id: created.id });
  } catch (e) {
    return failure(e);
  }
}
