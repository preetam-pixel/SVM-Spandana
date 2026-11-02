import { NextResponse } from "next/server";
import { failure } from "@/lib/server/auth";
import { DEMO_EMAIL, DEMO_PASSWORD, accountById, ensureDemoUser } from "@/lib/server/db";
import { supabaseAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Signs in to the shared demo student so judges can explore without a phone number. */
export async function POST() {
  try {
    await ensureDemoUser();
    const sb = await supabaseAuth();
    const { data, error } = await sb.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
    if (error || !data.user) return NextResponse.json({ error: error?.message ?? "Demo sign-in failed" }, { status: 400 });
    return NextResponse.json({ user: await accountById(data.user.id) });
  } catch (e) {
    return failure(e);
  }
}
