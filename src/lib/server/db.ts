import { DEMO_PROFILE } from "@/lib/data";
import { admin } from "@/lib/supabase/server";
import type { Account, Dept, Profile } from "@/lib/types";
import { EventsNotSetUp, isMissing } from "./setup";

export const DEMO_EMAIL = "demo@svm-spandana.app";
export const DEMO_CORE_EMAIL = "demo-core@svm-spandana.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "svm-spandana-demo-2026";

export type DemoKind = "student" | "core";

export interface ProfileRow {
  id: string; phone: string | null; name: string; usn: string; email: string; dept: string; year: number;
  bio: string; instagram: string; youtube: string; avatar: string; avatar_path: string | null;
  state: Partial<Profile> | null; created_at: string;
  role?: string; // "member" | "core"; absent until migrations/003 is run
}

// Fresh accounts start with no DNA and nothing joined.
const EMPTY_STATE: Partial<Profile> = {
  dna: { rhythm: 0, melody: 0, visual: 0, verbal: 0, movement: 0, stage: 0 },
  sparkDone: false, declared: [], hiddenSpark: null, level: 0, stamps: [], joined: [], quests: [], contributions: [], myPosts: [], streakWeeks: 0,
};

export function toAccount(r: ProfileRow): Account {
  const profile: Profile = { ...DEMO_PROFILE, ...EMPTY_STATE, ...(r.state ?? {}), name: r.name, dept: r.dept as Dept, year: r.year };
  return {
    id: r.id, phone: r.phone ?? "", name: r.name, usn: r.usn, email: r.email, dept: r.dept as Dept, year: r.year,
    bio: r.bio, instagram: r.instagram, youtube: r.youtube, avatar: r.avatar, createdAt: new Date(r.created_at).getTime(),
    role: r.role === "core" ? "core" : "member", profile,
  };
}

export async function profileRow(id: string): Promise<ProfileRow | null> {
  const { data, error } = await admin().from("profiles").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ProfileRow | null;
}

export async function accountById(id: string): Promise<Account | null> {
  const row = await profileRow(id);
  return row ? toAccount(row) : null;
}

export async function phoneRegistered(phone: string): Promise<boolean> {
  const { count, error } = await admin().from("profiles").select("id", { count: "exact", head: true }).eq("phone", phone);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/** Demo personas: a student, and an SVM core member for exploring the organiser tools. */
const DEMOS: Record<DemoKind, { email: string; name: string; dept: Profile["dept"]; year: number; bio: string; instagram: string; state: Partial<Profile> }> = {
  student: (() => {
    const { name, dept, year, ...state } = DEMO_PROFILE;
    return { email: DEMO_EMAIL, name, dept, year, bio: "Writes poems in the margins of lab records. Recently discovered she can keep a beat.", instagram: "ananya.writes", state };
  })(),
  core: {
    email: DEMO_CORE_EMAIL, name: "SVM Core (Demo)", dept: "ECE", year: 3, instagram: "",
    bio: "Demo organiser account. Post events, gather people and recognise members.",
    state: {
      ...DEMO_PROFILE, name: "SVM Core (Demo)", dept: "ECE", year: 3,
      dna: { rhythm: 64, melody: 58, visual: 55, verbal: 81, movement: 47, stage: 86 }, declared: ["anchoring", "theatre"], hiddenSpark: "visual",
      level: 4, stamps: ["anchoring", "theatre", "vocal"],
      contributions: [{ title: "Took the Creative Spark", kind: "spark", date: "Today", points: 10 }],
    },
  },
};

/** Creates a demo account (email + password login) on first use. */
export async function ensureDemoUser(kind: DemoKind = "student"): Promise<string> {
  const demo = DEMOS[kind];
  const sb = admin();
  const { data: existing } = await sb.from("profiles").select("id").eq("email", demo.email).maybeSingle();
  if (existing) {
    // Accounts made before migration 003 have no core role yet.
    if (kind === "core") {
      const { error } = await sb.from("profiles").update({ role: "core" }).eq("id", existing.id);
      if (error) throw isMissing(error) ? new EventsNotSetUp() : error;
    }
    return demo.email;
  }

  let userId: string | undefined;
  const created = await sb.auth.admin.createUser({ email: demo.email, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: demo.name } });
  if (created.data.user) userId = created.data.user.id;
  else {
    // Auth user exists but its profile row is missing: find it.
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = data.users.find((u) => u.email === demo.email)?.id;
  }
  if (!userId) throw new Error(`Couldn't create demo user: ${created.error?.message}`);

  const { name: _n, dept: _d, year: _y, ...state } = demo.state;
  const row: Record<string, unknown> = { id: userId, phone: null, name: demo.name, dept: demo.dept, year: demo.year, email: demo.email, usn: "", bio: demo.bio, instagram: demo.instagram, state };
  if (kind === "core") row.role = "core";
  const { error } = await sb.from("profiles").upsert(row);
  if (error) throw kind === "core" && isMissing(error) ? new EventsNotSetUp() : error;
  return demo.email;
}
