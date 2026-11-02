import { NextResponse } from "next/server";
import { OtpError, normalizePhone, otpProvider, sendOtp } from "@/lib/server/auth";
import { userByPhone } from "@/lib/server/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { phone: raw, mode } = (await req.json()) as { phone: string; mode: "login" | "register" };
  const phone = normalizePhone(raw);
  if (!phone) return NextResponse.json({ error: "Enter a valid 10-digit Indian mobile number." }, { status: 400 });
  const exists = !!userByPhone(phone);
  if (mode === "login" && !exists) return NextResponse.json({ error: "No account with this number yet. Please register first." }, { status: 404 });
  if (mode === "register" && exists) return NextResponse.json({ error: "This number is already registered. Please log in." }, { status: 409 });
  try {
    const { demoCode } = await sendOtp(phone);
    return NextResponse.json({ ok: true, phone, provider: otpProvider(), demoCode });
  } catch (e) {
    const msg = e instanceof OtpError ? e.message : "Something went wrong sending the OTP.";
    if (!(e instanceof OtpError)) console.error("[otp]", e);
    return NextResponse.json({ error: msg }, { status: 429 });
  }
}
