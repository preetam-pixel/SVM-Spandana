"use client";

import { Feather, RefreshCw } from "lucide-react";
import { useState } from "react";
import { AiTag, Button, Kn, Shimmer } from "@/components/ui";
import { askAI } from "@/lib/ai";

const PROMPTS = [
  { en: "The canteen at midnight smells like…", kn: "" },
  { en: "My first day on campus sounded like…", kn: "" },
  { en: "When it rains in Hubballi, I…", kn: "ಹುಬ್ಬಳ್ಳಿಯಲ್ಲಿ ಮಳೆ ಬಂದಾಗ…" },
  { en: "The night before an exam, my room…", kn: "" },
];

interface VerseResult { score: number; imagery: number; originality: number; feeling: number; feedback: string }

export function VerseChallenge({ onDone }: { onDone: (score: number) => void }) {
  const [pi, setPi] = useState(0);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [res, setRes] = useState<VerseResult | null>(null);
  const [source, setSource] = useState<string>();

  const submit = async () => {
    setLoading(true);
    try {
      const r = await askAI<VerseResult>("verse", { prompt: PROMPTS[pi].en, text });
      setRes(r.data);
      setSource(r.source);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="text-center">
        <h2 className="font-display text-2xl font-semibold">Finish the line</h2>
        <p className="mt-1 text-sm text-mute">One or two lines. Kannada, English or both. There's no wrong answer.</p>
      </div>
      <div className="card mt-6 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="font-display text-lg font-semibold">
            <Feather size={16} className="mr-1.5 inline text-iris" />
            {PROMPTS[pi].en}
            {PROMPTS[pi].kn && <Kn className="mt-1 block text-sm font-normal text-mute">{PROMPTS[pi].kn}</Kn>}
          </div>
          {!res && <button className="text-mute hover:text-fg" title="Another prompt" onClick={() => setPi((pi + 1) % PROMPTS.length)}><RefreshCw size={16} /></button>}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!!res}
          rows={3}
          placeholder="…like burnt Maggi and unfinished dreams."
          className="mt-3 w-full resize-none rounded-xl border border-line bg-white p-3 text-base outline-none placeholder:text-fg/25 focus:border-iris/60"
        />
        {loading && <div className="mt-3"><Shimmer lines={2} /></div>}
        {res && (
          <div className="mt-4 space-y-2">
            {(["imagery", "originality", "feeling"] as const).map((k) => (
              <div key={k} className="flex items-center gap-3 text-sm">
                <span className="w-24 capitalize text-mute">{k}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg" style={{ width: `${res[k]}%` }} /></div>
                <span className="w-8 text-right font-semibold">{res[k]}</span>
              </div>
            ))}
            <p className="pt-2 text-sm leading-relaxed text-fg/85">“{res.feedback}”</p>
            <div className="flex items-center justify-between pt-1"><AiTag source={source} /><span className="font-display text-2xl font-bold">{res.score}<span className="text-sm text-mute">/100</span></span></div>
          </div>
        )}
      </div>
      <div className="mt-5 flex justify-center gap-3">
        {!res ? (
          <>
            <Button variant="ghost" onClick={() => onDone(38)}>Skip</Button>
            <Button disabled={text.trim().length < 6 || loading} onClick={submit}>Get AI feedback</Button>
          </>
        ) : (
          <Button onClick={() => onDone(res.score)}>Continue →</Button>
        )}
      </div>
    </div>
  );
}
