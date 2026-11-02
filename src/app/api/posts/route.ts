import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { serializePost, type PostRow } from "@/lib/server/posts";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await currentUser();
    const sb = admin();
    const { data: rows, error } = await sb.from("posts").select("*").order("created_at", { ascending: false }).limit(100);
    if (error) throw error;
    const ids = (rows ?? []).map((r) => r.id);
    const { data: cs, error: cErr } = ids.length
      ? await sb.from("comments").select("post_id, body").in("post_id", ids).order("created_at")
      : { data: [], error: null };
    if (cErr) throw cErr;
    const byPost = new Map<string, string[]>();
    for (const c of cs ?? []) byPost.set(c.post_id, [...(byPost.get(c.post_id) ?? []), c.body]);
    return NextResponse.json({ posts: (rows as PostRow[]).map((r) => serializePost(r, user?.id ?? null, byPost.get(r.id) ?? [])) });
  } catch (e) {
    return failure(e);
  }
}

const ADJ = ["Velvet", "Quiet", "Neon", "Silver", "Monsoon", "Midnight", "Paper", "Golden", "Hidden", "Cosmic", "Amber", "Saffron"];
const NOUN = ["Tabla", "Comet", "Peacock", "Veena", "Lantern", "Raga", "Sparrow", "Ink", "Echo", "Kite", "Mridanga", "Lotus"];
const PREFIX = { photo: "image/", audio: "audio/", video: "video/" } as const;

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Please log in to post" }, { status: 401 });
    const { kind, title: rawTitle, body: rawBody, path, mime } = (await req.json()) as { kind: string; title?: string; body?: string; path?: string; mime?: string };
    const title = String(rawTitle ?? "").trim().slice(0, 80) || "Untitled";
    const body = String(rawBody ?? "").trim().slice(0, 1500);

    let media: string | null = null;
    if (kind === "text") {
      if (body.length < 3) return NextResponse.json({ error: "Write something first" }, { status: 400 });
    } else if (kind === "photo" || kind === "audio" || kind === "video") {
      // The file was uploaded directly to storage; only accept paths in this user's own folder.
      if (!path?.startsWith(`${user.id}/`) || !mime?.startsWith(PREFIX[kind])) return NextResponse.json({ error: "Upload the file first" }, { status: 400 });
      media = admin().storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl;
    } else {
      return NextResponse.json({ error: "Unknown post type" }, { status: 400 });
    }

    const alias = `${ADJ[Math.floor(Math.random() * ADJ.length)]} ${NOUN[Math.floor(Math.random() * NOUN.length)]}`;
    const { data, error } = await admin()
      .from("posts")
      .insert({ user_id: user.id, alias, kind, title, body: body || null, media, media_path: media ? path : null, mime: media ? mime : null })
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ post: serializePost(data as PostRow, user.id, []) });
  } catch (e) {
    return failure(e);
  }
}
