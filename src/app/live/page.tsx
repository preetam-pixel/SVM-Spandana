"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Radio, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Badge, Kn, cx } from "@/components/ui";

const ACTS = [
  { name: "Midnight Raga", what: "Unplugged vocals · ECE 2nd yr", first: true },
  { name: "Beat Basavas", what: "Percussion trio · CSE + MECH" },
  { name: "Ink Monsoon", what: "Kannada–English poetry · ISE 3rd yr", first: true },
];
const EMOJI = ["❤️", "🔥", "👏", "✨", "🎶"];

interface Float { id: number; e: string; x: number }

export default function LivePage() {
  const [act, setAct] = useState(0);
  const [energy, setEnergy] = useState(20);
  const [floats, setFloats] = useState<Float[]>([]);
  const [votes, setVotes] = useState([41, 33, 38]);
  const [voted, setVoted] = useState<number | null>(null);
  const [count, setCount] = useState(0);
  const idRef = useRef(0);

  const burst = (e: string, mine = false) => {
    const id = ++idRef.current;
    setFloats((f) => [...f.slice(-40), { id, e, x: 10 + Math.random() * 80 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 2600);
    setEnergy((v) => Math.min(100, v + (mine ? 6 : 2.5)));
    setCount((c) => c + 1);
  };

  useEffect(() => {
    const decay = setInterval(() => setEnergy((v) => Math.max(8, v - 1.5)), 200);
    const crowd = setInterval(() => { if (Math.random() < 0.7) burst(EMOJI[Math.floor(Math.random() * EMOJI.length)]); }, 380);
    return () => { clearInterval(decay); clearInterval(crowd); };
  }, []);

  const a = ACTS[act];
  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo small />
        <Badge color="#8b3a3a"><Radio size={12} className="animate-pulse" /> LIVE · Open Mic Friday</Badge>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 sm:px-6 lg:grid-cols-[1fr_360px]">
        <section className="card relative min-h-[460px] overflow-hidden p-8">
          <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(139,58,58,0.25),transparent)]" />
          <div className="relative text-xs uppercase tracking-[0.3em] text-mute">Projector view · now on stage</div>
          <AnimatePresence mode="wait">
            <motion.div key={act} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} className="relative mt-6">
              <div className="font-display text-5xl font-bold sm:text-7xl"><span className="grad-text">{a.name}</span></div>
              <div className="mt-2 text-lg text-mute">{a.what}</div>
              {a.first && <Badge color="#a87a26" className="mt-3">🌱 First time on stage. Make some noise!</Badge>}
            </motion.div>
          </AnimatePresence>

          <div className="relative mt-12">
            <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">Applause meter</span><span className="text-mute">{count} reactions</span></div>
            <div className="h-6 overflow-hidden rounded-full bg-fg/10">
              <motion.div animate={{ width: `${energy}%` }} transition={{ type: "spring", stiffness: 120, damping: 18 }} className="h-full rounded-full grad-bg" />
            </div>
            <div className="mt-2 text-sm text-mute">{energy > 80 ? "🔥 The crowd is on fire!" : energy > 50 ? "The room is warming up…" : "Scan the QR and cheer on your classmates"}</div>
          </div>

          <div className="pointer-events-none absolute inset-0">
            <AnimatePresence>
              {floats.map((f) => (
                <motion.div key={f.id} initial={{ y: 0, opacity: 1, scale: 0.6 }} animate={{ y: -360, opacity: 0, scale: 1.3 }} transition={{ duration: 2.5, ease: "easeOut" }} className="absolute bottom-6 text-3xl" style={{ left: `${f.x}%` }}>{f.e}</motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="relative mt-10 flex gap-2">
            {ACTS.map((x, i) => (
              <button key={x.name} onClick={() => { setAct(i); setEnergy(20); }} className={cx("rounded-full border px-3 py-1.5 text-xs", i === act ? "border-magenta/60 bg-magenta/15" : "border-line text-mute")}>{i + 1}. {x.name}</button>
            ))}
          </div>
        </section>

        <aside className="mx-auto w-full max-w-[360px]">
          <div className="rounded-[2.2rem] border-4 border-fg/10 bg-night p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-center gap-1.5 text-xs text-mute"><Smartphone size={13} /> Audience phone</div>
            <div className="rounded-2xl bg-fg/[0.04] p-4 text-center">
              <div className="text-xs text-mute">Cheering for</div>
              <div className="font-display text-xl font-semibold">{a.name}</div>
              <div className="mt-4 grid grid-cols-5 gap-2">
                {EMOJI.map((e) => <button key={e} onClick={() => burst(e, true)} className="grid aspect-square place-items-center rounded-2xl bg-fg/5 text-2xl transition active:scale-90">{e}</button>)}
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-fg/[0.04] p-4">
              <div className="text-sm font-semibold">Audience Choice</div>
              <div className="mt-3 space-y-2">
                {ACTS.map((x, i) => {
                  const total = votes.reduce((s, v) => s + v, 0);
                  const pct = Math.round((votes[i] / total) * 100);
                  return (
                    <button key={x.name} disabled={voted !== null} onClick={() => { setVoted(i); setVotes(votes.map((v, k) => (k === i ? v + 1 : v))); }} className="relative block w-full overflow-hidden rounded-xl border border-line p-2.5 text-left text-sm">
                      {voted !== null && <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} className="absolute inset-y-0 left-0 bg-magenta/20" />}
                      <span className="relative flex justify-between"><span>{x.name}{voted === i && " ✓"}</span>{voted !== null && <b>{pct}%</b>}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 text-center text-[11px] text-mute"><Kn>ಚಪ್ಪಾಳೆ ತಟ್ಟಿ!</Kn> Clap for the brave ones 👏</div>
          </div>
        </aside>
      </div>
    </main>
  );
}
