import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { eventRows } from "@/lib/server/setup";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Core members post a notice (auditions, meetings, results…). Notices are listed by GET /api/events. */
export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can post notices" }, { status: 403 });
    const b = (await req.json()) as { title?: string; body?: string; link?: string; pinned?: boolean };
    const title = String(b.title ?? "").trim().slice(0, 80);
    if (title.length < 3) return NextResponse.json({ error: "Give the notice a title" }, { status: 400 });
    const link = String(b.link ?? "").trim().slice(0, 300);
    if (link && !/^https?:\/\/\S+$/i.test(link)) return NextResponse.json({ error: "Links must start with http:// or https://" }, { status: 400 });
    await eventRows(
      admin().from("announcements").insert({ title, body: String(b.body ?? "").trim().slice(0, 600), link: link || null, pinned: !!b.pinned, created_by: me.id }).select("id"),
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can remove notices" }, { status: 403 });
    const id = new URL(req.url).searchParams.get("id") ?? "";
    await eventRows(admin().from("announcements").delete().eq("id", id).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
