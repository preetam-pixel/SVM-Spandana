import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db, userById } from "./db";
import type { Account } from "@/lib/types";

const COOKIE = "svm_session";
const SESSION_DAYS = 30;
const OTP_TTL_MS = 5 * 60_000;
const MAX_SENDS = 5; // per 15 minutes
const MAX_ATTEMPTS = 5;
// Shared through globalThis: each route is bundled separately, so a module-level random value would differ per route.
const g = globalThis as unknown as { __svmOtpSecret?: string };
const SECRET = process.env.OTP_SECRET || (g.__svmOtpSecret ??= crypto.randomBytes(16).toString("hex"));

/** Accepts 10-digit Indian mobiles (with or without +91 / 0) and returns E.164, or null. */
export function normalizePhone(input: string): string | null {
  const digits = String(input ?? "").replace(/\D/g, "");
  const local = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits.length === 11 && digits.startsWith("0") ? digits.slice(1) : digits;
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

const twilio = () => {
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_VERIFY_SERVICE_SID: service } = process.env;
  return sid && token && service ? { sid, token, service } : null;
};

export const otpProvider = () => (twilio() ? "sms" : "demo");

const hash = (phone: string, code: string) => crypto.createHmac("sha256", SECRET).update(`${phone}:${code}`).digest("hex");

export class OtpError extends Error {}

/** Sends an OTP. In demo mode (no SMS provider configured) the code is returned so the UI can show it. */
export async function sendOtp(phone: string): Promise<{ demoCode?: string }> {
  const now = Date.now();
  const row = db().prepare("SELECT sent_count, window_start FROM otps WHERE phone = ?").get(phone) as { sent_count: number; window_start: number } | undefined;
  const inWindow = row && now - row.window_start < 15 * 60_000;
  if (inWindow && row.sent_count >= MAX_SENDS) throw new OtpError("Too many OTP requests. Try again in a few minutes.");

  const t = twilio();
  let code: string | null = null;
  if (t) {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${t.service}/Verifications`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${t.sid}:${t.token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, Channel: "sms" }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[otp] Twilio send failed", res.status, (await res.text()).slice(0, 200));
      throw new OtpError("Couldn't send the SMS right now. Please try again.");
    }
  } else {
    code = String(crypto.randomInt(100000, 1000000));
    console.log(`[otp] Demo OTP for ${phone}: ${code}`);
  }

  db().prepare(
    `INSERT INTO otps (phone, code_hash, expires_at, attempts, sent_count, window_start) VALUES (?, ?, ?, 0, 1, ?)
     ON CONFLICT(phone) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts = 0,
       sent_count = CASE WHEN ? THEN otps.sent_count + 1 ELSE 1 END,
       window_start = CASE WHEN ? THEN otps.window_start ELSE excluded.window_start END`,
  ).run(phone, code ? hash(phone, code) : null, now + OTP_TTL_MS, now, inWindow ? 1 : 0, inWindow ? 1 : 0);

  return code ? { demoCode: code } : {};
}

export async function checkOtp(phone: string, code: string): Promise<boolean> {
  const row = db().prepare("SELECT code_hash, expires_at, attempts FROM otps WHERE phone = ?").get(phone) as
    | { code_hash: string | null; expires_at: number; attempts: number }
    | undefined;
  if (!row || Date.now() > row.expires_at) throw new OtpError("OTP expired. Please request a new one.");
  if (row.attempts >= MAX_ATTEMPTS) throw new OtpError("Too many wrong attempts. Please request a new OTP.");
  db().prepare("UPDATE otps SET attempts = attempts + 1 WHERE phone = ?").run(phone);

  const t = twilio();
  let ok = false;
  if (t) {
    const res = await fetch(`https://verify.twilio.com/v2/Services/${t.service}/VerificationCheck`, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(`${t.sid}:${t.token}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: phone, Code: code }),
      signal: AbortSignal.timeout(15_000),
    });
    ok = res.ok && (await res.json()).status === "approved";
  } else {
    const expected = Buffer.from(row.code_hash ?? "", "hex");
    const given = Buffer.from(hash(phone, code), "hex");
    ok = expected.length === given.length && crypto.timingSafeEqual(expected, given);
  }
  if (ok) db().prepare("DELETE FROM otps WHERE phone = ?").run(phone);
  return ok;
}

export async function startSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  db().prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production", expires: new Date(expires) });
}

export async function endSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) db().prepare("DELETE FROM sessions WHERE token = ?").run(token);
  jar.delete(COOKIE);
}

export async function currentUser(): Promise<Account | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const s = db().prepare("SELECT user_id, expires_at FROM sessions WHERE token = ?").get(token) as { user_id: string; expires_at: number } | undefined;
  if (!s || s.expires_at < Date.now()) return null;
  return userById(s.user_id);
}

export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(8).toString("hex")}`;
