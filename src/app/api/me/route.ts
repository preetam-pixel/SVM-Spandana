import { NextResponse } from "next/server";
import { DEPTS } from "@/lib/data";
import { currentUser, failure } from "@/lib/server/auth";
import { accountById, profileRow } from "@/lib/server/db";
import { MEDIA_BUCKET, admin, supabaseConfigured } from "@/lib/supabase/server";
import type { Dept, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  if (!supabaseConfigured()) return NextResponse.json({ user: null, configured: false });
  try {
    return NextResponse.json({ user: await currentUser(), configured: true });
  } catch (e) {
    return failure(e);
  }
}

const TEXT_FIELDS = { name: 60, usn: 12, email: 80, bio: 280, instagram: 40, youtube: 80 } as const;

export async function PATCH(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    const body = (await req.json()) as Record<string, unknown> & { profile?: Profile; avatarPath?: string };

    const patch: Record<string, unknown> = {};
    for (const [k, max] of Object.entries(TEXT_FIELDS)) {
      if (typeof body[k] !== "string") continue;
      let v = (body[k] as string).trim().slice(0, max);
      if (k === "name" && !v) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      if (k === "usn") v = v.toUpperCase();
      if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
      if (k === "instagram") v = v.replace(/^@/, "");
      patch[k] = v;
    }
    if (typeof body.dept === "string" && DEPTS.includes(body.dept as Dept)) patch.dept = body.dept;
    if (body.year !== undefined) patch.year = Math.min(4, Math.max(1, Number(body.year) || 1));
    if (body.profile && typeof body.profile === "object") {
      // Name / dept / year live in their own columns.
      const { name: _n, dept: _d, year: _y, ...state } = body.profile;
      patch.state = state;
    }

    let oldAvatar: string | null = null;
    if (typeof body.avatarPath === "string") {
      // Only accept files this user uploaded through a signed URL (their own folder).
      if (!body.avatarPath.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Invalid file" }, { status: 400 });
      oldAvatar = (await profileRow(user.id))?.avatar_path ?? null;
      patch.avatar_path = body.avatarPath;
      patch.avatar = admin().storage.from(MEDIA_BUCKET).getPublicUrl(body.avatarPath).data.publicUrl;
    }

    if (Object.keys(patch).length) {
      const { error } = await admin().from("profiles").update(patch).eq("id", user.id);
      if (error) throw error;
    }
    if (oldAvatar && oldAvatar !== body.avatarPath) await admin().storage.from(MEDIA_BUCKET).remove([oldAvatar]);
    return NextResponse.json({ user: await accountById(user.id) });
  } catch (e) {
    return failure(e);
  }
}
