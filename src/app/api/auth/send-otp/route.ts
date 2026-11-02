import { NextResponse } from "next/server";
import { failure, normalizePhone, otpMessage } from "@/lib/server/auth";
import { phoneRegistered } from "@/lib/server/db";
import { supabaseAuth } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { phone: raw, mode } = (await req.json()) as { phone: string; mode: "login" | "register" };
    const phone = normalizePhone(raw);
    if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
    const exists = await phoneRegistered(phone);
    if (mode === "login" && !exists) return NextResponse.json({ error: "No account with this number yet. Please register first." }, { status: 404 });
    if (mode === "register" && exists) return NextResponse.json({ error: "This number is already registered. Please log in." }, { status: 409 });

    // Supabase Auth sends the SMS (via the provider configured in the dashboard) and enforces expiry + rate limits.
    const sb = await supabaseAuth();
    const { error } = await sb.auth.signInWithOtp({ phone, options: { shouldCreateUser: mode === "register", channel: "sms" } });
    if (error) return NextResponse.json({ error: otpMessage(error.message, "send") }, { status: error.status ?? 400 });
    return NextResponse.json({ ok: true, phone });
  } catch (e) {
    return failure(e);
  }
}
