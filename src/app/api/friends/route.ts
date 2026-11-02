import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import type { ProfileRow } from "@/lib/server/db";
import { FriendsNotSetUp, friendRows, isUuid, otherSide, statusWith, toCard } from "@/lib/server/people";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** The viewer's friends, plus requests waiting on them and requests they've sent. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    let rows;
    try {
      rows = await friendRows(me.id);
    } catch (e) {
      if (e instanceof FriendsNotSetUp) return NextResponse.json({ friends: [], incoming: [], outgoing: [], setup: e.message });
      throw e;
    }
    const ids = rows.map((r) => otherSide(me.id, r));
    const { data, error } = ids.length ? await admin().from("profiles").select("*").in("id", ids) : { data: [], error: null };
    if (error) throw error;
    const cards = (data as ProfileRow[]).map((r) => toCard(r, statusWith(me.id, r.id, rows)));
    return NextResponse.json({
      friends: cards.filter((c) => c.status === "friends"),
      incoming: cards.filter((c) => c.status === "incoming"),
      outgoing: cards.filter((c) => c.status === "outgoing"),
    });
  } catch (e) {
    return failure(e);
  }
}

const ACTIONS = ["request", "accept", "decline", "cancel", "remove"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const { userId, action } = (await req.json()) as { userId: string; action: Action };
    if (typeof userId !== "string" || !isUuid(userId) || userId === me.id) return NextResponse.json({ error: "Invalid member" }, { status: 400 });
    if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

    const sb = admin();
    const rows = await friendRows(me.id);
    const status = statusWith(me.id, userId, rows);
    const pair = sb.from("friendships");

    if (action === "request") {
      if (status === "friends" || status === "outgoing") return NextResponse.json({ status });
      if (status === "incoming") {
        // They already asked: sending a request back simply accepts theirs.
        const { error } = await pair.update({ status: "accepted", responded_at: new Date().toISOString() }).eq("requester", userId).eq("addressee", me.id);
        if (error) throw error;
        return NextResponse.json({ status: "friends" });
      }
      const { data: target } = await sb.from("profiles").select("id").eq("id", userId).maybeSingle();
      if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
      const { error } = await pair.insert({ requester: me.id, addressee: userId });
      // 23505: both sent a request at the same moment; report whatever the pair's row now says.
      if (error?.code === "23505") return NextResponse.json({ status: statusWith(me.id, userId, await friendRows(me.id)) });
      if (error) throw error;
      return NextResponse.json({ status: "outgoing" });
    }

    if (action === "accept") {
      if (status !== "incoming") return NextResponse.json({ status });
      const { error } = await pair.update({ status: "accepted", responded_at: new Date().toISOString() }).eq("requester", userId).eq("addressee", me.id);
      if (error) throw error;
      return NextResponse.json({ status: "friends" });
    }

    if (action === "decline" || action === "cancel" || action === "remove") {
      const { error } = await pair.delete().or(`and(requester.eq.${me.id},addressee.eq.${userId}),and(requester.eq.${userId},addressee.eq.${me.id})`);
      if (error) throw error;
      return NextResponse.json({ status: "none" });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return failure(e);
  }
}
