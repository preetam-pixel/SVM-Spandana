"use client";

import { motion } from "framer-motion";
import {
  CalendarCheck, CalendarDays, Flag, GitBranch, Handshake, Images, Info, Plus, Search, Star, Trash2, Trophy, Users, X, type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, DiscIcon, Kn, SectionHead, Shimmer, cx } from "@/components/ui";
import { DISCIPLINES } from "@/lib/data";
import { LEVELS, LEVEL_LABEL, POSITIONS, POSITION_MAP, discName, fmtDate, unitFor } from "@/lib/opportunities";
import { useStore } from "@/lib/store";
import type { ClubTrophy, Milestone, PersonCard } from "@/lib/types";
import { uploadMedia } from "@/lib/upload-client";

const ICONS: Record<string, LucideIcon> = { Users, GitBranch, CalendarDays, CalendarCheck, Images, Handshake, Flag, Star, Trophy };

interface ClubData { core: boolean; trophies: ClubTrophy[]; milestones: Milestone[]; setup?: string }

export default function ClubPage() {
  const { toast } = useStore();
  const [data, setData] = useState<ClubData | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    fetch("/api/club").then((r) => r.json()).then((d) => (d.milestones ? setData(d) : toast(d.error ?? "Couldn't load", "error"))).catch(() => {});
  }, [toast]);
  useEffect(load, [load]);

  const remove = async (t: ClubTrophy) => {
    if (!confirm(`Remove “${t.title} · ${t.fest}” from the cabinet?`)) return;
    const res = await fetch(`/api/club/${t.id}`, { method: "DELETE" });
    if (res.ok) { toast("Trophy removed", "info"); load(); } else toast("Couldn't remove", "error");
  };

  if (!data) return <Card><Shimmer lines={6} /></Card>;
  const wins = data.trophies.filter((t) => t.position === "winner").length;
  const podium = data.trophies.filter((t) => ["winner", "runner-up", "third"].includes(t.position)).length;
  const topLevel = LEVELS.slice().reverse().find((l) => data.trophies.some((t) => t.level === l.id));

  return (
    <div className="space-y-6">
      {data.setup && <div className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-sand/20 p-3 text-sm"><Info size={16} className="mt-0.5 shrink-0 text-gold" />{data.setup}</div>}

      <section className="card relative overflow-hidden p-6">
        <div className="absolute -right-10 -top-10 h-52 w-52 rounded-full bg-sand/60 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <Image src="/svm-logo.png" alt="SVM" width={1086} height={861} className="h-24 w-auto shrink-0" />
          <div className="flex-1">
            <h1 className="font-display text-2xl font-bold sm:text-3xl">SVM Club <Kn className="text-lg font-normal text-mute">ಸಾಧನೆಗಳು</Kn></h1>
            <p className="mt-1 text-sm text-mute">What we&apos;ve won together, and the goals every member moves forward: each check-in, shared work and friendship counts.</p>
          </div>
          <div className="grid shrink-0 grid-cols-3 gap-2 text-center">
            {[[data.trophies.length, "trophies"], [wins, "1st places"], [podium, "podiums"]].map(([n, l]) => (
              <div key={l as string} className="rounded-xl bg-panel2/70 px-3 py-2"><div className="font-display text-2xl font-bold">{n}</div><div className="text-[11px] text-mute">{l}</div></div>
            ))}
          </div>
        </div>
        {topLevel && <div className="relative mt-4 text-center text-xs text-mute sm:text-left">Highest stage reached: <b className="text-fg">{topLevel.label}</b></div>}
      </section>

      <section>
        <SectionHead title="Club goals" sub="Shared milestones. Everyone's activity fills these bars." />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.milestones.map((m, i) => <MilestoneCard key={m.id} m={m} i={i} />)}
        </div>
      </section>

      <section>
        <SectionHead
          title="Trophy cabinet"
          sub="Fests, competitions and stages SVM members have represented the club at"
          right={data.core && <Button size="sm" variant="core" onClick={() => setAdding(true)}><Plus size={14} /> Add trophy</Button>}
        />
        {data.trophies.length === 0 ? (
          <Card className="py-10 text-center">
            <Trophy size={36} className="mx-auto text-gold" />
            <div className="mt-3 font-display text-lg font-semibold">The cabinet is waiting for its first trophy</div>
            <p className="mx-auto mt-1 max-w-md text-sm text-mute">
              {data.core ? "Add SVM's past wins (fests, VTU Youth Festival, inter-college events) so new members can see what the club has achieved." : "Represent SVM at a fest. Check Opportunities to raise your hand for the next one."}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              {data.core ? <Button variant="core" onClick={() => setAdding(true)}><Plus size={15} /> Add the first trophy</Button> : <Link href="/opportunities"><Button>See opportunities</Button></Link>}
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.trophies.map((t, i) => <TrophyCard key={t.id} t={t} i={i} canDelete={data.core} onDelete={() => remove(t)} />)}
          </div>
        )}
      </section>

      {adding && <TrophyForm onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}
    </div>
  );
}

function MilestoneCard({ m, i }: { m: Milestone; i: number }) {
  const Icon = ICONS[m.icon] ?? Trophy;
  const reached = m.tiers.filter((t) => m.value >= t).length;
  const next = m.tiers.find((t) => m.value < t);
  const prev = reached ? m.tiers[reached - 1] : 0;
  const pct = next ? Math.round(((m.value - prev) / (next - prev)) * 100) : 100;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sand/40 text-iris"><Icon size={19} /></div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{m.label}</div>
          <div className="text-xs text-mute">Level {reached} of {m.tiers.length}</div>
        </div>
        <div className="font-display text-2xl font-bold">{m.value}</div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-fg/10"><div className="h-full grad-bg transition-all" style={{ width: `${pct}%` }} /></div>
      <div className="mt-1.5 flex justify-between text-[11px] text-mute">
        <span>{next ? `${next - m.value} more ${unitFor(next - m.value, m.unit)} to level ${reached + 1}` : "Every level unlocked 🎉"}</span>
        {next && <span>{m.value}/{next}</span>}
      </div>
    </motion.div>
  );
}

function TrophyCard({ t, i, canDelete, onDelete }: { t: ClubTrophy; i: number; canDelete: boolean; onDelete: () => void }) {
  const pos = POSITION_MAP[t.position];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
      className={cx("card flex flex-col overflow-hidden p-0", t.mine && "ring-2 ring-gold/60")}>
      {t.photo ? <img src={t.photo} alt={t.title} className="h-40 w-full object-cover" /> : (
        <div className="grid h-24 place-items-center text-5xl" style={{ background: `linear-gradient(135deg, ${pos.color}26, transparent)` }}>{pos.emoji}</div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge color={pos.color}>{pos.emoji} {pos.label}</Badge>
          <Badge color="#5c3a21">{LEVEL_LABEL[t.level]}</Badge>
          {t.mine && <Badge color="#a87a26">You were here</Badge>}
        </div>
        <div className="mt-2 flex items-start gap-2">
          {t.discipline && <DiscIcon id={t.discipline} size={18} className="mt-1 shrink-0" />}
          <div>
            <div className="font-display text-lg font-semibold leading-snug">{t.title}</div>
            <div className="text-sm text-mute">{t.fest}{t.wonOn ? ` · ${fmtDate(t.wonOn)}` : ""}</div>
          </div>
        </div>
        {t.description && <p className="mt-2 text-sm text-fg/80">{t.description}</p>}
        {(t.members.length > 0 || t.team) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {t.members.map((m) => (
              <Link key={m.id} href={`/u/${m.id}`} title={m.name} className="flex items-center gap-1.5 rounded-full border border-line bg-white py-0.5 pl-0.5 pr-2.5 text-xs hover:border-iris/50">
                <Avatar name={m.name} src={m.avatar} size={22} hue={m.name.length * 37} /> {m.name.split(" ")[0]}
              </Link>
            ))}
            {t.team && <span className="text-xs text-mute">{t.team}</span>}
          </div>
        )}
        {canDelete && (
          <button onClick={onDelete} className="mt-auto flex items-center gap-1 self-end pt-3 text-xs text-mute hover:text-magenta"><Trash2 size={13} /> Remove</button>
        )}
      </div>
    </motion.div>
  );
}

const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";

function TrophyForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { account, toast } = useStore();
  const [f, setF] = useState({ title: "", fest: "", level: "university", position: "winner", discipline: "", wonOn: "", team: "", description: "" });
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PersonCard[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) return setResults([]);
    const t = setTimeout(() => {
      fetch(`/api/people?q=${encodeURIComponent(q.trim())}`).then((r) => r.json()).then((d) => setResults((d.people ?? []).slice(0, 6))).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  const add = (m: { id: string; name: string }) => { if (!members.some((x) => x.id === m.id)) setMembers([...members, m]); setQ(""); setResults([]); };

  const save = async () => {
    setBusy(true);
    let photoPath: string | undefined;
    if (photo) {
      const up = await uploadMedia(photo, "photo");
      if ("error" in up) { setBusy(false); return toast(up.error, "error"); }
      photoPath = up.path;
    }
    const res = await fetch("/api/club", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...f, memberIds: members.map((m) => m.id), photoPath }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Couldn't save", "error");
    toast("Trophy added to the cabinet 🏆", "level");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl bg-night p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Add a trophy</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-mute hover:bg-fg/5" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid gap-3">
          <label className="text-sm">Event / category won<input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. Folk Dance" /></label>
          <label className="text-sm">Fest or competition<input className={field} value={f.fest} onChange={(e) => setF({ ...f, fest: e.target.value })} placeholder="e.g. VTU Youth Festival 2025" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Result
              <select className={field} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })}>{POSITIONS.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.label}</option>)}</select>
            </label>
            <label className="text-sm">Level
              <select className={field} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value })}>{LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select>
            </label>
            <label className="text-sm">Art form
              <select className={field} value={f.discipline} onChange={(e) => setF({ ...f, discipline: e.target.value })}>
                <option value="">—</option>{DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="text-sm">Date<input type="date" className={field} value={f.wonOn} onChange={(e) => setF({ ...f, wonOn: e.target.value })} /></label>
          </div>

          <div className="text-sm">
            Team members on Spandana <span className="text-mute">(they get the “Represented SVM” badge)</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {members.map((m) => (
                <span key={m.id} className="flex items-center gap-1 rounded-full bg-iris/10 px-2.5 py-1 text-xs font-semibold text-iris">
                  {m.name}<button onClick={() => setMembers(members.filter((x) => x.id !== m.id))} aria-label={`Remove ${m.name}`}><X size={12} /></button>
                </span>
              ))}
              {account && !members.some((m) => m.id === account.id) && (
                <button onClick={() => add({ id: account.id, name: account.name })} className="rounded-full border border-dashed border-line px-2.5 py-1 text-xs text-mute hover:text-fg">+ Me</button>
              )}
            </div>
            <div className="relative mt-2">
              <Search size={14} className="absolute left-3 top-3 text-mute" />
              <input className={`${field} pl-8`} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by name" />
              {results.length > 0 && (
                <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-xl border border-line bg-white shadow-lg">
                  {results.map((p) => (
                    <button key={p.id} onClick={() => add({ id: p.id, name: p.name })} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-panel2/60">
                      <Avatar name={p.name} src={p.avatar} size={24} hue={p.name.length * 37} /> {p.name} <span className="text-xs text-mute">{p.dept} · {p.year} yr</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <label className="text-sm">Other team members <span className="text-mute">(names, optional)</span><input className={field} value={f.team} onChange={(e) => setF({ ...f, team: e.target.value })} placeholder="e.g. + 8 dancers from ECE" /></label>
          <label className="text-sm">Story <span className="text-mute">(optional)</span><textarea rows={2} className={`${field} resize-none`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="One line about the performance" /></label>
          <label className="text-sm">Photo <span className="text-mute">(optional)</span><input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
          {f.discipline && <div className="text-xs text-mute">Art form: {discName(f.discipline)}</div>}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || f.title.trim().length < 2 || f.fest.trim().length < 2}><Trophy size={15} /> {busy ? "Saving…" : "Add to cabinet"}</Button>
        </div>
      </div>
    </div>
  );
}
