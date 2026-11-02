"use client";

import { motion } from "framer-motion";
import { CalendarDays, Check, ExternalLink, Flag, Info, MapPin, Pencil, Plus, Sparkles, Trash2, Users, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Avatar, Badge, Button, Card, DiscIcon, Kn, SectionHead, Shimmer, cx } from "@/components/ui";
import { DISCIPLINES } from "@/lib/data";
import { LEVELS, LEVEL_LABEL, OPP_KINDS, daysUntil, fmtDate, isGoodFit } from "@/lib/opportunities";
import { useStore } from "@/lib/store";
import type { DisciplineId, Opportunity, OpportunityCategory } from "@/lib/types";

interface Listing { core: boolean; opportunities: Opportunity[]; setup?: string }
interface Interested { id: string; name: string; avatar: string; dept: string; year: number; categories: string[] }

export default function OpportunitiesPage() {
  const { toast } = useStore();
  const [data, setData] = useState<Listing | null>(null);
  const [editing, setEditing] = useState<Opportunity | "new" | null>(null);

  const load = useCallback(() => {
    fetch("/api/opportunities").then((r) => r.json()).then((d) => (d.opportunities ? setData(d) : toast(d.error ?? "Couldn't load", "error"))).catch(() => {});
  }, [toast]);
  useEffect(load, [load]);

  const replace = (o: Opportunity) => setData((d) => (d ? { ...d, opportunities: d.opportunities.map((x) => (x.id === o.id ? o : x)) } : d));

  if (!data) return <Card><Shimmer lines={6} /></Card>;
  const open = data.opportunities.filter((o) => (daysUntil(o.deadline ?? o.endsOn ?? o.startsOn) ?? 0) >= 0);
  const past = data.opportunities.filter((o) => !open.includes(o));

  return (
    <div className="space-y-6">
      {data.setup && <div className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-sand/20 p-3 text-sm"><Info size={16} className="mt-0.5 shrink-0 text-gold" />{data.setup}</div>}

      <section className="card relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sand/60 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-iris/10"><Flag className="text-iris" /></div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl font-bold">Opportunities <Kn className="text-base font-normal text-mute">ಅವಕಾಶಗಳು</Kn></h1>
              <p className="mt-1 max-w-2xl text-sm text-mute">
                Fests and competitions beyond campus, like the <b className="text-fg">VTU Youth Festival</b>. Raise your hand for the events you&apos;d like to try. SVM core picks and trains the team, and every win goes into the club&apos;s trophy cabinet.
              </p>
            </div>
          </div>
          {data.core && <Button className="self-start" onClick={() => setEditing("new")}><Plus size={15} /> Post opportunity</Button>}
        </div>
      </section>

      {open.length === 0 && past.length === 0 && (
        <Card className="py-10 text-center text-sm text-mute">No opportunities yet. {data.core ? "Post the first one." : "Check back soon."}</Card>
      )}
      {open.map((o, i) => <OpportunityCard key={o.id} o={o} i={i} core={data.core} onChange={replace} onEdit={() => setEditing(o)} onDeleted={load} />)}

      {past.length > 0 && (
        <section>
          <SectionHead title="Past" sub="Closed opportunities" />
          <div className="space-y-3 opacity-80">
            {past.map((o, i) => <OpportunityCard key={o.id} o={o} i={i} core={data.core} onChange={replace} onEdit={() => setEditing(o)} onDeleted={load} />)}
          </div>
        </section>
      )}

      <p className="text-center text-xs text-mute">Won something? Ask SVM core to add it to the <Link href="/club" className="font-semibold text-iris hover:underline">trophy cabinet</Link>, and your profile gets the “Represented SVM” badge.</p>

      {editing && <OpportunityForm initial={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function Countdown({ o }: { o: Opportunity }) {
  const d = daysUntil(o.deadline);
  if (o.deadline && d !== null) {
    if (d < 0) return <Badge color="#8a6f58">Registration closed</Badge>;
    return <Badge color={d <= 7 ? "#8b3a3a" : "#4f7b5f"}>Register by {fmtDate(o.deadline, false)} · {d === 0 ? "today" : `${d} day${d === 1 ? "" : "s"} left`}</Badge>;
  }
  if (!o.startsOn) return <Badge color="#a87a26">Dates to be announced</Badge>;
  return null;
}

function OpportunityCard({ o, i, core, onChange, onEdit, onDeleted }: {
  o: Opportunity; i: number; core: boolean; onChange: (o: Opportunity) => void; onEdit: () => void; onDeleted: () => void;
}) {
  const { profile, toast } = useStore();
  const [busy, setBusy] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [people, setPeople] = useState<Interested[] | null>(null);
  const fits = o.categories.filter((c) => isGoodFit(profile, c.discipline));
  const groups = DISCIPLINES.map((d) => ({ d, cats: o.categories.filter((c) => c.discipline === d.id) })).filter((g) => g.cats.length);

  const toggle = async (category: string, on: boolean) => {
    setBusy(category);
    const res = await fetch(`/api/opportunities/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, on }) });
    const d = await res.json();
    setBusy(null);
    if (!res.ok) return toast(d.error ?? "Couldn't update", "error");
    onChange(d.opportunity);
    if (on) toast("Hand raised! SVM core can see you're interested 🙌", "good");
  };

  const showPeople = async () => {
    if (people) return setPeople(null);
    const d = await fetch(`/api/opportunities/${o.id}`).then((r) => r.json());
    setPeople(d.people ?? []);
  };

  const remove = async () => {
    if (!confirm(`Delete “${o.title}”? Everyone's interest in it is removed too.`)) return;
    const res = await fetch(`/api/opportunities/${o.id}`, { method: "DELETE" });
    if (res.ok) { toast("Opportunity deleted", "info"); onDeleted(); } else toast("Couldn't delete", "error");
  };

  const Chip = ({ c }: { c: OpportunityCategory & { interested: number } }) => {
    const on = o.mine.includes(c.id);
    return (
      <button disabled={busy === c.id} onClick={() => toggle(c.id, !on)}
        className={cx("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:opacity-50", on ? "border-iris bg-iris text-white" : "border-line bg-white hover:border-iris/50")}>
        {on ? <Check size={12} /> : <DiscIcon id={c.discipline} size={12} />} {c.name}{c.team && <span className={on ? "text-white/70" : "text-mute"}>· team</span>}
        {c.interested > 0 && <span className={cx("rounded-full px-1.5 text-[10px]", on ? "bg-white/25" : "bg-fg/10")}>{c.interested}</span>}
      </button>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-1.5">
            <Badge color="#5c3a21">{LEVEL_LABEL[o.level]}</Badge>
            <Badge>{OPP_KINDS.find((k) => k.id === o.kind)?.label}</Badge>
            <Countdown o={o} />
          </div>
          <h2 className="mt-2 font-display text-2xl font-bold">{o.title}</h2>
          {o.organiser && <div className="text-sm text-mute">{o.organiser}</div>}
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-mute">
            {o.startsOn && <span className="flex items-center gap-1"><CalendarDays size={12} /> {fmtDate(o.startsOn)}{o.endsOn && o.endsOn !== o.startsOn ? ` – ${fmtDate(o.endsOn)}` : ""}</span>}
            {o.location && <span className="flex items-center gap-1"><MapPin size={12} /> {o.location}</span>}
            <span className="flex items-center gap-1"><Users size={12} /> {o.interested} interested{o.friendsInterested ? ` · ${o.friendsInterested} friend${o.friendsInterested === 1 ? "" : "s"}` : ""}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {o.link && <a href={o.link} target="_blank" rel="noreferrer"><Button size="sm" variant="soft"><ExternalLink size={13} /> Official details</Button></a>}
          {core && <Button size="sm" variant="soft" onClick={onEdit} aria-label="Edit"><Pencil size={13} /></Button>}
          {core && <Button size="sm" variant="ghost" onClick={remove} aria-label="Delete"><Trash2 size={13} /></Button>}
        </div>
      </div>

      {o.description && (
        <p className={cx("mt-3 whitespace-pre-line text-sm leading-relaxed text-fg/85", !more && "line-clamp-3")} onClick={() => setMore(!more)}>{o.description}</p>
      )}

      {fits.length > 0 && (
        <div className="mt-4 rounded-2xl border border-gold/40 bg-sand/20 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-gold"><Sparkles size={13} /> Good fit for you, based on your Creative DNA and art forms</div>
          <div className="flex flex-wrap gap-1.5">{fits.map((c) => <Chip key={c.id} c={c} />)}</div>
        </div>
      )}

      {o.categories.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-mute">All events · tap to raise your hand</div>
          {groups.map(({ d, cats }) => (
            <div key={d.id}>
              <div className="mb-1.5 text-xs font-semibold" style={{ color: d.color }}>{d.name}</div>
              <div className="flex flex-wrap gap-1.5">{cats.map((c) => <Chip key={c.id} c={c} />)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4">
          <Button size="sm" variant={o.mine.includes("") ? "soft" : "primary"} disabled={busy === ""} onClick={() => toggle("", !o.mine.includes(""))}>
            {o.mine.includes("") ? <><Check size={14} /> You&apos;re interested</> : <><Flag size={14} /> I&apos;m interested</>}
          </Button>
        </div>
      )}

      {core && o.interested > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <button onClick={showPeople} className="text-sm font-semibold text-iris hover:underline">{people ? "Hide" : "See"} who&apos;s interested ({o.interested})</button>
          {people && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {people.map((p) => (
                <Link key={p.id} href={`/u/${p.id}`} className="flex items-start gap-2.5 rounded-xl border border-line bg-white p-2.5 hover:border-iris/40">
                  <Avatar name={p.name} src={p.avatar} size={32} hue={p.name.length * 37} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{p.name} <span className="font-normal text-mute">· {p.dept} {p.year} yr</span></div>
                    <div className="text-xs text-mute">{p.categories.join(", ")}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const field = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || `cat-${Date.now()}`;

function OpportunityForm({ initial, onClose, onSaved }: { initial: Opportunity | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useStore();
  const [f, setF] = useState({
    title: initial?.title ?? "", organiser: initial?.organiser ?? "", level: initial?.level ?? "university", kind: initial?.kind ?? "fest",
    location: initial?.location ?? "", startsOn: initial?.startsOn ?? "", endsOn: initial?.endsOn ?? "", deadline: initial?.deadline ?? "",
    link: initial?.link ?? "", description: initial?.description ?? "",
  });
  const [cats, setCats] = useState<OpportunityCategory[]>(initial?.categories.map(({ id, name, discipline, team }) => ({ id, name, discipline, team })) ?? []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    const body = { ...f, categories: cats.filter((c) => c.name.trim()).map((c) => ({ ...c, id: c.id || slug(c.name) })) };
    const res = await fetch(initial ? `/api/opportunities/${initial.id}` : "/api/opportunities", {
      method: initial ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return toast(d.error ?? "Couldn't save", "error");
    toast(initial ? "Opportunity updated" : "Opportunity posted 🎉", "good");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-fg/40 p-4" onClick={onClose}>
      <div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl bg-night p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">{initial ? "Edit opportunity" : "Post an opportunity"}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-mute hover:bg-fg/5" aria-label="Close"><X size={18} /></button>
        </div>
        <div className="grid gap-3">
          <label className="text-sm">Title<input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="e.g. VTU Youth Festival 2026" /></label>
          <label className="text-sm">Organiser<input className={field} value={f.organiser} onChange={(e) => setF({ ...f, organiser: e.target.value })} placeholder="e.g. Visvesvaraya Technological University" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">Level<select className={field} value={f.level} onChange={(e) => setF({ ...f, level: e.target.value as Opportunity["level"] })}>{LEVELS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></label>
            <label className="text-sm">Type<select className={field} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as Opportunity["kind"] })}>{OPP_KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select></label>
            <label className="text-sm">Starts<input type="date" className={field} value={f.startsOn} onChange={(e) => setF({ ...f, startsOn: e.target.value })} /></label>
            <label className="text-sm">Ends<input type="date" className={field} value={f.endsOn} onChange={(e) => setF({ ...f, endsOn: e.target.value })} /></label>
            <label className="text-sm">Register with SVM by<input type="date" className={field} value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
            <label className="text-sm">Location<input className={field} value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="Host college / city" /></label>
          </div>
          <label className="text-sm">Official link<input className={field} value={f.link} onChange={(e) => setF({ ...f, link: e.target.value })} placeholder="https://… (circular, rules, registration)" /></label>
          <label className="text-sm">Details<textarea rows={4} className={`${field} resize-none`} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} placeholder="Rules, eligibility, how SVM will pick the team…" /></label>

          <div className="text-sm">
            Events / categories <span className="text-mute">(members raise their hand per event)</span>
            <div className="mt-2 space-y-2">
              {cats.map((c, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input className={`${field} flex-1`} value={c.name} onChange={(e) => setCats(cats.map((x, k) => (k === idx ? { ...x, name: e.target.value } : x)))} placeholder="e.g. Folk Dance" />
                  <select className={`${field} w-36`} value={c.discipline} onChange={(e) => setCats(cats.map((x, k) => (k === idx ? { ...x, discipline: e.target.value as DisciplineId } : x)))}>
                    {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-mute"><input type="checkbox" checked={c.team} onChange={(e) => setCats(cats.map((x, k) => (k === idx ? { ...x, team: e.target.checked } : x)))} /> team</label>
                  <button onClick={() => setCats(cats.filter((_, k) => k !== idx))} className="p-1 text-mute hover:text-magenta" aria-label="Remove event"><X size={15} /></button>
                </div>
              ))}
              <button onClick={() => setCats([...cats, { id: "", name: "", discipline: "vocal", team: false }])} className="rounded-full border border-dashed border-line px-3 py-1.5 text-xs text-mute hover:text-fg">+ Add event</button>
            </div>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy || f.title.trim().length < 3}>{busy ? "Saving…" : initial ? "Save changes" : "Post"}</Button>
        </div>
      </div>
    </div>
  );
}
