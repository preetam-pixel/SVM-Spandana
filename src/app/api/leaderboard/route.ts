import { NextResponse } from "next/server";
import { achievementPoints, unlockedIds } from "@/lib/achievements";
import { currentUser, failure } from "@/lib/server/auth";
import { deptOf } from "@/lib/server/people";
import { type MemberStats, collectStats, isDemoProfile } from "@/lib/server/stats";
import type { LeaderRow } from "@/lib/types";

export const runtime = "nodejs";

/**
 * Two boards from public activity only (masked works never count here): all-time achievement points,
 * and the most active members over the last 30 days. Demo accounts and members who opted out are left off.
 */
export async function GET() {
  try {
    const me = await currentUser();
    if (!me) return NextResponse.json({ error: "Please log in" }, { status: 401 });
    const all = [...(await collectStats()).values()];
    const row = (m: MemberStats, score: number): LeaderRow => {
      const badges = unlockedIds(m.stats);
      return {
        id: m.profile.id, name: m.profile.name, avatar: m.profile.avatar ?? "", dept: deptOf(m.profile.dept), year: m.profile.year,
        score, badges: badges.length, core: m.profile.role === "core",
      };
    };
    const listed = all.filter((m) => !m.hidden && !isDemoProfile(m.profile));
    const top = listed.map((m) => row(m, achievementPoints(unlockedIds(m.stats)))).filter((r) => r.score > 0).sort((a, b) => b.score - a.score || b.badges - a.badges);
    const month = listed.map((m) => row(m, m.recent)).filter((r) => r.score > 0).sort((a, b) => b.score - a.score);
    const mine = all.find((m) => m.profile.id === me.id);
    return NextResponse.json({
      top: top.slice(0, 25),
      month: month.slice(0, 25),
      me: {
        points: mine ? achievementPoints(unlockedIds(mine.stats)) : 0,
        recent: mine?.recent ?? 0,
        rank: top.findIndex((r) => r.id === me.id) + 1 || null,
        monthRank: month.findIndex((r) => r.id === me.id) + 1 || null,
        hidden: !!mine?.hidden,
      },
    });
  } catch (e) {
    return failure(e);
  }
}
