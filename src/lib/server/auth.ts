import { NextResponse } from "next/server";
import { NotConfigured, supabaseAuth } from "@/lib/supabase/server";
import { accountById } from "./db";
import { FriendsNotSetUp } from "./people";
import type { Account } from "@/lib/types";

/** Accepts 10-digit Indian mobiles (with or without +91 / 0) and returns E.164, or null. */
export function normalizePhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

/** The signed-in student (Supabase session cookie → profile row), or null. */
export async function currentUser(): Promise<Account | null> {
  const sb = await supabaseAuth();
  const { data } = await sb.auth.getUser();
  return data.user ? accountById(data.user.id) : null;
}

/** Turns setup/unknown errors into a JSON response instead of a 500 page. */
export function failure(e: unknown) {
  if (e instanceof NotConfigured || e instanceof FriendsNotSetUp) return NextResponse.json({ error: e.message, setup: true }, { status: 503 });
  if (e instanceof SyntaxError) return NextResponse.json({ error: "Invalid request" }, { status: 400 }); // malformed JSON body
  console.error("[api]", e);
  const msg = e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "Something went wrong";
  return NextResponse.json({ error: msg }, { status: 500 });
}

/** Friendlier wording for Supabase Auth phone errors. Unknown errors pass through so the real cause is visible. */
export function otpMessage(raw: string, stage: "send" | "verify"): string {
  console.error(`[otp:${stage}]`, raw);
  const m = raw.toLowerCase();
  if (m.includes("unsupported phone provider") || m.includes("phone signups are disabled") || m.includes("phone provider is disabled"))
    return "Phone sign-in isn't enabled. In Supabase: Authentication → Sign In / Providers → Phone.";
  if (m.includes("21212") || m.includes("invalid from number"))
    return "SMS setup issue: in Supabase → Phone, set the SMS provider to “Twilio Verify” (not “Twilio”) and put the VA… SID in the Verify Service SID field.";
  if (m.includes("unverified") || m.includes("21608")) return "Twilio trial: verify this number in Twilio (Phone Numbers → Verified Caller IDs) before it can receive SMS.";
  if (m.includes("rate limit") || m.includes("security purposes") || m.includes("too many")) return "Please wait a minute before requesting another OTP.";
  if (m.includes("signups not allowed")) return "No account with this number yet. Please register first.";
  if (stage === "verify" && (m.includes("expired") || m.includes("invalid") || m.includes("token"))) return "That OTP is incorrect or expired. Please try again.";
  return stage === "send" ? `Couldn't send the OTP: ${raw}` : raw;
}
