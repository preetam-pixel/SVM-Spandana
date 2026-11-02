import { DEMO_PROFILE } from "@/lib/data";
import { admin } from "@/lib/supabase/server";
import type { Account, Dept, Profile } from "@/lib/types";

export const DEMO_EMAIL = "demo@svm-spandana.app";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "svm-spandana-demo-2026";

export interface ProfileRow {
  id: string; phone: string | null; name: string; usn: string; email: string; dept: string; year: number;
  bio: string; instagram: string; youtube: string; avatar: string; avatar_path: string | null;
  state: Partial<Profile> | null; created_at: string;
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
    bio: r.bio, instagram: r.instagram, youtube: r.youtube, avatar: r.avatar, createdAt: new Date(r.created_at).getTime(), profile,
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

/** Creates the public demo student (email + password login) on first use. */
export async function ensureDemoUser(): Promise<void> {
  const sb = admin();
  const { data: existing } = await sb.from("profiles").select("id").eq("email", DEMO_EMAIL).maybeSingle();
  if (existing) return;

  let userId: string | undefined;
  const created = await sb.auth.admin.createUser({ email: DEMO_EMAIL, password: DEMO_PASSWORD, email_confirm: true, user_metadata: { name: DEMO_PROFILE.name } });
  if (created.data.user) userId = created.data.user.id;
  else {
    // Auth user exists but its profile row is missing: find it.
    const { data } = await sb.auth.admin.listUsers({ page: 1, perPage: 200 });
    userId = data.users.find((u) => u.email === DEMO_EMAIL)?.id;
  }
  if (!userId) throw new Error(`Couldn't create demo user: ${created.error?.message}`);

  const { name, dept, year, ...state } = DEMO_PROFILE;
  const { error } = await sb.from("profiles").upsert({
    id: userId, phone: null, name, dept, year, email: DEMO_EMAIL, usn: "",
    bio: "Writes poems in the margins of lab records. Recently discovered she can keep a beat.", instagram: "ananya.writes", state,
  });
  if (error) throw error;
}
