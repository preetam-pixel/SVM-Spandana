import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { parseTrophy } from "@/lib/server/clubdata";
import { isUuid } from "@/lib/server/people";
import { clubRows } from "@/lib/server/setup";
import { MEDIA_BUCKET, admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

async function guard(params: Ctx["params"]) {
  const { id } = await params;
  const me = await currentUser();
  if (!me) return { res: NextResponse.json({ error: "Please log in" }, { status: 401 }) };
  if (!isCore(me)) return { res: NextResponse.json({ error: "Only SVM core members can edit trophies" }, { status: 403 }) };
  if (!isUuid(id)) return { res: NextResponse.json({ error: "Trophy not found" }, { status: 404 }) };
  return { id };
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const g = await guard(params);
    if ("res" in g) return g.res;
    const parsed = parseTrophy((await req.json()) as Record<string, unknown>);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    await clubRows(admin().from("club_trophies").update(parsed.values).eq("id", g.id).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const g = await guard(params);
    if ("res" in g) return g.res;
    const [row] = await clubRows<{ photo_path: string | null }>(admin().from("club_trophies").delete().eq("id", g.id).select("photo_path"));
    if (row?.photo_path) await admin().storage.from(MEDIA_BUCKET).remove([row.photo_path]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
