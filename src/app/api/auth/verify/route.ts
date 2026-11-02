import { NextResponse } from "next/server";
import { DEPTS } from "@/lib/data";
import { failure, normalizePhone, otpMessage } from "@/lib/server/auth";
import { accountById, profileRow } from "@/lib/server/db";
import { admin, supabaseAuth } from "@/lib/supabase/server";
import type { Dept } from "@/lib/types";

export const runtime = "nodejs";

interface Body {
  phone: string;
  code: string;
  mode: "login" | "register";
  details?: { name?: string; usn?: string; dept?: string; year?: number };
}

export async function POST(req: Request) {
  const { phone: raw, code, mode, details } = (await req.json()) as Body;
  const phone = normalizePhone(raw);
  if (!phone || !/^\d{6}$/.test(String(code))) return NextResponse.json({ error: "Enter the 6-digit OTP." }, { status: 400 });

  try {
    const sb = await supabaseAuth();
    // On success this writes the Supabase session cookies.
    const { data, error } = await sb.auth.verifyOtp({ phone, token: String(code), type: "sms" });
    if (error || !data.user) return NextResponse.json({ error: otpMessage(error?.message ?? "Verification failed", "verify") }, { status: 401 });

    if (!(await profileRow(data.user.id))) {
      if (mode !== "register" || !details?.name?.trim()) {
        await sb.auth.signOut();
        return NextResponse.json({ error: "No account found. Please register." }, { status: 404 });
      }
      const dept: Dept = DEPTS.includes(details.dept as Dept) ? (details.dept as Dept) : "CSE";
      const { error: insertError } = await admin().from("profiles").insert({
        id: data.user.id,
        phone,
        name: details.name.trim().slice(0, 60),
        usn: (details.usn ?? "").trim().toUpperCase().slice(0, 12),
        dept,
        year: Math.min(4, Math.max(1, Number(details.year) || 1)),
      });
      if (insertError) throw insertError;
    }
    return NextResponse.json({ user: await accountById(data.user.id) });
  } catch (e) {
    return failure(e);
  }
}
