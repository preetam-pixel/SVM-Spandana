import { NextResponse } from "next/server";
import { AUDIENCE, checkInOpen, eventEnd } from "@/lib/club";
import { currentUser, failure } from "@/lib/server/auth";
import {
  type EventRow, type InviteRow, type RecognitionRow, type SignupRow,
  isCore, parseEventInput, profilesById, rolesOf, suggestFor, toClubEvent,
} from "@/lib/server/club";
import type { ProfileRow } from "@/lib/server/db";
import { deptOf, friendRows, isUuid, otherSide } from "@/lib/server/people";
import { eventRows } from "@/lib/server/setup";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";
import type { Account, EventDetail } from "@/lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const notFound = () => NextResponse.json({ error: "Event not found" }, { status: 404 });
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function load(id: string) {
  if (!isUuid(id)) return null;
  const [row] = await eventRows<EventRow>(admin().from("events").select("*").eq("id", id).limit(1));
  return row ?? null;
}

const signupsOf = (id: string) => eventRows<SignupRow>(admin().from("event_signups").select("*").eq("event_id", id).order("created_at"));

async function detail(row: EventRow, me: Account): Promise<EventDetail> {
  const sb = admin();
  const core = isCore(me);
  const [signups, invites, stars, friends] = await Promise.all([
    signupsOf(row.id),
    eventRows<InviteRow>(core ? sb.from("event_invites").select("*").eq("event_id", row.id) : sb.from("event_invites").select("*").eq("event_id", row.id).eq("user_id", me.id)),
    core ? eventRows<Pick<RecognitionRow, "user_id">>(sb.from("recognitions").select("user_id").eq("event_id", row.id)) : Promise.resolve([]),
    friendRows(me.id, { optional: true }),
  ]);
  const friendIds = new Set(friends.filter((f) => f.status === "accepted").map((f) => otherSide(me.id, f)));
  const people = await profilesById([...signups.map((s) => s.user_id), ...invites.map((i) => i.user_id), row.created_by]);
  const friendNames = new Map([...friendIds].map((id) => [id, (people.get(id)?.name ?? "Friend").split(" ")[0]]));
  const event = toClubEvent(row, signups, {
    me: me.id, friends: friendNames, host: (row.created_by && people.get(row.created_by)?.name) || "SVM Core",
    invite: invites.find((i) => i.user_id === me.id),
  });
  const roleIds = new Set(event.roles.map((r) => r.id));
  const starred = new Set(stars.map((s) => s.user_id));
  return {
    event,
    core,
    canCheckIn: !row.cancelled && checkInOpen(event) && !event.mine?.attended,
    people: signups.map((s) => {
      const p = people.get(s.user_id);
      return {
        id: s.user_id, name: p?.name ?? "Member", avatar: p?.avatar ?? "", dept: deptOf(p?.dept ?? ""), year: p?.year ?? 1,
        roleId: roleIds.has(s.role_id) ? s.role_id : AUDIENCE.id, friend: friendIds.has(s.user_id),
        ...(core ? { note: s.note, attended: s.attended, star: starred.has(s.user_id) } : {}),
      };
    }),
    ...(core
      ? {
          checkinCode: row.checkin_code,
          invites: invites.map((i) => ({ userId: i.user_id, name: people.get(i.user_id)?.name ?? "Member", roleId: i.role_id, status: i.status })),
        }
      : {}),
  };
}

export async function GET(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    const row = await load(id);
    if (!row) return notFound();

    // Organisers: members who'd suit this event and haven't signed up or been invited yet.
    if (new URL(req.url).searchParams.get("suggest")) {
      if (!isCore(me)) return bad("Only SVM core members can see suggestions", 403);
      const [signups, invites, { data, error }] = await Promise.all([
        signupsOf(row.id),
        eventRows<InviteRow>(admin().from("event_invites").select("user_id").eq("event_id", row.id)),
        admin().from("profiles").select("*").limit(3000),
      ]);
      if (error) throw error;
      const exclude = new Set([me.id, ...signups.map((s) => s.user_id), ...invites.map((i) => i.user_id)]);
      const event = toClubEvent(row, signups, { me: me.id, friends: new Map(), host: "" });
      return NextResponse.json({ suggestions: suggestFor(event, data as ProfileRow[], exclude) });
    }
    return NextResponse.json(await detail(row, me));
  } catch (e) {
    return failure(e);
  }
}

/** Core members edit or cancel an event. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isCore(me)) return bad("Only SVM core members can edit events", 403);
    const row = await load(id);
    if (!row) return notFound();
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseEventInput(body, true);
    if ("error" in parsed) return bad(parsed.error);
    const patch: Record<string, unknown> = { ...parsed.values };
    if (typeof body.cancelled === "boolean") patch.cancelled = body.cancelled;
    if (typeof body.posterPath === "string" && body.posterPath) {
      if (!body.posterPath.startsWith(`${me.id}/`)) return bad("Invalid poster");
      patch.poster = admin().storage.from(MEDIA_BUCKET).getPublicUrl(body.posterPath).data.publicUrl;
      patch.poster_path = body.posterPath;
    } else if (body.removePoster === true) {
      patch.poster = null;
      patch.poster_path = null;
    }
    await eventRows(admin().from("events").update(patch).eq("id", id).select("id"));
    if ("poster_path" in patch && row.poster_path && row.poster_path !== patch.poster_path) await admin().storage.from(MEDIA_BUCKET).remove([row.poster_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isCore(me)) return bad("Only SVM core members can delete events", 403);
    const row = await load(id);
    if (!row) return notFound();
    await eventRows(admin().from("events").delete().eq("id", id).select("id"));
    if (row.poster_path) await admin().storage.from(MEDIA_BUCKET).remove([row.poster_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

// Wrong check-in codes per member and event, so the 4-digit code can't simply be guessed.
const attempts = new Map<string, { n: number; until: number }>();
function tooManyAttempts(key: string, failed: boolean): boolean {
  const now = Date.now();
  const a = attempts.get(key);
  if (a && a.until > now && a.n >= 5) return true;
  if (failed) attempts.set(key, { n: a && a.until > now ? a.n + 1 : 1, until: now + 10 * 60_000 });
  return false;
}

type Body = { action: string; roleId?: string; note?: string; code?: string; accept?: boolean; userId?: string; attended?: boolean; title?: string; message?: string };

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    const row = await load(id);
    if (!row) return notFound();
    const b = (await req.json()) as Body;
    const sb = admin();
    const roles = rolesOf(row.roles);
    const ended = eventEnd({ startsAt: new Date(row.starts_at).getTime(), durationMin: row.duration_min }) < Date.now();
    const signups = await signupsOf(row.id);
    const mine = signups.find((s) => s.user_id === me.id);

    /** Puts a member in a role if it has room. Returns an error message or null. */
    const join = async (userId: string, roleId: string, extra: { note?: string; attended?: boolean } = {}) => {
      const role = roles.find((r) => r.id === roleId);
      if (!role) return "That role isn't open for this event";
      const taken = signups.filter((s) => s.role_id === role.id && s.user_id !== userId).length;
      if (role.slots > 0 && taken >= role.slots) return `All ${role.label} spots are taken. Pick another role or join the audience.`;
      const current = signups.find((s) => s.user_id === userId);
      await eventRows(
        sb.from("event_signups").upsert({
          event_id: row.id, user_id: userId, role_id: role.id,
          note: extra.note !== undefined ? extra.note : current?.note ?? "",
          attended: extra.attended ?? current?.attended ?? false,
        }).select("event_id"),
      );
      await eventRows(sb.from("event_invites").update({ status: "accepted" }).eq("event_id", row.id).eq("user_id", userId).eq("status", "pending").select("event_id"));
      return null;
    };

    switch (b.action) {
      // ---------- Members ----------
      case "signup": {
        if (row.cancelled) return bad("This event was cancelled");
        if (ended) return bad("This event is over");
        const err = await join(me.id, String(b.roleId ?? AUDIENCE.id), { note: String(b.note ?? "").trim().slice(0, 140) });
        return err ? bad(err, 409) : NextResponse.json({ ok: true });
      }
      case "leave": {
        if (mine?.attended) return bad("You've already checked in at this event");
        await eventRows(sb.from("event_signups").delete().eq("event_id", row.id).eq("user_id", me.id).select("event_id"));
        return NextResponse.json({ ok: true });
      }
      case "checkin": {
        const start = new Date(row.starts_at).getTime();
        if (row.cancelled || !checkInOpen({ startsAt: start, durationMin: row.duration_min })) return bad("Check-in opens an hour before the event starts");
        const key = `${me.id}:${row.id}`;
        if (tooManyAttempts(key, false)) return bad("Too many wrong codes. Ask an organiser to mark you present.", 429);
        if (String(b.code ?? "").trim() !== row.checkin_code) {
          tooManyAttempts(key, true);
          return bad("That code isn't right. Check the code shown at the venue.");
        }
        if (mine) await eventRows(sb.from("event_signups").update({ attended: true }).eq("event_id", row.id).eq("user_id", me.id).select("event_id"));
        else await eventRows(sb.from("event_signups").insert({ event_id: row.id, user_id: me.id, role_id: AUDIENCE.id, attended: true }).select("event_id"));
        return NextResponse.json({ ok: true });
      }
      case "respond": {
        const [invite] = await eventRows<InviteRow>(sb.from("event_invites").select("*").eq("event_id", row.id).eq("user_id", me.id).limit(1));
        if (!invite) return bad("No invite for this event", 404);
        if (!b.accept) {
          await eventRows(sb.from("event_invites").update({ status: "declined" }).eq("event_id", row.id).eq("user_id", me.id).select("event_id"));
          return NextResponse.json({ ok: true });
        }
        if (row.cancelled || ended) return bad("This event is no longer open");
        const err = await join(me.id, invite.role_id);
        return err ? bad(err, 409) : NextResponse.json({ ok: true });
      }
    }

    // ---------- Organisers ----------
    if (!isCore(me)) return bad("Only SVM core members can do that", 403);
    const userId = String(b.userId ?? "");
    if (!isUuid(userId)) return bad("Pick a member");
    const { data: target } = await sb.from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!target) return bad("Member not found", 404);

    switch (b.action) {
      case "invite": {
        if (signups.some((s) => s.user_id === userId)) return bad("They've already signed up");
        const role = roles.find((r) => r.id === b.roleId) ?? roles[0];
        await eventRows(sb.from("event_invites").upsert({ event_id: row.id, user_id: userId, invited_by: me.id, role_id: role.id, status: "pending" }).select("event_id"));
        return NextResponse.json({ ok: true });
      }
      case "attend": {
        const present = b.attended !== false;
        if (signups.some((s) => s.user_id === userId)) await eventRows(sb.from("event_signups").update({ attended: present }).eq("event_id", row.id).eq("user_id", userId).select("event_id"));
        else if (present) await eventRows(sb.from("event_signups").insert({ event_id: row.id, user_id: userId, role_id: AUDIENCE.id, attended: true }).select("event_id"));
        return NextResponse.json({ ok: true });
      }
      case "star": {
        if (userId === me.id) return bad("You can't star yourself");
        const title = String(b.title ?? "").trim().slice(0, 40) || "Star Performer";
        const message = String(b.message ?? "").trim().slice(0, 280);
        // A star means they were there.
        if (signups.some((s) => s.user_id === userId)) await eventRows(sb.from("event_signups").update({ attended: true }).eq("event_id", row.id).eq("user_id", userId).select("event_id"));
        else await eventRows(sb.from("event_signups").insert({ event_id: row.id, user_id: userId, role_id: AUDIENCE.id, attended: true }).select("event_id"));
        const existing = await eventRows<{ id: string }>(sb.from("recognitions").select("id").eq("event_id", row.id).eq("user_id", userId).limit(1));
        if (existing.length) await eventRows(sb.from("recognitions").update({ title, message, given_by: me.id }).eq("id", existing[0].id).select("id"));
        else await eventRows(sb.from("recognitions").insert({ user_id: userId, given_by: me.id, event_id: row.id, title, message }).select("id"));
        return NextResponse.json({ ok: true });
      }
      case "unstar": {
        await eventRows(sb.from("recognitions").delete().eq("event_id", row.id).eq("user_id", userId).select("id"));
        return NextResponse.json({ ok: true });
      }
    }
    return bad("Unknown action");
  } catch (e) {
    return failure(e);
  }
}
