"use client";

import { DISC_MAP, LADDER, STUDENTS } from "./data";
import type { FriendStatus, PublicProfile } from "./types";

export type FriendAction = "request" | "accept" | "decline" | "cancel" | "remove";

export async function friendAction(userId: string, action: FriendAction): Promise<{ status?: FriendStatus; error?: string }> {
  const res = await fetch("/api/friends", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action }) });
  const d = await res.json().catch(() => ({}));
  return res.ok ? { status: d.status } : { error: d.error ?? "Something went wrong" };
}

/** The simulated campus students (ids like "s42") get a read-only profile built from demo data. */
export const isDemoId = (id: string) => /^s\d+$/.test(id);

export function demoProfile(id: string): PublicProfile | null {
  const s = STUDENTS.find((x) => x.id === id);
  if (!s) return null;
  const disc = DISC_MAP[s.primary];
  return {
    id, name: s.name, dept: s.dept, year: s.year, avatar: "", instagram: "", youtube: "",
    bio: `${LADDER[s.level].name} in ${disc.name}. ${s.events ? `${s.events} SVM activities so far.` : "Hasn't joined an activity yet."}`,
    dna: s.dna, sparkDone: true, hiddenSpark: null, level: s.level, stamps: s.level ? [s.primary] : [], declared: [s.primary],
    points: s.events * 15, contributions: s.events, createdAt: 0, demo: true,
  };
}
