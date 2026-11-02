import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { removeUpload } from "@/lib/server/uploads";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const KINDS = ["heart", "fire", "wow", "clap"] as const;

export async function POST(req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
  const post = db().prepare("SELECT id, user_id FROM posts WHERE id = ?").get(id) as { id: string; user_id: string | null } | undefined;
  if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
  const body = (await req.json()) as { action: string; kind?: string; text?: string };

  if (body.action === "react" && KINDS.includes(body.kind as (typeof KINDS)[number])) {
    // Column name comes from the fixed KINDS list above, never from raw input.
    db().prepare(`UPDATE posts SET ${body.kind} = ${body.kind} + 1 WHERE id = ?`).run(id);
  } else if (body.action === "comment" && body.text?.trim()) {
    db().prepare("INSERT INTO comments (post_id, user_id, body, created_at) VALUES (?, ?, ?, ?)").run(id, user.id, body.text.trim().slice(0, 300), Date.now());
  } else if (body.action === "unmask") {
    if (post.user_id !== user.id) return NextResponse.json({ error: "Only the creator can unmask" }, { status: 403 });
    db().prepare("UPDATE posts SET unmasked = ? WHERE id = ?").run(`${user.name} (${user.dept}, ${user.year} yr)`, id);
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  const user = await currentUser();
  const post = db().prepare("SELECT user_id, media FROM posts WHERE id = ?").get(id) as { user_id: string | null; media: string | null } | undefined;
  if (!user || !post || post.user_id !== user.id) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  db().prepare("DELETE FROM posts WHERE id = ?").run(id);
  await removeUpload(post.media);
  return NextResponse.json({ ok: true });
}
