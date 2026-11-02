"use client";

import { motion } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DnaRadar } from "@/components/DnaRadar";
import { Logo } from "@/components/Logo";
import { FrameIt } from "@/components/spark/FrameIt";
import { PitchMatch } from "@/components/spark/PitchMatch";
import { RhythmEcho } from "@/components/spark/RhythmEcho";
import { VerseChallenge } from "@/components/spark/VerseChallenge";
import { VibeCheck } from "@/components/spark/VibeCheck";
import { Badge, Button, DiscIcon, Kn, cx } from "@/components/ui";
import { DIM_MAP, DISCIPLINES, DISC_MAP, STUDENTS, percentile } from "@/lib/data";
import { archetype, findHiddenSpark, recommend } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Dim, DisciplineId, DNA, Profile } from "@/lib/types";

const STEPS = ["You", "Rhythm", "Melody", "Visual", "Words", "Vibe", "DNA"];
const clamp = (n: number) => Math.round(Math.max(5, Math.min(98, n)));

const CAMPUS_AVG = (() => {
  const keys: Dim[] = ["rhythm", "melody", "visual", "verbal", "movement", "stage"];
  return Object.fromEntries(keys.map((k) => [k, Math.round(STUDENTS.reduce((a, s) => a + s.dna[k], 0) / STUDENTS.length)])) as DNA;
})();

export default function SparkPage() {
  const { ready, account, profile, update } = useStore();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [declared, setDeclared] = useState<DisciplineId[]>(profile.declared);
  const name = account?.name ?? "";

  useEffect(() => {
    if (ready && !account) router.replace("/login");
  }, [ready, account, router]);
  const [raw, setRaw] = useState<{ rhythm?: number; melody?: number; visual?: number; verbal?: number; adds?: Partial<Record<Dim, number>> }>({});

  const next = () => setStep((s) => s + 1);

  const dna = useMemo<DNA | null>(() => {
    if (!raw.adds) return null;
    const a = raw.adds;
    return {
      rhythm: clamp((raw.rhythm ?? 40) + (a.rhythm ?? 0) * 0.3),
      melody: clamp((raw.melody ?? 40) + (a.melody ?? 0) * 0.3),
      visual: clamp((raw.visual ?? 40) * 0.8 + (30 + (a.visual ?? 0)) * 0.2),
      verbal: clamp((raw.verbal ?? 40) * 0.8 + (30 + (a.verbal ?? 0)) * 0.2),
      movement: clamp(28 + (a.movement ?? 0) * 1.1),
      stage: clamp(25 + (a.stage ?? 0) * 1.1),
    };
  }, [raw]);

  const finish = (adds: Partial<Record<Dim, number>>) => {
    setRaw((r) => ({ ...r, adds }));
    next();
  };

  return (
    <main className="rangoli-dots flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo small />
        <Link href="/" className="rounded-full p-2 text-mute hover:bg-fg/5 hover:text-fg"><X size={20} /></Link>
      </header>
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1">
              <div className={cx("h-1.5 rounded-full transition-all", i <= step ? "grad-bg" : "bg-fg/10")} />
              <div className={cx("mt-1.5 hidden text-center text-[11px] sm:block", i === step ? "text-fg" : "text-mute")}>{s}</div>
            </div>
          ))}
        </div>
      </div>

      <section className="mx-auto flex w-full max-w-4xl flex-1 items-start px-4 py-8 sm:px-6 sm:py-12">
        <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="w-full">
            {step === 0 && (
              <div className="mx-auto max-w-lg">
                <Badge color="#a87a26"><Sparkles size={12} /> Creative Spark · 3 minutes</Badge>
                <h1 className="mt-4 font-display text-3xl font-bold">Let's find your spark{name ? `, ${name.split(" ")[0]}` : ""}.</h1>
                <p className="mt-2 text-mute">5 tiny games. No auditions, no wrong answers. Nobody sees your scores but you.</p>
                <div className="mt-6 space-y-4">
                  <div>
                    <div className="mb-2 text-sm font-medium">Anything you already do? <span className="text-mute">(optional, pick none if unsure)</span></div>
                    <div className="flex flex-wrap gap-2">
                      {DISCIPLINES.map((d) => {
                        const on = declared.includes(d.id);
                        return (
                          <button key={d.id} onClick={() => setDeclared(on ? declared.filter((x) => x !== d.id) : [...declared, d.id])}
                            className={cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition", on ? "border-magenta/60 bg-magenta/15" : "border-line hover:bg-fg/5")}>
                            <DiscIcon id={d.id} size={14} /> {d.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <Button size="lg" className="mt-7 w-full" disabled={!account} onClick={next}>Begin <ArrowRight size={18} /></Button>
              </div>
            )}
            {step === 1 && <RhythmEcho onDone={(s) => { setRaw((r) => ({ ...r, rhythm: s })); next(); }} />}
            {step === 2 && <PitchMatch onDone={(s) => { setRaw((r) => ({ ...r, melody: s })); next(); }} />}
            {step === 3 && <FrameIt onDone={(s) => { setRaw((r) => ({ ...r, visual: s })); next(); }} />}
            {step === 4 && <VerseChallenge onDone={(s) => { setRaw((r) => ({ ...r, verbal: s })); next(); }} />}
            {step === 5 && <VibeCheck onDone={finish} />}
            {step === 6 && dna && (
              <SparkResult
                dna={dna}
                declared={declared}
                name={name}
                onEnter={(spark) => {
                  update((p): Profile => ({
                    ...p, dna, declared, hiddenSpark: spark, sparkDone: true,
                    contributions: [{ title: "Took the Creative Spark", kind: "spark", date: "Today", points: 10 }, ...p.contributions.filter((c) => c.kind !== "spark")],
                  }));
                  router.push("/home");
                }}
              />
            )}
        </motion.div>
      </section>
    </main>
  );
}

function SparkResult({ dna, declared, name, onEnter }: { dna: DNA; declared: DisciplineId[]; name: string; onEnter: (spark: Dim) => void }) {
  const spark = findHiddenSpark(dna, declared);
  const top = Math.max(1, 100 - percentile(spark, dna[spark]));
  const arch = archetype(dna);
  const sparkDisc = DISCIPLINES.filter((d) => (d.dims[spark] ?? 0) >= 0.8).map((d) => d.name);
  const recs = recommend({ ...EMPTY_LIKE, dna, hiddenSpark: spark }).slice(0, 3);
  const meta = DIM_MAP[spark];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card relative overflow-hidden p-6">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sand/50 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-mute">{name.split(" ")[0]}'s Creative DNA</div>
          <h1 className="mt-1 font-display text-3xl font-bold"><span className="grad-text">{arch}</span></h1>
          <DnaRadar dna={dna} compare={CAMPUS_AVG} height={300} />
          <div className="flex items-center justify-center gap-4 text-xs text-mute">
            <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded grad-bg" /> You</span>
            <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-mute" /> Campus average</span>
          </div>
        </div>
      </motion.div>

      <div className="space-y-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="rounded-3xl border p-5" style={{ borderColor: `${meta.color}55`, background: `linear-gradient(135deg, ${meta.color}22, transparent)` }}>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: meta.color }}>✦ Hidden spark discovered</div>
          <div className="mt-1 font-display text-2xl font-bold">{meta.label} <Kn className="text-lg font-normal text-mute">{meta.kn}</Kn></div>
          <p className="mt-1.5 text-sm text-fg/85">
            You scored <b>{dna[spark]}</b>, higher than <b>{100 - top}%</b> of students on campus.
            {declared.length > 0 ? " And you didn't list it as something you do." : ""} Try it through {sparkDisc.slice(0, 2).join(" or ")}.
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="card p-5">
          <div className="mb-3 text-sm font-semibold">Your first 3 steps, picked for you</div>
          <div className="space-y-2.5">
            {recs.map((r) => (
              <div key={r.event.id} className="flex items-center gap-3 rounded-xl bg-fg/[0.03] p-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-fg/5"><DiscIcon id={r.event.discipline} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.event.title}</div>
                  <div className="truncate text-xs text-mute">{r.reasons[0]}</div>
                </div>
                <Badge color={DISC_MAP[r.event.discipline].color}>{r.match}%</Badge>
              </div>
            ))}
          </div>
        </motion.div>

        <Button size="lg" className="w-full" onClick={() => onEnter(spark)}>Enter Spandana <ArrowRight size={18} /></Button>
      </div>
    </div>
  );
}

const EMPTY_LIKE: Profile = {
  name: "", dept: "CSE", year: 1, dna: CAMPUS_AVG, sparkDone: true, declared: [], hiddenSpark: null,
  freeSlots: ["Mon 13:00", "Wed 16:00", "Thu 16:00", "Fri 17:00", "Sat 07:00"], examMode: false, level: 0, stamps: [],
  joined: [], quests: [], contributions: [], myPosts: [], streakWeeks: 0,
};
