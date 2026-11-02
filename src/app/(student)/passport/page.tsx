"use client";

import { motion } from "framer-motion";
import { Award, BadgeCheck, Check, LogOut, Printer, ShieldCheck, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DnaRadar } from "@/components/DnaRadar";
import { Badge, Button, Card, DiscIcon, Kn, SectionHead, cx } from "@/components/ui";
import { DIM_MAP, DISCIPLINES, LADDER } from "@/lib/data";
import { archetype, points } from "@/lib/engine";
import { useStore } from "@/lib/store";
import { recognitionEmoji } from "@/lib/club";
import type { Contribution, Recognition } from "@/lib/types";

// Indicative mapping only; final activity-point credit is decided by the institute.
const ACTIVITY: Record<Contribution["kind"], number> = { spark: 0, attended: 2, gig: 3, squad: 5, showcase: 5, mentor: 8 };

interface Verified { events: { id: string; title: string; startsAt: number; role: string; stage: boolean }[]; recognitions: Recognition[] }

export default function PassportPage() {
  const { profile, logout } = useStore();
  const router = useRouter();
  const [verified, setVerified] = useState<Verified | null>(null);
  const [badges, setBadges] = useState<number | null>(null);
  useEffect(() => {
    fetch("/api/achievements")
      .then((r) => r.json())
      .then((d) => {
        if (d.verified) setVerified(d.verified);
        if (Array.isArray(d.progress)) setBadges(d.progress.filter((p: { unlocked: boolean }) => p.unlocked).length);
      })
      .catch(() => {});
  }, []);
  // Checked-in events arrive as contributions (see the student layout), so they're already counted here.
  const activity = profile.contributions.reduce((a, c) => a + ACTIVITY[c.kind], 0);
  const backstage = profile.contributions.filter((c) => c.kind === "gig").length;

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-sand/50 blur-3xl" />
        <SectionHead title="Confidence Ladder" kn="ಆತ್ಮವಿಶ್ವಾಸದ ಏಣಿ" sub="Every rung is a real way to belong. No one is forced on stage." />
        <div className="relative grid gap-3 sm:grid-cols-5">
          {LADDER.map((r) => {
            const done = profile.level > r.level;
            const now = profile.level === r.level;
            return (
              <div key={r.level} className={cx("rounded-2xl border p-4 transition", now ? "border-magenta/60 bg-magenta/10" : done ? "border-aqua/40 bg-aqua/5" : "border-line opacity-60")}>
                <div className="flex items-center justify-between">
                  <span className="font-display text-2xl font-bold text-fg/30">{r.level + 1}</span>
                  {done && <Check size={16} className="text-aqua" />}
                  {now && <Badge color="#8b3a3a">You</Badge>}
                </div>
                <div className="mt-1 font-display font-semibold">{r.name}</div>
                <Kn className="text-xs text-mute">{r.kn}</Kn>
                <div className="mt-1 text-xs text-mute">{r.desc}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <SectionHead title="Kala Passport" kn="ಕಲಾ ಪಾಸ್‌ಪೋರ್ಟ್" sub={`${profile.stamps.length} of ${DISCIPLINES.length} art forms explored`} />
          <div className="grid grid-cols-3 gap-3">
            {DISCIPLINES.map((d, i) => {
              const has = profile.stamps.includes(d.id);
              return (
                <motion.div key={d.id} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}
                  className={cx("relative grid aspect-square place-items-center rounded-2xl border-2 text-center", has ? "" : "border-dashed border-fg/10")}
                  style={has ? { borderColor: d.color, background: `radial-gradient(circle, ${d.color}30, transparent 70%)`, transform: `rotate(${(i % 3) * 4 - 4}deg)` } : {}}>
                  <div className={has ? "" : "opacity-30"}>
                    <DiscIcon id={d.id} size={26} className="mx-auto" />
                    <div className="mt-1.5 px-1 text-[11px] font-semibold leading-tight">{d.name}</div>
                    <Kn className="text-[10px] text-mute">{d.kn}</Kn>
                  </div>
                  {has && <span className="absolute right-1.5 top-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: d.color }}>Stamped</span>}
                </motion.div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-mute">Stamps reward curiosity. Collect all 9 to earn the <b className="text-gold">Navarasa</b> badge.</p>
        </Card>

        <Card id="portfolio">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-widest text-mute">Cultural Portfolio · verified by SVM</div>
              <div className="font-display text-2xl font-bold">{profile.name}</div>
              <div className="text-sm text-mute">{profile.dept} · Year {profile.year} · <span className="grad-text font-semibold">{archetype(profile.dna)}</span></div>
            </div>
            <ShieldCheck className="text-aqua" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-fg/[0.04] p-3"><div className="font-display text-2xl font-bold">{points(profile)}</div><div className="text-[11px] text-mute">Spandana pts</div></div>
            <div className="rounded-xl bg-fg/[0.04] p-3"><div className="font-display text-2xl font-bold">{activity}</div><div className="text-[11px] text-mute">activity pts*</div></div>
            <div className="rounded-xl bg-fg/[0.04] p-3"><div className="font-display text-2xl font-bold">{backstage}</div><div className="text-[11px] text-mute">backstage roles</div></div>
          </div>
          {verified && (verified.events.length > 0 || verified.recognitions.length > 0) && (
            <div className="mt-4 rounded-2xl border border-aqua/30 bg-aqua/5 p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-aqua"><BadgeCheck size={14} /> Verified by SVM</div>
              <div className="space-y-1.5">
                {verified.recognitions.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm"><span>{recognitionEmoji(r.title)}</span><span className="flex-1 truncate font-semibold">{r.title}{r.eventTitle ? <span className="font-normal text-mute"> · {r.eventTitle}</span> : null}</span></div>
                ))}
                {verified.events.map((e) => (
                  <div key={e.id} className="flex items-center gap-2 text-sm">
                    <Check size={14} className="shrink-0 text-aqua" />
                    <span className="flex-1 truncate">{e.title} <span className="text-mute">· {e.role}</span></span>
                    <span className="text-xs text-mute">{new Date(e.startsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <DnaRadar dna={profile.dna} height={200} />
          {profile.hiddenSpark && <div className="text-center text-xs text-mute">Hidden spark: <b style={{ color: DIM_MAP[profile.hiddenSpark].color }}>{DIM_MAP[profile.hiddenSpark].label}</b></div>}
          <div className="mt-4 space-y-2">
            {profile.contributions.map((c, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Award size={15} className="shrink-0 text-gold" />
                <span className="flex-1 truncate">{c.title}</span>
                <span className="text-xs text-mute">{c.date}</span>
                <span className="w-10 text-right text-xs font-semibold text-aqua">+{c.points}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[10px] text-mute">*Indicative mapping to AICTE/VTU activity points; final credit as per institute norms. Backstage work is credited on par with performance.</p>
          {badges !== null && (
            <Link href="/achievements" className="mt-4 flex items-center gap-2 rounded-xl bg-sand/20 px-3 py-2 text-sm hover:bg-sand/30 print:hidden">
              <Trophy size={15} className="text-gold" /> <b>{badges}</b> achievement badge{badges === 1 ? "" : "s"} unlocked <span className="ml-auto text-xs text-mute">View →</span>
            </Link>
          )}
          <div className="mt-4 flex gap-2 print:hidden">
            <Button size="sm" variant="soft" onClick={() => window.print()}><Printer size={14} /> Save as PDF</Button>
            <Button size="sm" variant="ghost" onClick={async () => { await logout(); router.push("/"); }}><LogOut size={14} /> Log out</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
