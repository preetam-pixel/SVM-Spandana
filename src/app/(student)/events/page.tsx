"use client";

import { CalendarDays, CalendarPlus, ExternalLink, Info, Mail, Megaphone, Pin, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { EventCard } from "@/components/EventCard";
import { Badge, Button, Card, Kn, SectionHead, Shimmer, cx } from "@/components/ui";
import { fmtEventDate, isPast } from "@/lib/club";
import { del, eventAction, postJSON } from "@/lib/events-client";
import { useStore } from "@/lib/store";
import type { Announcement, ClubEvent } from "@/lib/types";

type Tab = "upcoming" | "mine" | "past";
interface Data { core: boolean; events: ClubEvent[]; announcements: Announcement[]; setup?: string }

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";

export default function EventsPage() {
  const { toast } = useStore();
  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [noticeOpen, setNoticeOpen] = useState(false);

  const load = useCallback(() => {
    fetch("/api/events")
      .then((r) => r.json())
      .then((d) => setData(d.events ? d : { core: false, events: [], announcements: [], setup: d.error }))
      .catch(() => setData({ core: false, events: [], announcements: [] }));
  }, []);
  useEffect(load, [load]);

  const events = data?.events ?? [];
  const upcoming = events.filter((e) => !isPast(e) && !e.cancelled);
  const mine = events.filter((e) => e.mine).sort((a, b) => b.startsAt - a.startsAt);
  const past = events.filter((e) => isPast(e) || e.cancelled).sort((a, b) => b.startsAt - a.startsAt);
  const invites = upcoming.filter((e) => e.invite?.status === "pending" && !e.mine);
  const shown = tab === "upcoming" ? upcoming : tab === "mine" ? mine : past;

  const respond = async (e: ClubEvent, accept: boolean) => {
    const err = await eventAction(e.id, { action: "respond", accept });
    if (err) return toast(err, "error");
    toast(accept ? `You're in for ${e.title} 🎉` : "Invite declined", accept ? "good" : "info");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sand/50 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-iris/10"><CalendarDays className="text-iris" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold">Events <Kn className="text-lg font-normal text-mute">ಕಾರ್ಯಕ್ರಮಗಳು</Kn></h1>
              <p className="mt-1 max-w-xl text-sm text-mute">What SVM is running next. Sign up to perform, help backstage or just come and cheer. Check in at the venue and it&apos;s verified on your Passport.</p>
            </div>
          </div>
          {data?.core && (
            <div className="flex flex-wrap gap-2">
              <Link href="/core/events/new"><Button variant="core"><CalendarPlus size={16} /> Post an event</Button></Link>
              <Button variant="core" onClick={() => setNoticeOpen((v) => !v)}><Megaphone size={16} /> Post a notice</Button>
            </div>
          )}
        </div>
      </div>

      {data?.setup && (
        <div className="flex items-start gap-2 rounded-2xl border border-gold/40 bg-sand/20 p-3 text-sm">
          <Info size={16} className="mt-0.5 shrink-0 text-gold" />
          <span>Events aren&apos;t switched on yet. <span className="text-mute">(Organisers: {data.setup})</span></span>
        </div>
      )}

      {noticeOpen && <NoticeForm onDone={() => { setNoticeOpen(false); load(); }} />}

      {invites.length > 0 && (
        <section>
          <SectionHead title="You're invited" sub="SVM thinks you'd be great at these" />
          <div className="grid gap-3 md:grid-cols-2">
            {invites.map((e) => {
              const role = e.roles.find((r) => r.id === e.invite!.roleId);
              return (
                <div key={e.id} className="card flex flex-col gap-3 border-gold/40 bg-sand/10 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold/15"><Mail size={18} className="text-gold" /></div>
                    <div className="min-w-0">
                      <Link href={`/events/${e.id}`} className="font-semibold hover:underline">{e.title}</Link>
                      <div className="text-xs text-mute">As <b className="text-fg">{role?.label ?? "Audience"}</b> · {fmtEventDate(e.startsAt)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 self-end sm:self-auto">
                    <Button size="sm" onClick={() => respond(e, true)}>Accept</Button>
                    <Button size="sm" variant="ghost" onClick={() => respond(e, false)}>Not now</Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data && data.announcements.length > 0 && (
        <section>
          <SectionHead title="Notice board" sub="From the SVM core team" />
          <div className="grid gap-3 md:grid-cols-2">
            {data.announcements.map((a) => (
              <NoticeCard key={a.id} a={a} core={data.core} onDeleted={load} />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="mb-4 flex flex-wrap gap-2">
          {([["upcoming", "Upcoming", upcoming.length], ["mine", "My events", mine.length], ["past", "Past", past.length]] as const).map(([id, label, n]) => (
            <button key={id} onClick={() => setTab(id)} className={cx("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition", tab === id ? "border-iris bg-iris text-white" : "border-line bg-white text-mute hover:text-fg")}>
              {label} {n > 0 && <span className={cx("rounded-full px-1.5 text-[11px] font-bold", tab === id ? "bg-white/25" : "bg-fg/10")}>{n}</span>}
            </button>
          ))}
        </div>
        {!data ? (
          <Card><Shimmer lines={4} /></Card>
        ) : shown.length === 0 ? (
          <Card className="py-10 text-center">
            <CalendarDays className="mx-auto text-mute" size={32} />
            <p className="mt-3 text-sm text-mute">
              {tab === "upcoming" ? "No upcoming events yet. Check back soon!" : tab === "mine" ? "You haven't signed up for anything yet. Pick an upcoming event and join in any role." : "No past events in the last two months."}
            </p>
            {tab === "upcoming" && data.core && <Link href="/core/events/new" className="mt-4 inline-block"><Button size="sm" variant="core"><CalendarPlus size={14} /> Post the first one</Button></Link>}
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {shown.map((e) => <EventCard key={e.id} e={e} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function NoticeCard({ a, core, onDeleted }: { a: Announcement; core: boolean; onDeleted: () => void }) {
  const { toast } = useStore();
  const remove = async () => {
    if (!confirm("Remove this notice?")) return;
    const err = await del(`/api/announcements?id=${a.id}`);
    if (err) return toast(err, "error");
    toast("Notice removed", "info");
    onDeleted();
  };
  return (
    <div className={cx("card p-4", a.pinned && "border-gold/40")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 font-semibold">{a.pinned ? <Pin size={14} className="shrink-0 text-gold" /> : <Megaphone size={14} className="shrink-0 text-iris" />} {a.title}</div>
        {core && <button onClick={remove} className="shrink-0 p-1 text-mute hover:text-magenta" aria-label="Remove notice"><Trash2 size={14} /></button>}
      </div>
      {a.body && <p className="mt-1.5 whitespace-pre-line text-sm text-fg/80">{a.body}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-mute">
        <span>{a.by} · {new Date(a.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
        {a.pinned && <Badge color="#a87a26">Pinned</Badge>}
        {a.link && <a href={a.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-semibold text-iris hover:underline">Open link <ExternalLink size={11} /></a>}
      </div>
    </div>
  );
}

function NoticeForm({ onDone }: { onDone: () => void }) {
  const { toast } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const err = await postJSON("/api/announcements", { title, body, link, pinned });
    setBusy(false);
    if (err) return toast(err, "error");
    toast("Notice posted 📣");
    onDone();
  };
  return (
    <Card>
      <SectionHead title="Post a notice" sub="Auditions, meetings, results, reminders" />
      <div className="grid gap-3">
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Title, e.g. Auditions for Kalotsava this Friday" />
        <textarea className={input} value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} rows={3} placeholder="Details (optional)" />
        <input className={input} value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (optional): form, WhatsApp group, results…" />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} /> Pin to the top</label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
          <Button onClick={submit} disabled={busy || title.trim().length < 3}>{busy ? "Posting…" : "Post notice"}</Button>
        </div>
      </div>
    </Card>
  );
}
