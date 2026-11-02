"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ArrowLeft, BellRing, CalendarPlus, Gauge, Radar, Sparkles, TrendingUp, UserPlus, Users, Wand2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Logo } from "@/components/Logo";
import { AiTag, Avatar, Badge, Button, Card, DiscIcon, Kn, SectionHead, Shimmer, cx } from "@/components/ui";
import { askAI } from "@/lib/ai";
import { COLLAB_LINKS, DIMS, DIM_MAP, DISCIPLINES, DISC_MAP, LADDER, MONTHLY, SLOTS, STUDENTS, discFit, percentile } from "@/lib/data";
import { churnRisk, crossDisciplineRate, disciplineMix, dormantTalent, funnel, gaps, heatmap, predictTurnout } from "@/lib/engine";
import { useStore } from "@/lib/store";
import type { Dim, DisciplineId } from "@/lib/types";

const TABS = [
  { id: "overview", label: "Engagement", icon: Gauge },
  { id: "radar", label: "Talent Radar", icon: Radar },
  { id: "planner", label: "AI Event Planner", icon: CalendarPlus },
] as const;

const tooltipStyle = { background: "#fffbf4", border: "1px solid rgba(92,58,33,0.12)", borderRadius: 12, fontSize: 12 };

export default function Cockpit() {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("overview");
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo small />
            <span className="hidden h-6 w-px bg-line sm:block" />
            <div className="hidden sm:block">
              <div className="font-display text-sm font-semibold">Organizer Cockpit</div>
              <div className="text-[11px] text-mute">SVM coordinators & faculty</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="#a87a26">Demo data · simulated</Badge>
            <Link href="/events" className="flex items-center gap-1 rounded-full grad-bg px-3 py-1.5 text-xs font-semibold"><CalendarPlus size={13} /> Real events</Link>
            <Link href="/home" className="flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-xs hover:bg-fg/5"><ArrowLeft size={13} /> Student view</Link>
          </div>
        </div>
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 sm:px-6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cx("flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition", tab === t.id ? "border-magenta text-fg" : "border-transparent text-mute hover:text-fg")}>
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {tab === "overview" && <Overview />}
        {tab === "radar" && <TalentRadar />}
        {tab === "planner" && <Planner />}
      </main>
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview() {
  const { toast } = useStore();
  const f = useMemo(funnel, []);
  const hm = useMemo(heatmap, []);
  const gp = useMemo(gaps, []);
  const churn = useMemo(churnRisk, []);
  const mix = useMemo(disciplineMix, []);
  const cross = useMemo(() => crossDisciplineRate(COLLAB_LINKS), []);
  const dormant = useMemo(() => STUDENTS.filter((s) => s.level === 0 && Math.max(...Object.values(s.dna)) >= 75).length, []);
  const [insights, setInsights] = useState<{ list: string[]; source: string } | null>(null);
  const last = MONTHLY[MONTHLY.length - 1];
  const prev = MONTHLY[MONTHLY.length - 2];

  useEffect(() => {
    askAI<{ insights: string[] }>("insight", {
      funnel: f, gaps: gp.slice(0, 4), churn: churn.length, dormantTalent: dormant, crossDisciplinePct: cross,
      topDiscipline: mix[0]?.name, lowDiscipline: mix[mix.length - 1]?.name, monthly: MONTHLY,
    }).then((r) => setInsights({ list: r.data.insights, source: r.source })).catch(() => {});
  }, [f, gp, churn.length, dormant, cross, mix]);

  const kpis = [
    { label: "Active members", value: last.active, delta: `+${Math.round(((last.active - prev.active) / prev.active) * 100)}% MoM`, icon: Users, color: "#8b3a3a" },
    { label: "First-timers this month", value: last.newcomers, delta: "joined via Spark", icon: Sparkles, color: "#a87a26" },
    { label: "Cross-discipline collabs", value: `${cross}%`, delta: "of all collaborations", icon: TrendingUp, color: "#4f7b5f" },
    { label: "Dormant talent found", value: dormant, delta: "high DNA, never joined", icon: Radar, color: "#6e5384" },
    { label: "Regulars at risk", value: churn.length, delta: "inactive 3+ weeks", icon: AlertTriangle, color: "#b5651d" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k, i) => (
          <motion.div key={k.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-4">
            <div className="flex items-center justify-between text-xs text-mute">{k.label}<k.icon size={15} style={{ color: k.color }} /></div>
            <div className="mt-2 font-display text-3xl font-bold">{k.value}</div>
            <div className="text-[11px]" style={{ color: k.color }}>{k.delta}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionHead title="Community growth" sub="Monthly active members and first-timers" />
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={MONTHLY} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b3a3a" stopOpacity={0.5} /><stop offset="1" stopColor="#8b3a3a" stopOpacity={0} /></linearGradient>
                <linearGradient id="gn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a87a26" stopOpacity={0.45} /><stop offset="1" stopColor="#a87a26" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(92,58,33,0.12)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: "#8a6f58", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#8a6f58", fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine x="Sep" stroke="#4f7b5f" strokeDasharray="4 4" label={{ value: "Spandana launch", fill: "#4f7b5f", fontSize: 11, position: "insideTopLeft" }} />
              <Area type="monotone" dataKey="active" name="Active" stroke="#8b3a3a" strokeWidth={2} fill="url(#ga)" />
              <Area type="monotone" dataKey="newcomers" name="First-timers" stroke="#a87a26" strokeWidth={2} fill="url(#gn)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="AI insights" sub="What to do this week" right={insights && <AiTag source={insights.source} />} />
          {!insights ? <Shimmer lines={6} /> : (
            <div className="space-y-2.5">
              {insights.list.map((t, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="flex gap-2.5 rounded-xl bg-fg/[0.04] p-3 text-sm">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full grad-bg text-[10px] font-bold">{i + 1}</span>
                  <span className="text-fg/85">{t}</span>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <SectionHead title="Participation funnel" sub="Where students drop off" />
          <div className="space-y-2.5">
            {f.map((s, i) => {
              const pct = Math.round((s.value / f[0].value) * 100);
              const conv = i ? Math.round((s.value / f[i - 1].value) * 100) : 100;
              return (
                <div key={s.stage}>
                  <div className="mb-1 flex justify-between text-xs"><span>{s.stage}</span><span className="text-mute">{s.value} · {i ? `${conv}% step` : "100%"}</span></div>
                  <div className="h-6 overflow-hidden rounded-lg bg-fg/5"><motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.08 }} className="h-full rounded-lg grad-bg" style={{ opacity: 1 - i * 0.13 }} /></div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <SectionHead title="Engagement heatmap" sub="% of each branch-year participating" />
          <div className="grid grid-cols-[auto_repeat(4,1fr)] gap-1.5 text-xs">
            <div />
            {[1, 2, 3, 4].map((y) => <div key={y} className="text-center text-mute">Yr {y}</div>)}
            {hm.map((r) => (
              <Row key={r.dept} dept={r.dept} years={r.years} />
            ))}
          </div>
          {gp.length > 0 && (
            <div className="mt-3 rounded-xl border border-saffron/30 bg-saffron/10 p-2.5 text-xs">
              <b className="text-saffron">Gap detected:</b> {gp.slice(0, 3).map((g) => `${g.dept} Yr ${g.year} (${g.rate}%)`).join(", ")}
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Art-form mix" sub="Primary discipline of active members" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={mix} layout="vertical" margin={{ left: 10, right: 10 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={118} tick={{ fill: "#5c4033", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(92,58,33,0.05)" }} />
              <Bar dataKey="value" name="Members" radius={[0, 6, 6, 0]}>
                {mix.map((m) => <Cell key={m.id} fill={m.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <SectionHead title="Regulars going quiet" sub="Active members inactive for 3+ weeks. A personal nudge from a squad-mate works best." right={<Button size="sm" variant="soft" onClick={() => toast(`Nudges queued for ${churn.length} members via their squad-mates`)}><BellRing size={14} /> Nudge all</Button>} />
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {churn.slice(0, 8).map((s) => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl bg-fg/[0.04] p-3">
              <Avatar name={s.name} hue={s.hue} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-mute">{LADDER[s.level].name} · {s.lastActiveDaysAgo}d quiet</div>
              </div>
              <DiscIcon id={s.primary} size={16} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ dept, years }: { dept: string; years: { year: number; rate: number; active: number }[] }) {
  return (
    <>
      <div className="pr-1 font-medium text-mute">{dept}</div>
      {years.map((y) => {
        const a = Math.min(1, y.rate / 16);
        const gap = y.rate < 4;
        return (
          <div key={y.year} title={`${y.active} active`} className={cx("grid h-8 place-items-center rounded-md text-[11px] font-semibold", gap && "ring-1 ring-saffron/70")}
            style={{ background: gap ? "rgba(181,101,29,0.12)" : `rgba(139,58,58,${0.12 + a * 0.7})` }}>
            {y.rate}%
          </div>
        );
      })}
    </>
  );
}

/* ---------------- Talent Radar ---------------- */

function TalentRadar() {
  const { toast } = useStore();
  const [dim, setDim] = useState<Dim>("rhythm");
  const [min, setMin] = useState(70);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const list = useMemo(() => dormantTalent(dim, min), [dim, min]);
  const meta = DIM_MAP[dim];
  const bestDisc = (id: string) => {
    const s = STUDENTS.find((x) => x.id === id)!;
    return DISCIPLINES.filter((d) => (d.dims[dim] ?? 0) >= 0.8).sort((a, b) => discFit(s.dna, b.id) - discFit(s.dna, a.id))[0];
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl" style={{ background: `${meta.color}40` }} />
        <div className="relative">
          <h1 className="font-display text-2xl font-bold">Talent Radar</h1>
          <p className="mt-1 max-w-2xl text-sm text-mute">Students whose Creative Spark shows strong ability but who have <b className="text-fg">never joined anything</b>. Traditional clubs never see them. Invite them personally to a beginner session.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {DIMS.map((d) => (
              <button key={d.key} onClick={() => setDim(d.key)} className={cx("rounded-full border px-3.5 py-1.5 text-sm font-medium transition", dim === d.key ? "text-white" : "border-line text-mute hover:text-fg")} style={dim === d.key ? { background: d.color, borderColor: d.color } : {}}>
                {d.label} <Kn className="text-xs opacity-80">{d.kn}</Kn>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3 text-sm">
            <span className="text-mute">Min score</span>
            <input type="range" min={55} max={95} value={min} onChange={(e) => setMin(Number(e.target.value))} className="w-48 accent-[#5c3a21]" />
            <b>{min}</b>
            <span className="ml-auto text-mute"><b className="text-fg">{list.length}</b> hidden {meta.label.toLowerCase()} talents found</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.slice(0, 18).map((s, i) => {
          const d = bestDisc(s.id);
          const done = invited.has(s.id);
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }} className="card flex items-center gap-3 p-4">
              <Avatar name={s.name} hue={s.hue} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{s.name}</div>
                <div className="text-xs text-mute">{s.dept} · Yr {s.year} · top {Math.max(1, 100 - percentile(dim, s.dna[dim]))}%</div>
                {d && <div className="mt-1 flex items-center gap-1 text-[11px]" style={{ color: d.color }}><DiscIcon id={d.id} size={11} /> try {d.name}</div>}
              </div>
              <div className="text-right">
                <div className="font-display text-xl font-bold" style={{ color: meta.color }}>{s.dna[dim]}</div>
                <button disabled={done} onClick={() => { setInvited(new Set(invited).add(s.id)); toast(`Personal invite sent to ${s.name.split(" ")[0]}`); }} className="mt-0.5 text-[11px] text-mute underline hover:text-fg disabled:no-underline disabled:text-aqua">{done ? "Invited ✓" : "Invite"}</button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------- Planner ---------------- */

interface Plan { tagline: string; roles: { role: string; count: number; note: string }[]; timeline: { when: string; task: string }[]; promo: string; promoKn: string }

function Planner() {
  const { toast } = useStore();
  const [title, setTitle] = useState("Rhythm of Hubballi — Open Jam");
  const [disc, setDisc] = useState<DisciplineId>("instrument");
  const [slot, setSlot] = useState("Thu 16:00");
  const [level, setLevel] = useState("beginner");
  const [exam, setExam] = useState(false);
  const [plan, setPlan] = useState<(Plan & { source: string }) | null>(null);
  const [loading, setLoading] = useState(false);

  const pred = useMemo(() => predictTurnout({ discipline: disc, slot, examWeek: exam, level }), [disc, slot, exam, level]);
  const invites = useMemo(
    () => STUDENTS.filter((s) => s.level <= 1 && s.freeSlots.includes(slot)).map((s) => ({ s, fit: discFit(s.dna, disc) })).sort((a, b) => b.fit - a.fit).slice(0, 8),
    [disc, slot],
  );

  const generate = async () => {
    setLoading(true);
    setPlan(null);
    try {
      const r = await askAI<Plan>("plan", { title, discipline: disc, disciplineName: DISC_MAP[disc].name, slot, level, examWeek: exam, expectedTurnout: pred.expected });
      setPlan({ ...r.data, source: r.source });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-4">
        <Card>
          <SectionHead title="Plan an event" sub="AI drafts the plan; the data predicts turnout" />
          <div className="space-y-3 text-sm">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-line bg-white px-3 py-2.5 outline-none focus:border-magenta/50" />
            <select value={disc} onChange={(e) => setDisc(e.target.value as DisciplineId)} className="w-full rounded-xl border border-line bg-panel px-3 py-2.5 outline-none">
              {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={slot} onChange={(e) => setSlot(e.target.value)} className="flex-1 rounded-xl border border-line bg-panel px-3 py-2.5 outline-none">
                {SLOTS.map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="flex-1 rounded-xl border border-line bg-panel px-3 py-2.5 outline-none">
                <option value="beginner">Beginner</option><option value="open">Open</option><option value="experienced">Experienced</option>
              </select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-mute"><input type="checkbox" checked={exam} onChange={(e) => setExam(e.target.checked)} className="accent-[#5c3a21]" /> Falls in internal-exam week</label>
            <Button className="w-full" onClick={generate} disabled={loading}><Wand2 size={16} /> Generate plan with AI</Button>
          </div>
        </Card>
        <Card>
          <div className="text-xs uppercase tracking-widest text-mute">Predicted turnout</div>
          <div className="mt-1 font-display text-4xl font-bold grad-text">{pred.low}–{pred.high}</div>
          <div className="mt-2 space-y-1 text-xs text-mute">
            <div>• {pred.interested} students have a strong {DISC_MAP[disc].name} fit</div>
            <div>• {pred.free} of them are free {slot}</div>
            {exam && <div className="text-saffron">• Exam week cuts turnout by ~55%. Consider moving it.</div>}
            {level === "beginner" && <div className="text-aqua">• Beginner label lifts turnout ~15%</div>}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <SectionHead title="Targeted invites" sub={`Explorers & Crew who fit ${DISC_MAP[disc].name} and are free ${slot}`} right={<Button size="sm" variant="soft" onClick={() => toast(`${invites.length} personalised invites sent`)}><UserPlus size={14} /> Invite all</Button>} />
          <div className="grid gap-2 sm:grid-cols-2">
            {invites.map(({ s, fit }) => (
              <div key={s.id} className="flex items-center gap-3 rounded-xl bg-fg/[0.04] p-2.5">
                <Avatar name={s.name} hue={s.hue} size={32} />
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{s.name}</div><div className="text-[11px] text-mute">{s.dept} · Yr {s.year} · {LADDER[s.level].name}</div></div>
                <Badge color={DISC_MAP[disc].color}>{Math.round(fit * 100)}% fit</Badge>
              </div>
            ))}
          </div>
        </Card>

        {loading && <Card><Shimmer lines={8} /></Card>}
        {plan && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs uppercase tracking-widest text-mute">AI event plan</div><div className="font-display text-xl font-bold">{title}</div><div className="text-sm text-mute">{plan.tagline}</div></div>
              <AiTag source={plan.source} />
            </div>
            <div className="mt-4 grid gap-5 md:grid-cols-2">
              <div>
                <div className="mb-2 text-sm font-semibold">Roles</div>
                <div className="space-y-1.5">
                  {plan.roles.map((r) => (
                    <div key={r.role} className="flex items-start gap-2 text-sm"><span className="grid h-6 min-w-6 place-items-center rounded-md bg-fg/10 px-1 text-xs font-bold">{r.count}</span><div><div className="font-medium">{r.role}</div><div className="text-xs text-mute">{r.note}</div></div></div>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-semibold">Timeline</div>
                <div className="space-y-1.5 border-l border-fg/10 pl-3">
                  {plan.timeline.map((t) => <div key={t.when} className="text-sm"><b className="text-magenta">{t.when}</b> <span className="text-fg/80">{t.task}</span></div>)}
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-line bg-white p-4">
              <div className="mb-1 text-xs uppercase tracking-widest text-mute">Promo caption</div>
              <p className="text-sm">{plan.promo}</p>
              <Kn className="mt-2 block text-sm text-gold">{plan.promoKn}</Kn>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
