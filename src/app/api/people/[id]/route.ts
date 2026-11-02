import { NextResponse } from "next/server";
import { unlockedIds } from "@/lib/achievements";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore, loadRecognitions } from "@/lib/server/club";
import { profileRow } from "@/lib/server/db";
import { isMissing } from "@/lib/server/setup";
import { DEMO_EMAILS, statsFor } from "@/lib/server/stats";
import { friendRows, isUuid, otherSide, statusWith, toPublic } from "@/lib/server/people";
import { serializePost, type PostRow } from "@/lib/server/posts";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** One member's public profile, their unmasked works, and how they relate to the viewer. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isUuid(id)) return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    const row = await profileRow(id);
    if (!row) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const [mine, theirs] = await Promise.all([friendRows(me.id, { optional: true }), friendRows(id, { optional: true })]);
    const status = statusWith(me.id, id, mine);
    const myFriends = new Set(mine.filter((r) => r.status === "accepted").map((r) => otherSide(me.id, r)));
    const theirFriends = theirs.filter((r) => r.status === "accepted").map((r) => otherSide(id, r));

    // Only works the creator has chosen to unmask are linked to their profile.
    const [{ data: posts, error }, stats, recognitions] = await Promise.all([
      admin().from("posts").select("*").eq("user_id", id).not("unmasked", "is", null).order("created_at", { ascending: false }),
      statsFor(id), // public activity only: masked works never show on someone's profile
      loadRecognitions({ userId: id, limit: 20 }),
    ]);
    if (error) throw error;

    return NextResponse.json({
      person: { ...toPublic(row, status), achievements: stats ? unlockedIds(stats.stats) : [], recognitions },
      canRecognise: isCore(me) && id !== me.id,
      canChangeRole: isCore(me) && !DEMO_EMAILS.includes(me.email) && id !== me.id,
      status,
      friends: theirFriends.length,
      mutual: theirFriends.filter((f) => myFriends.has(f)).length,
      works: (posts as PostRow[]).map((p) => serializePost(p, me.id, [])),
    });
  } catch (e) {
    return failure(e);
  }
}

/** Core members promote a member to the core team (or step them back). The demo account can't. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me) || DEMO_EMAILS.includes(me.email)) return NextResponse.json({ error: "Only SVM core members can change roles" }, { status: 403 });
    if (!isUuid(id) || id === me.id) return NextResponse.json({ error: "Pick another member" }, { status: 400 });
    const { role } = (await req.json()) as { role?: string };
    if (role !== "core" && role !== "member") return NextResponse.json({ error: "Unknown role" }, { status: 400 });
    const { error } = await admin().from("profiles").update({ role }).eq("id", id);
    if (error) {
      if (isMissing(error)) return NextResponse.json({ error: "Run supabase/migrations/003_events_achievements.sql first", setup: true }, { status: 503 });
      throw error;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
