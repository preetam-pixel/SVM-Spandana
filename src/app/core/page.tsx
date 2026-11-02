"use client";

import {
  AlertTriangle, ArrowRight, BarChart3, CalendarDays, CalendarPlus, CheckCircle2, Flag, Info, KeyRound, Medal,
  ShieldCheck, Sparkles, Trophy, UserPlus, Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Avatar, Badge, Button, Card, DiscIcon, SectionHead, Shimmer, cx } from "@/components/ui";
import { daysUntil, fmtDate } from "@/lib/opportunities";
import type { CoreDashboard } from "@/lib/types";

const tooltipStyle = { background: "#fffbf4", border: "1px solid rgba(92,58,33,0.12)", borderRadius: 12, fontSize: 12 };

const when = (ms: number) =>
  new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function ago(ms: number) {
  const d = Math.floor((Date.now() - ms) / 86_400_000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return d < 30 ? `${d} days ago` : new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/** Live dashboard for SVM coordinators and core members: real members, events, check-ins and fest interest. */
export default function CoreDashboardPage() {
  const [data, setData] = useState<CoreDashboard | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    fetch("/api/core")
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) setError({ status: r.status, message: d.error ?? "Couldn't load the dashboard" });
        else setData(d);
      })
      .catch(() => setError({ status: 0, message: "Couldn't reach the server. Check your connection." }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-mute">Live numbers for SVM: members, events, check-ins and fest interest.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge color="#4f7b5f"><span className="h-1.5 w-1.5 rounded-full bg-aqua" /> Live data</Badge>
          <Link href="/core/events/new"><Button size="sm" variant="core"><CalendarPlus size={14} /> Post event</Button></Link>
        </div>
      </div>
      {error ? <Blocked {...error} /> : !data ? <Loading /> : <Dashboard d={data} />}
    </div>
  );
}

function Blocked({ status, message }: { status: number; message: string }) {
  return (
    <Card className="mx-auto max-w-md text-center">
      <ShieldCheck className="mx-auto text-gold" size={32} />
      <h1 className="mt-3 font-display text-xl font-semibold">{status === 403 ? "Core members only" : status === 401 ? "Please log in" : "Something went wrong"}</h1>
      <p className="mt-2 text-sm text-mute">{message}</p>
      <Link href={status === 401 ? "/login" : "/home"} className="mt-4 inline-flex items-center gap-1 rounded-full grad-bg px-4 py-2 text-sm font-semibold">
        {status === 401 ? "Log in" : "Back to Spandana"} <ArrowRight size={14} />
      </Link>
    </Card>
  );
}

function Loading() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }, (_, i) => <Card key={i}><Shimmer lines={2} /></Card>)}
    </div>
  );
}

function Dashboard({ d }: { d: CoreDashboard }) {
  const k = d.kpis;
  const tiles = [
    { label: "Members", value: k.members, sub: k.newThisWeek ? `+${k.newThisWeek} this week` : "No new members this week", icon: Users, color: "#5c3a21" },
    { label: "Took the Creative Spark", value: `${k.sparkPct}%`, sub: "of members", icon: Sparkles, color: "#a87a26" },
    { label: "Upcoming events", value: k.upcomingEvents, sub: `${k.upcomingSignups} sign-ups so far`, icon: CalendarDays, color: "#8b3a3a" },
    { label: "Check-in rate", value: k.checkinRate === null ? "–" : `${k.checkinRate}%`, sub: "at recent events", icon: CheckCircle2, color: "#4f7b5f" },
    { label: "Raised a hand for fests", value: k.handsRaised, sub: "members", icon: Flag, color: "#b5651d" },
    { label: "Trophies", value: k.trophies, sub: "in the cabinet", icon: Trophy, color: "#a87a26" },
    { label: "Core team", value: k.core, sub: "on Spandana", icon: ShieldCheck, color: "#5c3a21" },
    { label: "Art forms loved", value: d.artForms.filter((a) => a.members > 0).length, sub: `of ${d.artForms.length}`, icon: BarChart3, color: "#8b3a3a" },
  ];

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-4">
            <div className="flex items-start justify-between gap-2 text-xs text-mute">{t.label}<t.icon size={16} style={{ color: t.color }} /></div>
            <div className="mt-1 font-display text-3xl font-semibold">{t.value}</div>
            <div className="text-xs text-mute">{t.sub}</div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <Card>
          <SectionHead title="Needs your attention" sub="What to do next, worked out from live data" />
          {d.attention.length === 0 ? (
            <p className="text-sm text-mute">All clear. Nothing urgent right now.</p>
          ) : (
            <ul className="space-y-2">
              {d.attention.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className={cx("group flex items-start gap-3 rounded-xl border p-3 text-sm transition hover:bg-fg/5", a.tone === "urgent" ? "border-magenta/30 bg-magenta/5" : "border-line")}>
                    {a.tone === "urgent" ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-magenta" /> : <Info size={16} className="mt-0.5 shrink-0 text-gold" />}
                    <span className="flex-1">{a.text}</span>
                    <ArrowRight size={14} className="mt-0.5 shrink-0 text-mute transition group-hover:translate-x-0.5" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHead title="Upcoming events" sub="Role slots filled and the venue check-in code" right={<Link href="/events" className="text-xs font-semibold text-iris">All events →</Link>} />
          {d.upcoming.length === 0 ? (
            <p className="text-sm text-mute">Nothing scheduled. <Link href="/events" className="font-semibold text-iris">Post an event</Link> to open a call for roles.</p>
          ) : (
            <ul className="space-y-3">
              {d.upcoming.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="block rounded-xl border border-line p-3 transition hover:bg-fg/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-semibold"><DiscIcon id={e.discipline} size={15} /> <span className="truncate">{e.title}</span></div>
                        <div className="mt-0.5 text-xs text-mute">{when(e.startsAt)}{e.venue && ` · ${e.venue}`} · {e.going} going</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-mute"><KeyRound size={11} /> Check-in</div>
                        <div className="font-mono text-lg font-bold tracking-[0.2em] text-iris">{e.checkinCode}</div>
                      </div>
                    </div>
                    {e.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {e.roles.map((r) => {
                          const full = r.slots > 0 && r.filled >= r.slots;
                          return (
                            <span key={r.label} className={cx("rounded-full border px-2 py-0.5 text-[11px]", full ? "border-aqua/40 bg-aqua/10 text-aqua" : "border-line text-mute")}>
                              {r.label} {r.filled}{r.slots > 0 && `/${r.slots}`}
                            </span>
                          );
                        })}
                        {e.openSlots > 0 && <span className="rounded-full bg-magenta/10 px-2 py-0.5 text-[11px] font-semibold text-magenta">{e.openSlots} open</span>}
                      </div>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <FestTeams fests={d.fests} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card>
          <SectionHead title="Members by branch" />
          {d.branches.length === 0 ? <p className="text-sm text-mute">No members yet.</p> : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.branches} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(92,58,33,0.08)" vertical={false} />
                  <XAxis dataKey="dept" tick={{ fontSize: 11, fill: "#8a6f58" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#8a6f58" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(92,58,33,0.05)" }} />
                  <Bar dataKey="members" name="Members" fill="#8b3a3a" radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card>
          <SectionHead title="Art forms members love" />
          <ul className="space-y-2">
            {d.artForms.map((a) => {
              const max = Math.max(1, ...d.artForms.map((x) => x.members));
              return (
                <li key={a.id} className="flex items-center gap-2 text-xs">
                  <DiscIcon id={a.id} size={14} />
                  <span className="w-32 shrink-0 truncate">{a.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-fg/5"><span className="block h-full rounded-full" style={{ width: `${(a.members / max) * 100}%`, background: a.color }} /></span>
                  <span className="w-5 text-right font-semibold">{a.members}</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <SectionHead title="Check-ins at recent events" />
          {d.past.length === 0 ? <p className="text-sm text-mute">No events in the last 60 days.</p> : (
            <ul className="space-y-3">
              {d.past.map((e) => (
                <li key={e.id}>
                  <Link href={`/events/${e.id}`} className="block text-xs hover:opacity-80">
                    <div className="flex justify-between gap-2"><span className="truncate font-semibold">{e.title}</span><span className="shrink-0 text-mute">{e.attended}/{e.signedUp} checked in</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-fg/5"><div className="h-full rounded-full bg-aqua" style={{ width: `${e.signedUp ? (e.attended / e.signedUp) * 100 : 0}%` }} /></div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <SectionHead title="New members" sub="Say hello and invite them to a first event" right={<Link href="/people" className="text-xs font-semibold text-iris">People →</Link>} />
          {d.newMembers.length === 0 ? <p className="text-sm text-mute">No one has registered yet.</p> : (
            <ul className="divide-y divide-line">
              {d.newMembers.map((m) => (
                <li key={m.id}>
                  <Link href={`/u/${m.id}`} className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <Avatar name={m.name} src={m.avatar || undefined} size={34} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{m.name}</div>
                      <div className="text-xs text-mute">{m.dept} · {m.year} yr · joined {ago(m.createdAt)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {m.declared.slice(0, 3).map((x) => <DiscIcon key={x} id={x} size={14} />)}
                      {m.sparkDone ? <Badge color="#4f7b5f">Spark done</Badge> : <Badge color="#8a6f58">No Spark yet</Badge>}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <SectionHead title="Core team" sub="Members with organiser access" right={<Link href="/team" className="text-xs font-semibold text-iris">SVM Team →</Link>} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {d.team.map((m) => (
              <li key={m.id}>
                <Link href={`/u/${m.id}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5 hover:bg-fg/5">
                  <Avatar name={m.name} src={m.avatar || undefined} size={32} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{m.name}</div>
                    <div className="text-xs text-mute">{m.dept} · {m.year} yr</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-start gap-2 text-xs text-mute"><UserPlus size={14} className="mt-0.5 shrink-0" /> Core access is given in the database (profiles.role = &quot;core&quot;).</p>
        </Card>
      </div>
    </>
  );
}

function FestTeams({ fests }: { fests: CoreDashboard["fests"] }) {
  if (!fests.length) return null;
  return (
    <Card>
      <SectionHead title="Fest team builder" sub="Who raised a hand for each event, so you can pick and train the team" right={<Link href="/opportunities" className="text-xs font-semibold text-iris">Opportunities →</Link>} />
      <div className="space-y-5">
        {fests.map((f) => {
          const withPeople = f.categories.filter((c) => c.people.length > 0);
          const empty = f.categories.filter((c) => c.people.length === 0);
          const d = daysUntil(f.deadline);
          return (
            <div key={f.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-center gap-2 font-display text-lg font-semibold"><Medal size={18} className="text-gold" /> {f.title}</div>
                <div className="text-xs text-mute">
                  {f.people} {f.people === 1 ? "member" : "members"} interested ·{" "}
                  {d !== null ? <span className={d <= 7 ? "font-semibold text-magenta" : ""}>register by {fmtDate(f.deadline, false)} ({d} days)</span> : f.startsOn ? `starts ${fmtDate(f.startsOn, false)}` : "dates to be announced"}
                </div>
              </div>
              {withPeople.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {withPeople.map((c) => (
                    <div key={c.id} className="rounded-xl border border-line p-3">
                      <div className="flex items-center justify-between gap-2 text-sm font-semibold">
                        <span className="flex min-w-0 items-center gap-1.5"><DiscIcon id={c.discipline} size={14} /> <span className="truncate">{c.name}</span></span>
                        <span className="shrink-0 rounded-full bg-fg/5 px-2 text-xs">{c.people.length}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.people.map((p) => <Link key={p.id} href={`/u/${p.id}`} className="rounded-full bg-panel2 px-2 py-0.5 text-[11px] hover:bg-sand/40">{p.name}</Link>)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-mute">No one has raised a hand yet. Share it on the notice board.</p>
              )}
              {empty.length > 0 && (
                <p className="mt-2 text-xs text-mute">
                  <span className="font-semibold text-magenta">{empty.length} events need people:</span> {empty.map((c) => c.name).join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
