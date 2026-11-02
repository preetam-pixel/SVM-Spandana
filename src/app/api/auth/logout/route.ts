import { NextResponse } from "next/server";
import { failure } from "@/lib/server/auth";
import { supabaseAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST() {
  try {
    await (await supabaseAuth()).auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
