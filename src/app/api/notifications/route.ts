import { NextResponse } from "next/server";
import { unlockedIds } from "@/lib/achievements";
import { AUDIENCE, eventEnd } from "@/lib/club";
import { DISC_MAP } from "@/lib/data";
import { currentUser, failure } from "@/lib/server/auth";
import { type InviteRow, type RecognitionRow, rolesOf } from "@/lib/server/club";
import { friendRows } from "@/lib/server/people";
import { rowsOrEmpty } from "@/lib/server/setup";
import { statsFor } from "@/lib/server/stats";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Badge counts for the navigation, plus achievements and recognitions to celebrate. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const sb = admin();
    const [friends, invites, recognitions, mine, attended] = await Promise.all([
      friendRows(me.id, { optional: true }),
      rowsOrEmpty<InviteRow & { events: { starts_at: string; duration_min: number; cancelled: boolean } | null }>(
        sb.from("event_invites").select("*, events(starts_at, duration_min, cancelled)").eq("user_id", me.id).eq("status", "pending"),
      ),
      rowsOrEmpty<Pick<RecognitionRow, "id" | "title">>(sb.from("recognitions").select("id, title").eq("user_id", me.id).order("created_at", { ascending: false }).limit(50)),
      statsFor(me.id, { private: true }),
      rowsOrEmpty<{ event_id: string; role_id: string; events: { title: string; discipline: string; roles: unknown } | null }>(
        sb.from("event_signups").select("event_id, role_id, events(title, discipline, roles)").eq("user_id", me.id).eq("attended", true),
      ),
    ]);
    const now = Date.now();
    const openInvites = invites.filter((i) => i.events && !i.events.cancelled && eventEnd({ startsAt: new Date(i.events.starts_at).getTime(), durationMin: i.events.duration_min }) > now);
    return NextResponse.json({
      friendRequests: friends.filter((f) => f.status === "pending" && f.addressee === me.id).length,
      invites: openInvites.length,
      unlocked: mine ? unlockedIds(mine.stats) : [],
      recognitions,
      // Checked-in events, so the client can credit them on the Confidence Ladder and Kala Passport.
      attended: attended.filter((a) => a.events).map((a) => {
        const role = rolesOf(a.events!.roles).find((r) => r.id === a.role_id) ?? AUDIENCE;
        return {
          id: a.event_id, title: a.events!.title, role: role.label,
          kind: role.id === AUDIENCE.id ? "attended" : role.stage ? "showcase" : "gig",
          discipline: a.events!.discipline in DISC_MAP ? a.events!.discipline : undefined,
        };
      }),
    });
  } catch (e) {
    return failure(e);
  }
}
