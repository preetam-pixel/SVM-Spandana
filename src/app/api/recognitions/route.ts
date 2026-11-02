import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore, loadRecognitions } from "@/lib/server/club";
import { isUuid } from "@/lib/server/people";
import { eventRows } from "@/lib/server/setup";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Wall of Fame: the latest recognitions from SVM core. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    return NextResponse.json({ recognitions: await loadRecognitions({ limit: 60 }) });
  } catch (e) {
    return failure(e);
  }
}

/** Core members recognise a member (outside of a specific event). */
export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can give recognitions" }, { status: 403 });
    const b = (await req.json()) as { userId?: string; title?: string; message?: string };
    const userId = String(b.userId ?? "");
    if (!isUuid(userId) || userId === me.id) return NextResponse.json({ error: "Pick another member" }, { status: 400 });
    const { data: target } = await admin().from("profiles").select("id").eq("id", userId).maybeSingle();
    if (!target) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    const title = String(b.title ?? "").trim().slice(0, 40);
    const message = String(b.message ?? "").trim().slice(0, 280);
    if (!title) return NextResponse.json({ error: "Pick a recognition" }, { status: 400 });
    await eventRows(admin().from("recognitions").insert({ user_id: userId, given_by: me.id, title, message }).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
