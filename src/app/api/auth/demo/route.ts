import { NextResponse } from "next/server";
import { failure } from "@/lib/server/auth";
import { DEMO_PASSWORD, accountById, ensureDemoUser } from "@/lib/server/db";
import { supabaseAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Signs in to a shared demo account (student, or SVM core member) so judges can explore without a phone number. */
export async function POST(req: Request) {
  try {
    const { as } = (await req.json().catch(() => ({}))) as { as?: string };
    const email = await ensureDemoUser(as === "core" ? "core" : "student");
    const sb = await supabaseAuth();
    const { data, error } = await sb.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Demo sign-in failed" }, { status: 400 });
    return NextResponse.json({ user: await accountById(data.user.id) });
  } catch (e) {
    return failure(e);
  }
}
