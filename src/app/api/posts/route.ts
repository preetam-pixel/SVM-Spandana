import { NextResponse } from "next/server";
import { currentUser, newId } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { serializePost, type PostRow } from "@/lib/server/posts";
import { UploadError, saveUpload } from "@/lib/server/uploads";

export const runtime = "nodejs";

export async function GET() {
  const user = await currentUser();
  const rows = db().prepare("SELECT * FROM posts ORDER BY created_at DESC LIMIT 100").all() as unknown as PostRow[];
  const cs = db().prepare("SELECT post_id, body FROM comments ORDER BY created_at").all() as { post_id: string; body: string }[];
  const byPost = new Map<string, string[]>();
  for (const c of cs) byPost.set(c.post_id, [...(byPost.get(c.post_id) ?? []), c.body]);
  return NextResponse.json({ posts: rows.map((r) => serializePost(r, user?.id ?? null, byPost.get(r.id) ?? [])) });
}

const ADJ = ["Velvet", "Quiet", "Neon", "Silver", "Monsoon", "Midnight", "Paper", "Golden", "Hidden", "Cosmic", "Amber", "Saffron"];
const NOUN = ["Tabla", "Comet", "Peacock", "Veena", "Lantern", "Raga", "Sparrow", "Ink", "Echo", "Kite", "Mridanga", "Lotus"];
const LIMIT_MB = { photo: 10, audio: 20, video: 60 } as const;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please log in to post" }, { status: 401 });
  const form = await req.formData();
  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "").trim().slice(0, 80) || "Untitled";
  const body = String(form.get("body") ?? "").trim().slice(0, 1500);
  const file = form.get("file");

  let media: { url: string; mime: string } | null = null;
  if (kind === "text") {
    if (body.length < 3) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  } else if (kind === "photo" || kind === "audio" || kind === "video") {
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a file to upload" }, { status: 400 });
    try {
      media = await saveUpload(file, [kind === "photo" ? "image" : kind], LIMIT_MB[kind]);
    } catch (e) {
      if (e instanceof UploadError) return NextResponse.json({ error: e.message }, { status: 400 });
      throw e;
    }
  } else {
    return NextResponse.json({ error: "Unknown post type" }, { status: 400 });
  }

  const alias = `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
  const id = newId("p");
  db().prepare("INSERT INTO posts (id, user_id, alias, kind, title, body, media, mime, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, user.id, alias, kind, title, body || null, media?.url ?? null, media?.mime ?? null, Date.now());
  const row = db().prepare("SELECT * FROM posts WHERE id = ?").get(id) as unknown as PostRow;
  return NextResponse.json({ post: serializePost(row, user.id, []) });
}
