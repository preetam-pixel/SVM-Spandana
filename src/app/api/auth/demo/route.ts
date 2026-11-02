import { NextResponse } from "next/server";
import { startSession } from "@/lib/server/auth";
import { DEMO_PHONE, userByPhone } from "@/lib/server/db";

export const runtime = "nodejs";

/** Signs in to the seeded demo student so judges can explore without an OTP. */
export async function POST() {
  const user = userByPhone(DEMO_PHONE)!;
  await startSession(user.id);
  return NextResponse.json({ user });
}
