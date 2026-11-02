"use client";

import { motion } from "framer-motion";
import { Map as MapIcon, Send, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AiTag, Avatar, Badge, Button, Card, DiscIcon, SectionHead, Shimmer, cx } from "@/components/ui";
import { askAI } from "@/lib/ai";
import { DISCIPLINES, DISC_MAP, LADDER, STUDENTS, discFit } from "@/lib/data";
import { archetype } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { DisciplineId } from "@/lib/types";

interface Msg { role: "me" | "guru"; text: string; source?: string }
interface Path { title: string; weeks: { week: number; focus: string; tasks: string[] }[]; mentorTip: string }

const QUICK = ["I've never performed. Where do I start?", "I get nervous on stage", "Exams are close and I have no time", "I don't know anyone in SVM"];

export default function GuruPage() {
  const { profile, toast } = useStore();
  const bestDisc = useMemo(() => [...DISCIPLINES].sort((a, b) => discFit(profile.dna, b.id) - discFit(profile.dna, a.id))[0].id, [profile.dna]);
  const [disc, setDisc] = useState<DisciplineId>(bestDisc);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "guru", text: `Namaskara ${profile.name.split(" ")[0]}! I'm Guru, your creative mentor. Your DNA says you're “${archetype(profile.dna)}”. Ask me anything: where to start, stage fear, time, teams.` }]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [path, setPath] = useState<(Path & { source: string }) | null>(null);
  const [pathLoading, setPathLoading] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [msgs, thinking]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const history = [...msgs, { role: "me" as const, text }];
    setMsgs(history);
    setInput("");
    setThinking(true);
    try {
      const r = await askAI<{ reply: string }>("guru", {
        message: text, name: profile.name, archetype: archetype(profile.dna), spark: profile.hiddenSpark,
        level: LADDER[profile.level].name, examMode: profile.examMode, dna: profile.dna,
        history: history.slice(-6).map((m) => `${m.role === "me" ? "Student" : "Guru"}: ${m.text}`),
      });
      setMsgs((m) => [...m, { role: "guru", text: r.data.reply, source: r.source }]);
    } finally {
      setThinking(false);
    }
  };

  const buildPath = async () => {
    setPathLoading(true);
    setPath(null);
    try {
      const r = await askAI<Path>("path", { discipline: disc, disciplineName: DISC_MAP[disc].name, level: LADDER[profile.level].name, dna: profile.dna, freeSlots: profile.freeSlots });
      setPath({ ...r.data, source: r.source });
    } finally {
      setPathLoading(false);
    }
  };

  const mentors = useMemo(
    () => STUDENTS.filter((s) => s.level >= 3 && s.primary === disc)
      .map((s) => ({ s, shared: s.freeSlots.filter((x) => profile.freeSlots.includes(x)).length }))
      .sort((a, b) => b.s.level - a.s.level || b.shared - a.shared)
      .slice(0, 3),
    [disc, profile.freeSlots],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="flex h-[calc(100dvh-170px)] min-h-[520px] flex-col p-0">
        <div className="flex items-center gap-3 border-b border-line p-4">
          <div className="grid h-10 w-10 place-items-center rounded-full grad-bg"><Sparkles size={18} /></div>
          <div><div className="font-display font-semibold">Guru</div><div className="text-xs text-mute">Your AI creative mentor · ಗುರು</div></div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {msgs.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cx("max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed", m.role === "me" ? "ml-auto grad-bg text-fg" : "bg-fg/[0.06]")}>
              {m.text}
              {m.source && <div className="mt-1.5"><AiTag source={m.source} /></div>}
            </motion.div>
          ))}
          {thinking && <div className="w-48 rounded-2xl bg-fg/[0.06] p-3"><Shimmer lines={2} /></div>}
          <div ref={end} />
        </div>
        <div className="border-t border-line p-3">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK.map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-mute hover:text-fg">{q}</button>)}
          </div>
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send(input)} placeholder="Ask Guru anything…" className="flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-magenta/50" />
            <Button onClick={() => send(input)} disabled={!input.trim() || thinking}><Send size={16} /></Button>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        <Card>
          <SectionHead title="4-week learning path" sub="Structured, bite-sized, built around your timetable" right={path && <AiTag source={path.source} />} />
          <div className="flex flex-wrap gap-1.5">
            {DISCIPLINES.map((d) => (
              <button key={d.id} onClick={() => setDisc(d.id)} className={cx("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs", disc === d.id ? "border-magenta/60 bg-magenta/15" : "border-line text-mute hover:text-fg")}>
                <DiscIcon id={d.id} size={12} /> {d.name}{d.id === bestDisc && " ✦"}
              </button>
            ))}
          </div>
          <Button className="mt-4" onClick={buildPath} disabled={pathLoading}><MapIcon size={16} /> Build my path</Button>
          {pathLoading && <div className="mt-4"><Shimmer lines={5} /></div>}
          {path && (
            <div className="mt-5">
              <div className="font-display text-lg font-semibold">{path.title}</div>
              <div className="relative mt-3 space-y-3 border-l border-fg/10 pl-5">
                {path.weeks.map((w, i) => (
                  <motion.div key={w.week} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative">
                    <span className="absolute -left-[27px] top-0.5 grid h-3.5 w-3.5 place-items-center rounded-full grad-bg" />
                    <div className="text-xs font-semibold uppercase tracking-wider text-mute">Week {w.week}</div>
                    <div className="font-semibold">{w.focus}</div>
                    <ul className="mt-1 space-y-0.5 text-sm text-fg/75">{w.tasks.map((t) => <li key={t}>• {t}</li>)}</ul>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-gold/10 p-3 text-sm text-gold">💡 {path.mentorTip}</div>
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Guru–Shishya match" sub={`Peer mentors in ${DISC_MAP[disc].name} who share your free time`} />
          <div className="space-y-2">
            {mentors.length === 0 && <p className="text-sm text-mute">No mentors in this art form yet. You could be the first!</p>}
            {mentors.map(({ s, shared }) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-fg/[0.04] p-3">
                <Avatar name={s.name} hue={s.hue} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{s.name}</div>
                  <div className="text-xs text-mute">{s.dept} · {s.year} yr · {s.events} events · {shared} shared slots</div>
                </div>
                <Badge color={s.level === 4 ? "#a87a26" : "#3e6a8a"}>{LADDER[s.level].name}</Badge>
                <Button size="sm" variant="soft" onClick={() => toast(`Request sent to ${s.name.split(" ")[0]} 🙏`, "info")}><UserPlus size={14} /></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
