import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { parseOpportunity, toOpportunity, type InterestRow, type OpportunityRow } from "@/lib/server/clubdata";
import { friendRows, otherSide } from "@/lib/server/people";
import { ClubNotSetUp, clubRows, isMissing } from "@/lib/server/setup";
import { admin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD

/** Open opportunities first (soonest deadline first), then past ones. */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const sb = admin();
    const { data, error } = await sb.from("opportunities").select("*").order("created_at", { ascending: false }).limit(300);
    if (error) {
      if (isMissing(error)) return NextResponse.json({ core: isCore(me), opportunities: [], setup: new ClubNotSetUp().message });
      throw error;
    }
    const [interests, rows] = await Promise.all([
      clubRows<InterestRow>(sb.from("opportunity_interests").select("opportunity_id, user_id, category").limit(50000)),
      friendRows(me.id, { optional: true }),
    ]);
    const friends = new Set(rows.filter((r) => r.status === "accepted").map((r) => otherSide(me.id, r)));
    const t = today();
    const isOpen = (o: OpportunityRow) => !(o.deadline ?? o.ends_on ?? o.starts_on) || (o.deadline ?? o.ends_on ?? o.starts_on)! >= t;
    const key = (o: OpportunityRow) => o.deadline ?? o.starts_on ?? "9999-12-31";
    const list = (data as OpportunityRow[]).sort((a, b) => Number(isOpen(b)) - Number(isOpen(a)) || key(a).localeCompare(key(b)));
    return NextResponse.json({ core: isCore(me), opportunities: list.map((o) => toOpportunity(o, interests, me.id, friends)) });
  } catch (e) {
    return failure(e);
  }
}

/** Core members post a new opportunity. */
export async function POST(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can post opportunities" }, { status: 403 });
    const parsed = parseOpportunity((await req.json()) as Record<string, unknown>);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const [row] = await clubRows<{ id: string }>(admin().from("opportunities").insert({ ...parsed.values, created_by: me.id }).select("id"));
    return NextResponse.json({ id: row.id });
  } catch (e) {
    return failure(e);
  }
}
