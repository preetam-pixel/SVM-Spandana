"use client";

import { motion } from "framer-motion";
import { CalendarClock, Check, Clock, MapPin, Snowflake, Sparkles, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { Badge, Button, Card, DiscIcon, Kn, SectionHead, cx } from "@/components/ui";
import { DAYS, DIM_MAP, DISCIPLINES, DISC_MAP, LADDER, TIMES } from "@/lib/data";
import { archetype, points, recommend, type Rec } from "@/lib/engine";
import { useStore } from "@/lib/store";

export default function HomePage() {
  const { profile, update, addContribution, toast } = useStore();
  // Stamps/joins are left out of the deps on purpose so cards don't jump around right after you join one.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recs = useMemo(() => recommend(profile), [profile.dna, profile.freeSlots, profile.examMode, profile.level, profile.hiddenSpark]);
  const feed = recs.filter((r) => r.event.type !== "gig").slice(0, 6);
  const gigs = recs.filter((r) => r.event.type === "gig").slice(0, 4);
  const rung = LADDER[profile.level];
  const nextRung = LADDER[Math.min(4, profile.level + 1)];
  const contribs = profile.contributions.filter((c) => c.kind !== "spark").length;
  const progress = profile.level >= 4 ? 100 : profile.level === 0 ? (contribs >= 1 ? 100 : 15) : profile.level === 1 ? Math.min(100, (contribs / 3) * 100) : profile.level === 2 ? 60 : 80;

  const join = (r: Rec) => {
    if (profile.joined.includes(r.event.id)) return;
    const isGig = r.event.type === "gig";
    const isNew = !profile.stamps.includes(r.event.discipline);
    update((p) => ({ ...p, joined: [...p.joined, r.event.id] }));
    addContribution({ title: isGig ? `${r.event.role}: ${r.event.title}` : r.event.title, kind: isGig ? "gig" : "attended", discipline: r.event.discipline, points: isGig ? 20 : 15 });
    toast(`${isGig ? "+20" : "+15"} pts${isNew ? ` · New stamp: ${DISC_MAP[r.event.discipline].name}` : ""}`);
  };

  const toggleSlot = (slot: string) =>
    update((p) => ({ ...p, freeSlots: p.freeSlots.includes(slot) ? p.freeSlots.filter((s) => s !== slot) : [...p.freeSlots, slot] }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card relative overflow-hidden p-6">
          <div className="absolute -right-10 -top-16 h-48 w-48 rounded-full bg-sand/50 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-sm text-mute"><Kn>ನಮಸ್ಕಾರ</Kn>, {profile.name.split(" ")[0]} 👋</div>
              <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl"><span className="grad-text">{archetype(profile.dna)}</span></h1>
              {profile.hiddenSpark && (
                <div className="mt-2 text-sm text-mute">Hidden spark: <b style={{ color: DIM_MAP[profile.hiddenSpark].color }}>{DIM_MAP[profile.hiddenSpark].label}</b> · {points(profile)} pts · {profile.stamps.length}/{DISCIPLINES.length} stamps</div>
              )}
            </div>
            <div className="min-w-[220px] flex-1 sm:max-w-xs">
              <div className="flex items-center justify-between text-xs"><span className="font-semibold">{rung.name} <Kn className="text-mute">{rung.kn}</Kn></span><span className="text-mute">→ {nextRung.name}</span></div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-fg/10"><motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} className="h-full grad-bg" /></div>
              <div className="mt-1.5 text-xs text-mute">Next: {rung.next}</div>
            </div>
          </div>
        </motion.div>

        {profile.examMode && (
          <div className="flex items-center gap-3 rounded-2xl border border-aqua/30 bg-aqua/10 p-4 text-sm">
            <Snowflake className="shrink-0 text-aqua" size={20} />
            <div><b className="text-aqua">Exam Mode is on.</b> Your streak is frozen, so you lose nothing. Showing only sessions under 45 minutes. All the best! 📚</div>
          </div>
        )}

        <section>
          <SectionHead title="Your Pulse" kn="ಸ್ಪಂದನ" sub="Ranked by your Creative DNA, free time and comfort level, with the reason for each" />
          <div className="grid gap-4 sm:grid-cols-2">
            {feed.map((r, i) => <RecCard key={r.event.id} r={r} i={i} joined={profile.joined.includes(r.event.id)} onJoin={() => join(r)} />)}
          </div>
        </section>

        <section>
          <SectionHead title="Micro-gigs" sub="20–60 minute backstage roles. Contribute without being on stage." />
          <div className="grid gap-3 sm:grid-cols-2">
            {gigs.map((r) => {
              const joined = profile.joined.includes(r.event.id);
              return (
                <div key={r.event.id} className="card flex items-center gap-3 p-4">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-fg/5"><DiscIcon id={r.event.discipline} size={20} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">{r.event.role} · {r.event.durationMin} min</div>
                    <div className="truncate text-sm font-semibold">{r.event.title}</div>
                    <div className="truncate text-xs text-mute">{r.reasons[0]}</div>
                  </div>
                  <Button size="sm" variant={joined ? "soft" : "primary"} onClick={() => join(r)} disabled={joined}>{joined ? <Check size={14} /> : "Take it"}</Button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-4">
        <Card>
          <div className="mb-1 flex items-center gap-2 font-display font-semibold"><CalendarClock size={18} className="text-aqua" /> My free slots</div>
          <p className="mb-3 text-xs text-mute">Tap to edit. Recommendations only fill gaps in your timetable.</p>
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1 text-[10px]">
            <div />
            {TIMES.map((t) => <div key={t} className="text-center text-mute">{t}</div>)}
            {DAYS.map((d) => (
              <Row key={d} day={d} slots={profile.freeSlots} onToggle={toggleSlot} />
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display font-semibold">Kala Passport</div>
            <Link href="/passport" className="text-xs text-mute hover:text-fg">View →</Link>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {DISCIPLINES.map((d) => {
              const has = profile.stamps.includes(d.id);
              return (
                <div key={d.id} title={d.name} className={cx("grid aspect-square place-items-center rounded-xl border", has ? "border-transparent" : "border-dashed border-fg/15 opacity-40")} style={has ? { background: `${d.color}26` } : {}}>
                  <DiscIcon id={d.id} size={18} />
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-mute">Try every art form once. Curiosity earns stamps, not just winning.</p>
        </Card>
        <Link href="/squads" className="card flex items-center gap-3 p-4 transition hover:bg-fg/[0.06]">
          <Users className="text-magenta" />
          <div className="flex-1"><div className="text-sm font-semibold">4 squads need your skills</div><div className="text-xs text-mute">AI matched you to open roles</div></div>
          <Sparkles size={16} className="text-gold" />
        </Link>
      </aside>
    </div>
  );
}

function Row({ day, slots, onToggle }: { day: string; slots: string[]; onToggle: (s: string) => void }) {
  return (
    <>
      <div className="pr-1 text-mute">{day}</div>
      {TIMES.map((t) => {
        const s = `${day} ${t}`;
        const on = slots.includes(s);
        return <button key={s} onClick={() => onToggle(s)} className={cx("h-6 rounded-md transition", on ? "bg-aqua/60" : "bg-fg/5 hover:bg-fg/10")} aria-label={s} />;
      })}
    </>
  );
}

function RecCard({ r, i, joined, onJoin }: { r: Rec; i: number; joined: boolean; onJoin: () => void }) {
  const d = DISC_MAP[r.event.discipline];
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl" style={{ background: `${d.color}22` }}><DiscIcon id={d.id} size={20} /></div>
        <div className="text-right">
          <div className="font-display text-2xl font-bold leading-none" style={{ color: d.color }}>{r.match}%</div>
          <div className="text-[10px] uppercase tracking-wider text-mute">match</div>
        </div>
      </div>
      <div className="mt-3 font-display text-lg font-semibold leading-snug">{r.event.title}</div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-mute">
        <span className="flex items-center gap-1"><Clock size={12} /> {r.event.slot} · {r.event.durationMin}m</span>
        <span className="flex items-center gap-1"><MapPin size={12} /> {r.event.venue}</span>
      </div>
      <p className="mt-2 text-sm text-fg/75">{r.event.desc}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {r.reasons.map((x) => <Badge key={x} color={x.startsWith("Uses your hidden") ? "#a87a26" : undefined}>{x}</Badge>)}
      </div>
      <div className="mt-auto flex items-center justify-between pt-4">
        <span className="text-xs text-mute">{r.event.going + (joined ? 1 : 0)} going · {r.event.level === "beginner" ? "🌱 Beginner" : r.event.level === "open" ? "Open to all" : "Experienced"}</span>
        <Button size="sm" variant={joined ? "soft" : "primary"} onClick={onJoin} disabled={joined}>{joined ? <><Check size={14} /> Going</> : "I'm in"}</Button>
      </div>
    </motion.div>
  );
}
