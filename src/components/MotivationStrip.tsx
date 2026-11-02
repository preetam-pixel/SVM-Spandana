"use client";

import { ArrowRight, Flag, Target } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { daysUntil, fmtDate, isGoodFit, unitFor } from "@/lib/opportunities";
import { useStore } from "@/lib/store";
import type { Milestone, Opportunity } from "@/lib/types";

/** Pulse cards that nudge toward participating: the best open opportunity, and the club goal closest to levelling up. */
export function MotivationStrip() {
  const { profile } = useStore();
  const [opps, setOpps] = useState<Opportunity[] | null>(null);
  const [goals, setGoals] = useState<Milestone[] | null>(null);

  useEffect(() => {
    fetch("/api/opportunities").then((r) => r.json()).then((d) => setOpps(d.opportunities ?? [])).catch(() => setOpps([]));
    fetch("/api/club").then((r) => r.json()).then((d) => setGoals(d.milestones ?? [])).catch(() => setGoals([]));
  }, []);

  const open = (opps ?? []).filter((o) => (daysUntil(o.deadline ?? o.endsOn ?? o.startsOn) ?? 0) >= 0);
  const scored = open.map((o) => ({ o, fits: o.categories.filter((c) => isGoodFit(profile, c.discipline)) }));
  const pick = scored.sort((a, b) => b.fits.length - a.fits.length)[0];

  const goal = (goals ?? [])
    .map((m) => {
      const next = m.tiers.find((t) => m.value < t);
      const prev = [...m.tiers].reverse().find((t) => m.value >= t) ?? 0;
      return next ? { m, next, pct: (m.value - prev) / (next - prev), level: m.tiers.indexOf(next) + 1 } : null;
    })
    .filter((g): g is NonNullable<typeof g> => !!g)
    .sort((a, b) => b.pct - a.pct)[0];

  if (!pick && !goal) return null;
  const d = pick ? daysUntil(pick.o.deadline) : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {pick && (
        <Link href="/opportunities" className="group card relative overflow-hidden p-4 transition hover:border-iris/40">
          <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-sand/60 blur-2xl" />
          <div className="relative flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gold"><Flag size={13} /> Represent SVM</div>
          <div className="relative mt-1 font-display text-lg font-semibold leading-snug">{pick.o.title}</div>
          <div className="relative mt-1 text-sm text-mute">
            {pick.o.mine.length > 0
              ? `You've raised your hand for ${pick.o.mine.length} event${pick.o.mine.length === 1 ? "" : "s"}. Start practising with Guru!`
              : pick.fits.length > 0
                ? `${pick.fits.length} event${pick.fits.length === 1 ? "" : "s"} fit your Creative DNA: ${pick.fits.slice(0, 2).map((c) => c.name).join(", ")}${pick.fits.length > 2 ? "…" : ""}`
                : `${pick.o.categories.length || "Open"} event${pick.o.categories.length === 1 ? "" : "s"} to try. Every team needs backstage hands too.`}
          </div>
          <div className="relative mt-2 flex items-center justify-between text-xs">
            <span className={d !== null && d <= 7 ? "font-semibold text-magenta" : "text-mute"}>
              {d !== null ? `Register by ${fmtDate(pick.o.deadline, false)} · ${d} day${d === 1 ? "" : "s"} left` : pick.o.startsOn ? `Starts ${fmtDate(pick.o.startsOn, false)}` : "Dates to be announced"}
              {pick.o.interested > 0 && ` · ${pick.o.interested} interested`}
            </span>
            <span className="flex items-center gap-1 font-semibold text-iris">{pick.o.mine.length ? "View" : "Raise your hand"} <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
          </div>
        </Link>
      )}
      {goal && (
        <Link href="/club" className="group card p-4 transition hover:border-iris/40">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-iris"><Target size={13} /> Club goal</div>
          <div className="mt-1 font-display text-lg font-semibold leading-snug">{goal.m.label}: level {goal.level}</div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg" style={{ width: `${Math.round(goal.pct * 100)}%` }} /></div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-mute">{goal.next - goal.m.value} more {unitFor(goal.next - goal.m.value, goal.m.unit)} to unlock it together</span>
            <span className="flex items-center gap-1 font-semibold text-iris">SVM Club <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></span>
          </div>
        </Link>
      )}
    </div>
  );
}
