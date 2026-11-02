import { NextResponse } from "next/server";
import { DEPTS } from "@/lib/data";
import { OtpError, checkOtp, newId, normalizePhone, startSession } from "@/lib/server/auth";
import { db, userByPhone } from "@/lib/server/db";
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
    if (!(await checkOtp(phone, String(code)))) return NextResponse.json({ error: "Incorrect OTP. Please try again." }, { status: 401 });
  } catch (e) {
    if (e instanceof OtpError) return NextResponse.json({ error: e.message }, { status: 401 });
    throw e;
  }

  let user = userByPhone(phone);
  if (!user) {
    if (mode !== "register" || !details?.name?.trim()) return NextResponse.json({ error: "No account found. Please register." }, { status: 404 });
    const dept: Dept = DEPTS.includes(details.dept as Dept) ? (details.dept as Dept) : "CSE";
    const year = Math.min(4, Math.max(1, Number(details.year) || 1));
    const id = newId("u");
    db().prepare("INSERT INTO users (id, phone, name, usn, dept, year, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, phone, details.name.trim().slice(0, 60), (details.usn ?? "").trim().toUpperCase().slice(0, 12), dept, year, Date.now());
    user = userByPhone(phone)!;
  }
  await startSession(user.id);
  return NextResponse.json({ user });
}
