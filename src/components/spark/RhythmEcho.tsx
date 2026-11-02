"use client";

import { motion } from "framer-motion";
import { Hand, Play } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { drum } from "@/lib/audio";

const PATTERNS = [
  [0, 500, 1000, 1250, 1500, 2000],
  [0, 300, 600, 1050, 1200, 1500, 2100],
];

function scoreTaps(pattern: number[], taps: number[]) {
  const pTotal = pattern[pattern.length - 1] - pattern[0];
  const uTotal = taps[taps.length - 1] - taps[0];
  let err = 0;
  for (let i = 0; i < pattern.length - 1; i++) {
    const p = (pattern[i + 1] - pattern[i]) / pTotal;
    const u = (taps[i + 1] - taps[i]) / uTotal;
    err += Math.abs(p - u);
  }
  const meanP = 1 / (pattern.length - 1);
  const rel = err / (pattern.length - 1) / meanP;
  const tempo = Math.abs(1 - uTotal / pTotal);
  return Math.round(Math.max(5, Math.min(100, 100 - rel * 120 - Math.min(15, tempo * 25))));
}

export function RhythmEcho({ onDone }: { onDone: (score: number) => void }) {
  const [round, setRound] = useState(0);
  const [phase, setPhase] = useState<"idle" | "listen" | "tap" | "result">("idle");
  const [lit, setLit] = useState(-1);
  const [taps, setTaps] = useState<number[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [flash, setFlash] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tapsRef = useRef<number[]>([]);
  const pattern = PATTERNS[round];

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const listen = () => {
    setPhase("listen");
    tapsRef.current = [];
    setTaps([]);
    pattern.forEach((t, i) => {
      drum(t / 1000 + 0.05, i === 0);
      timers.current.push(setTimeout(() => setLit(i), t + 50));
    });
    timers.current.push(setTimeout(() => { setLit(-1); setPhase("tap"); }, pattern[pattern.length - 1] + 700));
  };

  const tap = useCallback(() => {
    if (phase !== "tap") return;
    drum(0);
    setFlash((f) => f + 1);
    const next = [...tapsRef.current, performance.now()];
    tapsRef.current = next;
    setTaps(next);
    if (next.length === pattern.length) {
      const s = scoreTaps(pattern, next);
      setScores((sc) => [...sc, s]);
      setPhase("result");
    }
  }, [phase, pattern]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); tap(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tap]);

  const last = scores[scores.length - 1];
  const pTotal = pattern[pattern.length - 1];
  const uNorm = taps.length > 1 ? taps.map((t) => ((t - taps[0]) / (taps[taps.length - 1] - taps[0])) * 100) : [];

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="text-sm text-mute">Round {round + 1} of {PATTERNS.length}</div>
      <h2 className="mt-1 font-display text-2xl font-semibold">Listen, then tap it back</h2>
      <p className="mt-1 text-sm text-mute">Tap the pad or press <kbd className="rounded bg-fg/10 px-1.5">Space</kbd>. Feel matters more than speed.</p>

      <div className="my-7 flex justify-center gap-2.5">
        {pattern.map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: lit === i ? 1.5 : 1, opacity: lit === i || (phase === "tap" && i < taps.length) || phase === "result" ? 1 : 0.3 }}
            className="h-4 w-4 rounded-full"
            style={{ background: phase === "tap" && i < taps.length ? "#4f7b5f" : "#b5651d" }}
          />
        ))}
      </div>

      {phase === "idle" && <Button size="lg" onClick={listen}><Play size={18} /> Play the beat</Button>}
      {phase === "listen" && <div className="py-4 font-display text-lg text-saffron">Listen…</div>}
      {phase === "tap" && (
        <motion.button
          key={flash}
          initial={{ scale: 0.94 }}
          animate={{ scale: 1 }}
          onPointerDown={tap}
          className="relative mx-auto grid h-44 w-44 cursor-pointer select-none place-items-center rounded-full grad-bg text-fg shadow-2xl shadow-iris/25"
        >
          <span className="pulse-ring absolute inset-0 rounded-full text-magenta" />
          <span className="flex flex-col items-center gap-1 font-display text-lg font-semibold"><Hand size={28} /> TAP</span>
        </motion.button>
      )}
      {phase === "result" && (
        <div>
          <div className="card mx-auto mb-5 max-w-md p-4 text-left">
            <div className="mb-2 text-xs uppercase tracking-widest text-mute">Beat vs. your taps</div>
            <div className="relative mb-3 h-3 rounded-full bg-fg/5">
              {pattern.map((t, i) => <div key={i} className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-saffron" style={{ left: `${(t / pTotal) * 100}%` }} />)}
            </div>
            <div className="relative h-3 rounded-full bg-fg/5">
              {uNorm.map((t, i) => <div key={i} className="absolute top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-aqua" style={{ left: `${t}%` }} />)}
            </div>
            <div className="mt-3 text-center font-display text-3xl font-bold">{last}<span className="text-base text-mute"> / 100</span></div>
          </div>
          {round < PATTERNS.length - 1 ? (
            <Button onClick={() => { setRound(round + 1); setPhase("idle"); setTaps([]); }}>Next pattern →</Button>
          ) : (
            <Button onClick={() => onDone(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))}>Continue →</Button>
          )}
        </div>
      )}
    </div>
  );
}
