"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Dim } from "@/lib/types";

type Adds = Partial<Record<Dim, number>>;

const QUESTIONS: { q: string; options: { label: string; emoji: string; adds: Adds }[] }[] = [
  {
    q: "A song you love comes on. You…",
    options: [
      { label: "Tap the beat on anything", emoji: "🥁", adds: { rhythm: 6, movement: 6 } },
      { label: "Sing along, loudly", emoji: "🎤", adds: { melody: 6, stage: 10 } },
      { label: "Picture the music video", emoji: "🎬", adds: { visual: 14 } },
      { label: "Start moving, can't help it", emoji: "💃", adds: { movement: 22 } },
    ],
  },
  {
    q: "At the college fest, you'd most enjoy…",
    options: [
      { label: "Hosting the crowd", emoji: "🎙️", adds: { stage: 22, verbal: 6 } },
      { label: "Capturing the moments", emoji: "📸", adds: { visual: 14 } },
      { label: "Writing the show script", emoji: "✍️", adds: { verbal: 14 } },
      { label: "Dancing in the flash mob", emoji: "🕺", adds: { movement: 20, stage: 6 } },
    ],
  },
  {
    q: "Someone suddenly hands you a mic. You…",
    options: [
      { label: "Make everyone laugh", emoji: "😄", adds: { stage: 26 } },
      { label: "Sing one line", emoji: "🎶", adds: { melody: 4, stage: 14 } },
      { label: "Say something thoughtful", emoji: "💭", adds: { verbal: 10, stage: 10 } },
      { label: "Pass it on with a smile", emoji: "🙂", adds: { stage: 2 } },
    ],
  },
  {
    q: "Your phone gallery is mostly…",
    options: [
      { label: "Sunsets & aesthetic shots", emoji: "🌅", adds: { visual: 14 } },
      { label: "Voice notes & song covers", emoji: "🎧", adds: { melody: 6 } },
      { label: "Screenshots of quotes", emoji: "📝", adds: { verbal: 14 } },
      { label: "Dance & workout reels", emoji: "🔥", adds: { movement: 18 } },
    ],
  },
];

export function VibeCheck({ onDone }: { onDone: (adds: Adds) => void }) {
  const [i, setI] = useState(0);
  const [acc, setAcc] = useState<Adds>({});

  const choose = (adds: Adds) => {
    const next = { ...acc };
    for (const [k, v] of Object.entries(adds) as [Dim, number][]) next[k] = (next[k] ?? 0) + v;
    if (i === QUESTIONS.length - 1) onDone(next);
    else { setAcc(next); setI(i + 1); }
  };

  const q = QUESTIONS[i];
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="text-sm text-mute">Vibe check {i + 1}/{QUESTIONS.length}</div>
      <motion.h2 key={q.q} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-1 font-display text-2xl font-semibold">{q.q}</motion.h2>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {q.options.map((o, k) => (
          <motion.button
            key={o.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: k * 0.05 }}
            onClick={() => choose(o.adds)}
            className="card cursor-pointer p-4 text-left transition hover:border-magenta/50 hover:bg-fg/[0.06] active:scale-[0.98]"
          >
            <div className="text-3xl">{o.emoji}</div>
            <div className="mt-2 text-sm font-semibold">{o.label}</div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
