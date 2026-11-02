import { NextResponse } from "next/server";
import { EMPTY_STATS, achievementPoints, evaluate } from "@/lib/achievements";
import { AUDIENCE } from "@/lib/club";
import { currentUser, failure } from "@/lib/server/auth";
import { type EventRow, type SignupRow, loadRecognitions, rolesOf } from "@/lib/server/club";
import { rowsOrEmpty } from "@/lib/server/setup";
import { statsFor } from "@/lib/server/stats";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** The viewer's achievement progress (including masked works, which only they see) and SVM-verified activity. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const [mine, signups, recognitions] = await Promise.all([
      statsFor(me.id, { private: true }),
      rowsOrEmpty<SignupRow>(admin().from("event_signups").select("*").eq("user_id", me.id).eq("attended", true)),
      loadRecognitions({ userId: me.id, limit: 50 }),
    ]);
    const events = signups.length
      ? await rowsOrEmpty<Pick<EventRow, "id" | "title" | "starts_at" | "roles">>(admin().from("events").select("id, title, starts_at, roles").in("id", signups.map((s) => s.event_id)))
      : [];
    const progress = evaluate(mine?.stats ?? EMPTY_STATS);
    const unlocked = progress.filter((p) => p.unlocked).map((p) => p.id);
    return NextResponse.json({
      stats: mine?.stats,
      progress,
      points: achievementPoints(unlocked),
      verified: {
        events: events
          .map((e) => {
            const s = signups.find((x) => x.event_id === e.id)!;
            const role = rolesOf(e.roles).find((r) => r.id === s.role_id) ?? AUDIENCE;
            return { id: e.id, title: e.title, startsAt: new Date(e.starts_at).getTime(), role: role.label, stage: role.stage };
          })
          .sort((a, b) => b.startsAt - a.startsAt),
        recognitions,
      },
    });
  } catch (e) {
    return failure(e);
  }
}
