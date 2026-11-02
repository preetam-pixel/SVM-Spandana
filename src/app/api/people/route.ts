import { NextResponse } from "next/server";
import { DEPTS } from "@/lib/data";
import { currentUser, failure } from "@/lib/server/auth";
import type { ProfileRow } from "@/lib/server/db";
import { friendRows, statusWith, toCard } from "@/lib/server/people";
import { admin } from "@/lib/supabase/server";
import type { Dept } from "@/lib/types";

export const runtime = "nodejs";

/** Member directory: search by name, filter by branch. Excludes the viewer. */
export async function GET(req: Request) {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") ?? "").trim().slice(0, 40).replace(/[%,()]/g, "");
    const dept = url.searchParams.get("dept") ?? "";

    let query = admin().from("profiles").select("*").neq("id", me.id).order("created_at", { ascending: false }).limit(200);
    if (q) query = query.ilike("name", `%${q}%`);
    if (DEPTS.includes(dept as Dept)) query = query.eq("dept", dept);
    const { data, error } = await query;
    if (error) throw error;

    const rows = await friendRows(me.id, { optional: true });
    return NextResponse.json({ people: (data as ProfileRow[]).map((r) => toCard(r, statusWith(me.id, r.id, rows))) });
  } catch (e) {
    return failure(e);
  }
}
