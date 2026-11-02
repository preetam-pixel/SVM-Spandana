import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { milestones, parseTrophy, toTrophy, type TrophyRow } from "@/lib/server/clubdata";
import { ClubNotSetUp, clubRows, isMissing } from "@/lib/server/setup";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** SVM's trophy cabinet plus club-wide milestones. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const sb = admin();
    const goals = await milestones();
    const { data, error } = await sb.from("club_trophies").select("*").order("won_on", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(500);
    if (error) {
      if (isMissing(error)) return NextResponse.json({ core: isCore(me), trophies: [], milestones: goals, setup: new ClubNotSetUp().message });
      throw error;
    }
    const rows = data as TrophyRow[];
    const ids = [...new Set(rows.flatMap((r) => r.member_ids ?? []))];
    const { data: people, error: pErr } = ids.length ? await sb.from("profiles").select("id, name, avatar").in("id", ids) : { data: [], error: null };
    if (pErr) throw pErr;
    const byId = new Map((people ?? []).map((p) => [p.id as string, { name: p.name as string, avatar: (p.avatar as string) ?? "" }]));
    return NextResponse.json({ core: isCore(me), trophies: rows.map((r) => toTrophy(r, byId, me.id)), milestones: goals });
  } catch (e) {
    return failure(e);
  }
}

/** Core members add a trophy to the cabinet. */
export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can add trophies" }, { status: 403 });
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseTrophy(body);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const photo: Record<string, string> = {};
    if (typeof body.photoPath === "string" && body.photoPath) {
      if (!body.photoPath.startsWith(`${me.id}/`)) return NextResponse.json({ error: "Invalid photo" }, { status: 400 });
      photo.photo = admin().storage.from(MEDIA_BUCKET).getPublicUrl(body.photoPath).data.publicUrl;
      photo.photo_path = body.photoPath;
    }
    const [row] = await clubRows<{ id: string }>(admin().from("club_trophies").insert({ ...parsed.values, ...photo, created_by: me.id }).select("id"));
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return failure(e);
  }
}
