import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { categoriesOf, parseOpportunity, toOpportunity, type InterestRow, type OpportunityRow } from "@/lib/server/clubdata";
import { deptOf, friendRows, isUuid, otherSide } from "@/lib/server/people";
import { clubRows } from "@/lib/server/setup";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

async function load(id: string) {
  const [row] = await clubRows<OpportunityRow>(admin().from("opportunities").select("*").eq("id", id).limit(1));
  return row ?? null;
}

/** One opportunity. Core members also get who raised their hand, for picking and training the team. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isUuid(id)) return bad("Not found", 404);
    const row = await load(id);
    if (!row) return bad("Not found", 404);
    const sb = admin();
    const [interests, rows] = await Promise.all([
      clubRows<InterestRow>(sb.from("opportunity_interests").select("opportunity_id, user_id, category").eq("opportunity_id", id)),
      friendRows(me.id, { optional: true }),
    ]);
    const friends = new Set(rows.filter((r) => r.status === "accepted").map((r) => otherSide(me.id, r)));
    const opportunity = toOpportunity(row, interests, me.id, friends);
    if (!isCore(me)) return NextResponse.json({ core: false, opportunity });

    const ids = [...new Set(interests.map((i) => i.user_id))];
    // Phone numbers are never shared; core reaches people through their profile (friends see email).
    const { data: people, error } = ids.length ? await sb.from("profiles").select("id, name, avatar, dept, year").in("id", ids) : { data: [], error: null };
    if (error) throw error;
    const names = new Map(opportunity.categories.map((c) => [c.id, c.name]));
    return NextResponse.json({
      core: true,
      opportunity,
      people: (people ?? []).map((p) => ({
        id: p.id, name: p.name, avatar: p.avatar ?? "", dept: deptOf(p.dept), year: p.year,
        categories: interests.filter((i) => i.user_id === p.id).map((i) => names.get(i.category) ?? "General interest"),
      })),
    });
  } catch (e) {
    return failure(e);
  }
}

/** Any member: toggle "I'm interested" for a category (or the whole opportunity when it has none). */
export async function POST(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isUuid(id)) return bad("Not found", 404);
    const row = await load(id);
    if (!row) return bad("Not found", 404);
    const { category = "", on } = (await req.json()) as { category?: string; on?: boolean };
    const cats = categoriesOf(row.categories);
    if (category ? !cats.some((c) => c.id === category) : cats.length > 0) return bad("Pick an event to show interest in");
    const table = admin().from("opportunity_interests");
    if (on) await clubRows(table.upsert({ opportunity_id: id, user_id: me.id, category }, { onConflict: "opportunity_id,user_id,category" }).select("user_id"));
    else await clubRows(table.delete().eq("opportunity_id", id).eq("user_id", me.id).eq("category", category).select("user_id"));

    const [interests, rows] = await Promise.all([
      clubRows<InterestRow>(admin().from("opportunity_interests").select("opportunity_id, user_id, category").eq("opportunity_id", id)),
      friendRows(me.id, { optional: true }),
    ]);
    const friends = new Set(rows.filter((r) => r.status === "accepted").map((r) => otherSide(me.id, r)));
    return NextResponse.json({ opportunity: toOpportunity(row, interests, me.id, friends) });
  } catch (e) {
    return failure(e);
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isCore(me)) return bad("Only SVM core members can edit opportunities", 403);
    if (!isUuid(id)) return bad("Not found", 404);
    const parsed = parseOpportunity((await req.json()) as Record<string, unknown>);
    if ("error" in parsed) return bad(parsed.error);
    await clubRows(admin().from("opportunities").update(parsed.values).eq("id", id).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { id } = await params;
    const me = await currentUser();
    if (!me) return bad("Please log in", 401);
    if (!isCore(me)) return bad("Only SVM core members can delete opportunities", 403);
    if (!isUuid(id)) return bad("Not found", 404);
    await clubRows(admin().from("opportunities").delete().eq("id", id).select("id"));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
