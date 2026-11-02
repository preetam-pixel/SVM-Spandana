import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Files go straight from the browser to Supabase Storage via a signed URL,
// so large reels never pass through (or hit the body limit of) a serverless function.
const LIMITS = { photo: { prefix: "image/", mb: 10 }, audio: { prefix: "audio/", mb: 20 }, video: { prefix: "video/", mb: 50 }, avatar: { prefix: "image/", mb: 5 } } as const;

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const { kind, mime, size } = (await req.json()) as { kind: keyof typeof LIMITS; mime: string; size: number };
    const rule = LIMITS[kind];
    if (!rule) return NextResponse.json({ error: "Unknown upload type" }, { status: 400 });
    if (!mime?.startsWith(rule.prefix)) return NextResponse.json({ error: `Unsupported file type ${mime || "(unknown)"}` }, { status: 400 });
    if (!(size > 0) || size > rule.mb * 1024 * 1024) return NextResponse.json({ error: `File is too large (max ${rule.mb} MB)` }, { status: 400 });

    const ext = (mime.split("/")[1] ?? "bin").replace(/[^a-z0-9]/gi, "").slice(0, 5) || "bin";
    const path = `${user.id}/${kind}-${crypto.randomUUID()}.${ext}`;
    const { data, error } = await admin().storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    return NextResponse.json({ path: data.path, token: data.token });
  } catch (e) {
    return failure(e);
  }
}
