import { NextResponse } from "next/server";
import { currentUser, failure } from "@/lib/server/auth";
import { isCore } from "@/lib/server/club";
import { cleanState, deptOf } from "@/lib/server/people";
import { DEMO_EMAILS, collectStats } from "@/lib/server/stats";
import type { CoreMember } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Every member with their participation, for the core Members page. No phone numbers or emails, and only
 * unmasked works count, so a member's anonymous posts stay anonymous even to core.
 */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    if (!isCore(me)) return NextResponse.json({ error: "Only SVM core members can see the member list" }, { status: 403 });

    const all = await collectStats();
    const members: CoreMember[] = [...all.values()]
      .filter(({ profile }) => !DEMO_EMAILS.includes(profile.email))
      .map(({ profile: p, stats: s }) => {
        const st = cleanState(p);
        return {
          id: p.id, name: p.name, avatar: p.avatar ?? "", dept: deptOf(p.dept), year: p.year, core: p.role === "core",
          sparkDone: st.sparkDone, declared: st.declared, level: st.level, joinedAt: new Date(p.created_at).getTime(),
          signups: s.signups, attended: s.attended, works: s.posts, interests: s.interests, trophies: s.trophies, recognitions: s.recognitions,
        };
      })
      .sort((a, b) => b.joinedAt - a.joinedAt);
    return NextResponse.json({ members });
  } catch (e) {
    return failure(e);
  }
}
