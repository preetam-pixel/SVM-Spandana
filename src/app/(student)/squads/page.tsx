"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CalendarClock, Check, GitBranch, Sparkles, Users, Wand2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { ConstellationFriend } from "@/components/Constellation";
import { AiTag, Avatar, Badge, Button, Card, DiscIcon, SectionHead, Shimmer } from "@/components/ui";
import { askAI } from "@/lib/ai";
import { COLLAB_LINKS, DIM_MAP, DISC_MAP, LADDER, QUESTS, STUDENTS } from "@/lib/data";
import { buildSquad, crossDisciplineRate, type Squad } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Quest } from "@/lib/types";

const Constellation = dynamic(() => import("@/components/Constellation"), { ssr: false, loading: () => <div className="shimmer h-[360px] rounded-2xl" /> });

export default function SquadsPage() {
  const { profile, update, addContribution, toast } = useStore();
  const [active, setActive] = useState<Quest | null>(null);
  const [squad, setSquad] = useState<Squad | null>(null);
  const [ai, setAi] = useState<{ name: string; pitch: string; source: string } | null>(null);
  const [friends, setFriends] = useState<ConstellationFriend[]>([]);

  useEffect(() => {
    fetch("/api/friends").then((r) => r.json()).then((d) => d.friends && setFriends(d.friends)).catch(() => {});
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const myLinks = useMemo(() => [...new Set(profile.quests.flatMap((id) => {
    const q = QUESTS.find((x) => x.id === id);
    return q ? buildSquad(q, profile).members.filter((m) => m.student).map((m) => m.student!.id) : [];
  }))], [profile.quests]);

  const activeCount = STUDENTS.filter((s) => s.level >= 1).length;
  const cross = useMemo(() => crossDisciplineRate(COLLAB_LINKS), []);

  const build = async (q: Quest) => {
    setActive(q);
    setAi(null);
    const s = buildSquad(q, profile);
    setSquad(s);
    const r = await askAI<{ name: string; pitch: string }>("squad", {
      title: q.title, desc: q.desc, roles: s.members.map((m) => m.role.role), depts: s.depts,
      members: s.members.map((m) => ({ name: m.name, role: m.role.role, dept: m.dept, level: LADDER[m.level].name })),
    });
    setAi({ ...r.data, source: r.source });
  };

  const join = () => {
    if (!active || !squad) return;
    if (!profile.quests.includes(active.id)) {
      update((p) => ({ ...p, quests: [...p.quests, active.id] }));
      const mine = squad.members.find((m) => !m.student);
      addContribution({ title: `Joined squad “${ai?.name ?? active.title}” as ${mine?.role.role}`, kind: "squad", discipline: mine?.role.discipline, points: 25 });
    }
    toast("Squad formed! Watch your new links light up ✨");
  };

  return (
    <div className="space-y-6">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-bold">Creative Constellation</h1>
            <p className="mt-1 max-w-xl text-sm text-mute">Every dot is an SVM creator, coloured by art form. <span className="text-magenta">Pink lines</span> are collaborations across disciplines; <span className="text-gold">gold lines</span> connect you to your squads and friends. <b className="text-fg">Tap any dot to open their profile.</b></p>
          </div>
          <div className="flex gap-6 text-center">
            <Stat n={activeCount + friends.length + (myLinks.length || friends.length ? 1 : 0)} l="creators" />
            <Stat n={COLLAB_LINKS.length + myLinks.length + friends.length} l="collabs" />
            <Stat n={`${cross}%`} l="cross-discipline" />
          </div>
        </div>
        <div className="mt-3 rounded-2xl bg-white"><Constellation myLinks={myLinks} friends={friends} /></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <section>
          <SectionHead title="Open quests" sub="Real projects that need mixed skills" />
          <div className="space-y-3">
            {QUESTS.map((q) => (
              <div key={q.id} className={`card p-4 transition ${active?.id === q.id ? "border-magenta/50 bg-fg/[0.06]" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge color="#a87a26">{q.tag}</Badge>
                    <div className="mt-2 font-display text-lg font-semibold">{q.title}</div>
                    <p className="mt-0.5 text-sm text-mute">{q.desc}</p>
                  </div>
                  {profile.quests.includes(q.id) && <Badge color="#4f7b5f"><Check size={11} /> Joined</Badge>}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {q.roles.map((r, i) => (
                    <span key={i} className="flex items-center gap-1 rounded-full bg-fg/5 px-2.5 py-1 text-xs"><DiscIcon id={r.discipline} size={12} /> {r.role}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-mute">
                  <span>by {q.by} · due in {q.due}</span>
                  <Button size="sm" onClick={() => build(q)}><Wand2 size={14} /> Build my squad</Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHead title="AI Squad Builder" sub="Matches skills, shared free time, branch diversity and a beginner–expert mix" />
          <AnimatePresence mode="wait">
            {!squad ? (
              <Card className="grid min-h-[300px] place-items-center text-center">
                <div>
                  <Users size={36} className="mx-auto text-mute" />
                  <p className="mt-3 text-sm text-mute">Pick a quest. Spandana will find the role where <b className="text-fg">your</b> DNA fills a gap, then build the team around you.</p>
                </div>
              </Card>
            ) : (
              <motion.div key={active?.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-widest text-mute">{active?.title}</div>
                    {ai ? <div className="font-display text-2xl font-bold grad-text">{ai.name}</div> : <div className="mt-2 w-40"><Shimmer lines={1} /></div>}
                  </div>
                  {ai && <AiTag source={ai.source} />}
                </div>
                {ai ? <p className="mt-2 text-sm text-fg/80">{ai.pitch}</p> : <div className="mt-3"><Shimmer lines={2} /></div>}

                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  <Mini icon={<Sparkles size={14} />} n={`${squad.coverage}`} l="skill fit" />
                  <Mini icon={<GitBranch size={14} />} n={squad.depts} l="branches" />
                  <Mini icon={<Users size={14} />} n={`${squad.beginners}/${squad.experienced}`} l="new / pro" />
                  <Mini icon={<CalendarClock size={14} />} n={squad.bestSlot.split(" ")[0]} l={squad.bestSlot.split(" ")[1]} />
                </div>

                <div className="mt-4 space-y-2">
                  {squad.members.map((m, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.12 * i }}
                      className={`flex items-center gap-3 rounded-xl p-2.5 ${m.student ? "bg-fg/[0.04]" : "border border-gold/40 bg-gold/10"}`}>
                      <Avatar name={m.name} hue={m.student?.hue ?? 45} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{m.name} <span className="font-normal text-mute">· {m.dept} {m.year}yr</span></div>
                        <div className="truncate text-xs text-mute">{m.why.join(" · ")}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-xs font-semibold"><DiscIcon id={m.role.discipline} size={12} /> {m.role.role}</div>
                        <div className="text-[10px] text-mute">{LADDER[m.level].name} · {DIM_MAP[m.role.dim].label} {m.fit}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-mute">Best jam slot: <b className="text-fg">{squad.bestSlot}</b>, {squad.slotFree}/{squad.members.length} free</div>
                <Button className="mt-4 w-full" onClick={join} disabled={!!active && profile.quests.includes(active.id) && myLinks.length > 0}>
                  {active && profile.quests.includes(active.id) && myLinks.length > 0 ? <><Check size={16} /> You're in this squad</> : "Join this squad"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
      <p className="text-center text-xs text-mute">Squad colours: {Object.values(DISC_MAP).map((d) => <span key={d.id} className="mx-1.5 inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{d.name}</span>)}</p>
    </div>
  );
}

function Stat({ n, l }: { n: number | string; l: string }) {
  return <div><div className="font-display text-2xl font-bold">{n}</div><div className="text-[11px] text-mute">{l}</div></div>;
}

function Mini({ icon, n, l }: { icon: React.ReactNode; n: number | string; l: string }) {
  return (
    <div className="rounded-xl bg-fg/[0.04] p-2">
      <div className="flex items-center justify-center gap-1 text-mute">{icon}</div>
      <div className="font-display text-base font-bold">{n}</div>
      <div className="text-[10px] text-mute">{l}</div>
    </div>
  );
}
