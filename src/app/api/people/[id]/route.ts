import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { profileRow } from "@/lib/server/db";
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
    const { data: posts, error } = await admin().from("posts").select("*").eq("user_id", id).not("unmasked", "is", null).order("created_at", { ascending: false });
    if (error) throw error;

    return NextResponse.json({
      person: toPublic(row, status),
      status,
      friends: theirFriends.length,
      mutual: theirFriends.filter((f) => myFriends.has(f)).length,
      works: (posts as PostRow[]).map((p) => serializePost(p, me.id, [])),
    });
  } catch (e) {
    return failure(e);
  }
}
