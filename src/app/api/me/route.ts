import { NextResponse } from "next/server";
import { DEPTS } from "@/lib/data";
import { currentUser } from "@/lib/server/auth";
import { db, userById } from "@/lib/server/db";
import type { Dept, Profile } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ user: await currentUser() });
}

const TEXT_FIELDS = { name: 60, usn: 12, email: 80, bio: 280, instagram: 40, youtube: 80 } as const;

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const body = (await req.json()) as Record<string, unknown> & { profile?: Profile };

  const sets: string[] = [];
  const vals: (string | number)[] = [];
  for (const [k, max] of Object.entries(TEXT_FIELDS)) {
    if (typeof body[k] === "string") {
      let v = (body[k] as string).trim().slice(0, max);
      if (k === "name" && !v) return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
      if (k === "usn") v = v.toUpperCase();
      if (k === "email" && v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
      if (k === "instagram") v = v.replace(/^@/, "");
      sets.push(`${k} = ?`);
      vals.push(v);
    }
  }
  if (typeof body.dept === "string" && DEPTS.includes(body.dept as Dept)) {
    sets.push("dept = ?");
    vals.push(body.dept);
  }
  if (body.year !== undefined) {
    sets.push("year = ?");
    vals.push(Math.min(4, Math.max(1, Number(body.year) || 1)));
  }
  if (body.profile && typeof body.profile === "object") {
    // Name / dept / year live in their own columns.
    const { name: _n, dept: _d, year: _y, ...state } = body.profile;
    sets.push("profile = ?");
    vals.push(JSON.stringify(state));
  }
  if (sets.length) db().prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`).run(...vals, user.id);
  return NextResponse.json({ user: userById(user.id) });
}
