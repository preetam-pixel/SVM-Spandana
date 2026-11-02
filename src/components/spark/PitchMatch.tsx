"use client";

import { motion } from "framer-motion";
import { Ear, Mic, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { audio, centsOff, detectPitch, tone } from "@/lib/audio";

const TARGET = 220; // A3, comfortable to hum; any octave counts

export function PitchMatch({ onDone }: { onDone: (score: number) => void }) {
  const [phase, setPhase] = useState<"idle" | "listening" | "result" | "ear">("idle");
  const [live, setLive] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [score, setScore] = useState(0);
  const [err, setErr] = useState("");
  const stop = useRef<() => void>(() => {});

  useEffect(() => () => stop.current(), []);

  const hum = async () => {
    setErr("");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    } catch {
      setErr("No microphone? No problem. Try the ear test instead.");
      setPhase("ear");
      return;
    }
    const a = audio();
    const src = a.createMediaStreamSource(stream);
    const an = a.createAnalyser();
    an.fftSize = 2048;
    src.connect(an);
    const buf = new Float32Array(an.fftSize);
    const readings: number[] = [];
    const start = performance.now();
    setPhase("listening");
    const id = setInterval(() => {
      an.getFloatTimeDomainData(buf);
      const hz = detectPitch(buf, a.sampleRate);
      if (hz > 0) {
        const c = 1200 * Math.log2(hz / TARGET);
        const folded = ((((c + 600) % 1200) + 1200) % 1200) - 600;
        readings.push(centsOff(hz, TARGET));
        setLive(folded);
      }
      const t = (performance.now() - start) / 3500;
      setProgress(Math.min(1, t));
      if (t >= 1) finish();
    }, 60);
    const finish = () => {
      clearInterval(id);
      stream.getTracks().forEach((tr) => tr.stop());
      if (readings.length < 6) {
        setErr("We couldn't hear a steady hum. Try the ear test instead.");
        setPhase("ear");
        return;
      }
      const sorted = [...readings].sort((x, y) => x - y);
      const median = sorted[Math.floor(sorted.length / 2)];
      const s = Math.round(Math.max(12, Math.min(100, 100 - median * 0.9 + Math.min(8, readings.length / 8))));
      setScore(s);
      setPhase("result");
    };
    stop.current = () => { clearInterval(id); stream.getTracks().forEach((tr) => tr.stop()); };
  };

  const needle = live === null ? 0 : Math.max(-100, Math.min(100, live));

  if (phase === "ear") return <EarTest note={err} onDone={onDone} />;

  return (
    <div className="mx-auto max-w-lg text-center">
      <h2 className="font-display text-2xl font-semibold">Hum the note</h2>
      <p className="mt-1 text-sm text-mute">Play the note, then hum it for 3 seconds. Any octave counts. Nobody else hears it.</p>

      <div className="card mx-auto my-6 max-w-sm p-5">
        <div className="relative h-24">
          <div className="absolute inset-x-6 top-12 h-1 rounded-full bg-fg/10" />
          <div className="absolute left-1/2 top-8 h-9 w-16 -translate-x-1/2 rounded-lg border border-aqua/40 bg-aqua/10" />
          <motion.div animate={{ left: `calc(50% + ${needle * 1.2}px)` }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="absolute top-5 h-14 w-1.5 -translate-x-1/2 rounded-full bg-magenta shadow-lg shadow-magenta/50" />
          <div className="absolute inset-x-0 bottom-0 flex justify-between text-[11px] text-mute"><span>flat</span><span className="text-aqua">in tune</span><span>sharp</span></div>
        </div>
        {phase === "listening" && <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg" style={{ width: `${progress * 100}%` }} /></div>}
      </div>

      {phase === "idle" && (
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="soft" onClick={() => tone(TARGET, 1.6, 0, "sine", 0.35)}><Volume2 size={16} /> Play note</Button>
          <Button onClick={hum}><Mic size={16} /> Hum now</Button>
        </div>
      )}
      {phase === "listening" && <div className="font-display text-lg text-magenta">Listening… keep humming</div>}
      {phase === "result" && (
        <div>
          <div className="font-display text-4xl font-bold">{score}<span className="text-base text-mute"> / 100</span></div>
          <p className="mb-5 mt-1 text-sm text-mute">{score > 75 ? "That's a naturally accurate ear!" : score > 50 ? "Solid pitch sense — it grows fast with practice." : "Pitch is a skill, not a gift. Totally trainable."}</p>
          <Button onClick={() => onDone(score)}>Continue →</Button>
        </div>
      )}
      {phase === "idle" && <button className="mt-4 text-xs text-mute underline" onClick={() => setPhase("ear")}>I'd rather not use the mic</button>}
    </div>
  );
}

function EarTest({ note, onDone }: { note: string; onDone: (s: number) => void }) {
  const [q, setQ] = useState(0);
  const [correct, setCorrect] = useState(0);
  const pairs = [[262, 294], [392, 370], [330, 349]];
  const play = () => { tone(pairs[q][0], 0.6, 0, "sine", 0.3); tone(pairs[q][1], 0.6, 0.75, "sine", 0.3); };
  const answer = (higher: boolean) => {
    const ok = pairs[q][1] > pairs[q][0] === higher;
    const c = correct + (ok ? 1 : 0);
    if (q === pairs.length - 1) onDone(35 + c * 20);
    else { setCorrect(c); setQ(q + 1); }
  };
  return (
    <div className="mx-auto max-w-lg text-center">
      {note && <p className="mb-3 text-sm text-gold">{note}</p>}
      <h2 className="font-display text-2xl font-semibold">Ear test {q + 1}/3</h2>
      <p className="mt-1 text-sm text-mute">Is the second note higher or lower?</p>
      <div className="my-6"><Button variant="soft" onClick={play}><Ear size={16} /> Play two notes</Button></div>
      <div className="flex justify-center gap-3">
        <Button onClick={() => answer(false)}>Lower ↓</Button>
        <Button onClick={() => answer(true)}>Higher ↑</Button>
      </div>
    </div>
  );
}
