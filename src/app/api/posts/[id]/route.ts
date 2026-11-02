import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { isMissing } from "@/lib/server/setup";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const KINDS = ["heart", "fire", "wow", "clap"];

export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const sb = admin();
    const { data: post } = await sb.from("posts").select("id, user_id").eq("id", id).maybeSingle();
    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
    const body = (await req.json()) as { action: string; kind?: string; text?: string; note?: string };

    if (body.action === "react" && KINDS.includes(body.kind ?? "")) {
      const { error } = await sb.rpc("add_reaction", { post: id, kind: body.kind });
      if (error) throw error;
    } else if (body.action === "comment" && body.text?.trim()) {
      const { error } = await sb.from("comments").insert({ post_id: id, user_id: user.id, body: body.text.trim().slice(0, 300) });
      if (error) throw error;
    } else if (body.action === "unmask") {
      if (post.user_id !== user.id) return NextResponse.json({ error: "Only the creator can unmask" }, { status: 403 });
      const { error } = await sb.from("posts").update({ unmasked: `${user.name} (${user.dept}, ${user.year} yr)` }).eq("id", id);
      if (error) throw error;
    } else if (body.action === "remask") {
      if (post.user_id !== user.id) return NextResponse.json({ error: "Only the creator can mask again" }, { status: 403 });
      const { error } = await sb.from("posts").update({ unmasked: null }).eq("id", id);
      if (error) throw error;
    } else if (body.action === "endorse" || body.action === "unendorse") {
      if (!isCore(user)) return NextResponse.json({ error: "Only SVM core members can endorse work" }, { status: 403 });
      if (body.action === "endorse" && post.user_id === user.id) return NextResponse.json({ error: "You can't endorse your own work" }, { status: 400 });
      const values = body.action === "endorse"
        ? { endorsed_by: user.id, endorsed_at: new Date().toISOString(), endorse_note: String(body.note ?? "").trim().slice(0, 140) || null }
        : { endorsed_by: null, endorsed_at: null, endorse_note: null };
      const { error } = await sb.from("posts").update(values).eq("id", id);
      if (error) {
        if (isMissing(error)) return NextResponse.json({ error: "Endorsements need a one-time database update: run supabase/migrations/005_endorsements.sql in the Supabase SQL editor.", setup: true }, { status: 503 });
        throw error;
      }
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const user = await currentUser();
    const sb = admin();
    const { data: post } = await sb.from("posts").select("user_id, media_path").eq("id", id).maybeSingle();
    if (!user || !post || post.user_id !== user.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    const { error } = await sb.from("posts").delete().eq("id", id);
    if (error) throw error;
    if (post.media_path) await sb.storage.from(MEDIA_BUCKET).remove([post.media_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
