"use client";

import {
  ArrowLeft, Ban, Check, ClipboardCheck, Clock, Copy, Download, KeyRound, MapPin, MessageCircle, Pencil, Search, Send,
  ShieldCheck, Sparkles, Star, Trash2, UserCheck, Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { EventStatus } from "@/components/EventCard";
import { RecognizeDialog } from "@/components/RecognizeDialog";
import { Avatar, Badge, Button, Card, DiscIcon, SectionHead, Shimmer, cx } from "@/components/ui";
import { AUDIENCE, KIND_LABEL, LEVEL_LABEL, fmtEventDate, isPast, recognitionEmoji, relativeDay, whatsappText } from "@/lib/club";
import { DISC_MAP, LADDER } from "@/lib/data";
import { del, eventAction, patchJSON } from "@/lib/events-client";
import { useStore } from "@/lib/store";
import type { EventDetail, EventPerson, RoleFill, Suggestion } from "@/lib/types";

const input = "w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-iris/60";

export default function EventPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useStore();
  const [d, setD] = useState<EventDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetch(`/api/events/${id}`)
      .then(async (r) => ({ ok: r.ok, d: await r.json() }))
      .then(({ ok, d }) => (ok ? setD(d) : setError(d.error ?? "Event not found")))
      .catch(() => setError("Couldn't load this event"));
  }, [id]);
  useEffect(load, [load]);

  const act = async (body: Record<string, unknown>, done?: string) => {
    const err = await eventAction(id, body);
    if (err) {
      toast(err, "error");
      return false;
    }
    if (done) toast(done);
    load();
    return true;
  };

  if (error) return <div className="space-y-4"><Back /><div className="card p-8 text-center text-mute">{error}</div></div>;
  if (!d) return <div className="space-y-4"><Back /><Card><Shimmer lines={8} /></Card></div>;

  const e = d.event;
  const disc = DISC_MAP[e.discipline];
  const past = isPast(e);
  const rel = relativeDay(e.startsAt);
  const roleOf = (rid: string) => e.roles.find((r) => r.id === rid) ?? e.roles[0];

  return (
    <div className="space-y-6">
      <Back />
      <section className="card overflow-hidden p-0">
        {e.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.poster} alt="" className="max-h-80 w-full object-cover" />
        ) : (
          <div className="grid h-28 place-items-center" style={{ background: `linear-gradient(120deg, ${disc.color}33, #f3e9d8 55%, ${disc.color}22)` }}>
            <DiscIcon id={disc.id} size={40} />
          </div>
        )}
        <div className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={disc.color}><DiscIcon id={disc.id} size={11} /> {disc.name}</Badge>
            <Badge>{KIND_LABEL[e.kind]}</Badge>
            <Badge color="#4f7b5f">{LEVEL_LABEL[e.level]}</Badge>
            <EventStatus e={e} />
            {past && !e.cancelled && <Badge>Ended</Badge>}
          </div>
          <h1 className={cx("mt-2 font-display text-2xl font-bold sm:text-3xl", e.cancelled && "line-through")}>{e.title}</h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-mute">
            <span className="flex items-center gap-1.5"><Clock size={14} /> {fmtEventDate(e.startsAt, { long: true })}{rel && !past ? ` (${rel})` : ""} · {e.durationMin} min</span>
            {e.venue && <span className="flex items-center gap-1.5"><MapPin size={14} /> {e.venue}</span>}
          </div>
          <div className="mt-1 text-xs text-mute">Posted by {e.host}</div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {e.description && (
            <Card>
              <SectionHead title="About" />
              <p className="whitespace-pre-line text-sm leading-relaxed text-fg/85">{e.description}</p>
            </Card>
          )}
          <WhosComing d={d} />
          {d.core && <Organiser d={d} act={act} reload={load} />}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <JoinPanel d={d} act={act} roleOf={roleOf} />
          {d.canCheckIn && <CheckIn act={act} />}
          {!e.cancelled && !past && <Share d={d} />}
        </aside>
      </div>
    </div>
  );
}

function Back() {
  const router = useRouter();
  return <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-mute hover:text-fg"><ArrowLeft size={15} /> Back</button>;
}

type Act = (body: Record<string, unknown>, done?: string) => Promise<boolean>;

function JoinPanel({ d, act, roleOf }: { d: EventDetail; act: Act; roleOf: (id: string) => RoleFill }) {
  const e = d.event;
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [changing, setChanging] = useState(false);
  const closed = e.cancelled || isPast(e);

  if (e.cancelled) return <Card className="text-center text-sm text-mute"><Ban className="mx-auto mb-2 text-magenta" /> This event was cancelled.</Card>;

  const mineRole = e.mine ? roleOf(e.mine.roleId) : null;
  if (e.mine && !changing)
    return (
      <Card className="border-aqua/40">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-aqua/15"><UserCheck className="text-aqua" size={20} /></div>
          <div>
            <div className="font-display text-lg font-semibold">{e.mine.attended ? "You were there! ✨" : "You're in!"}</div>
            <div className="text-sm text-mute">As {mineRole?.id === AUDIENCE.id ? "audience" : mineRole?.label}{e.mine.attended ? " · attendance verified" : ""}</div>
          </div>
        </div>
        {!closed && !e.mine.attended && (
          <div className="mt-4 flex gap-2">
            <Button size="sm" variant="soft" onClick={() => { setChanging(true); setPick(e.mine!.roleId); }}>Change role</Button>
            <Button size="sm" variant="ghost" onClick={() => confirm("Leave this event?") && act({ action: "leave" }, "You've left the event")}>Leave</Button>
          </div>
        )}
      </Card>
    );

  if (closed) return <Card className="text-center text-sm text-mute">This event has ended. {e.going} people took part.</Card>;

  const invited = e.invite?.status === "pending" ? roleOf(e.invite.roleId) : null;
  const chosen = pick ?? invited?.id ?? null;
  return (
    <Card>
      {invited && !changing && (
        <div className="mb-4 rounded-2xl border border-gold/40 bg-sand/15 p-3 text-sm">
          <b>SVM invited you</b> as <b>{invited.id === AUDIENCE.id ? "audience" : invited.label}</b>.
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => act({ action: "respond", accept: true }, "You're in! See you there 🎉")}>Accept</Button>
            <Button size="sm" variant="ghost" onClick={() => act({ action: "respond", accept: false }, "Invite declined")}>Not now</Button>
          </div>
        </div>
      )}
      <div className="font-display text-lg font-semibold">{changing ? "Pick a new role" : "Join in"}</div>
      <p className="text-xs text-mute">On stage, backstage or in the crowd. Every role counts.</p>
      <div className="mt-3 space-y-2">
        {e.roles.map((r) => {
          const full = r.slots > 0 && r.filled >= r.slots && e.mine?.roleId !== r.id;
          return (
            <button
              key={r.id} disabled={full} onClick={() => setPick(r.id)}
              className={cx("flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-2.5 text-left text-sm transition", chosen === r.id ? "border-iris bg-iris/5 ring-1 ring-iris" : "border-line bg-white hover:bg-fg/[0.03]", full && "opacity-50")}
            >
              <span>
                <span className="font-semibold">{r.id === AUDIENCE.id ? "Come and watch" : r.label}</span>
                <span className="ml-1.5 text-[11px] text-mute">{r.id === AUDIENCE.id ? "audience" : r.stage ? "on stage" : "backstage"}</span>
              </span>
              <span className={cx("shrink-0 text-xs", full ? "text-magenta" : "text-mute")}>{full ? "Full" : r.slots > 0 ? `${r.filled}/${r.slots}` : `${r.filled} going`}</span>
            </button>
          );
        })}
      </div>
      {chosen && chosen !== AUDIENCE.id && (
        <input className={cx(input, "mt-3")} value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={140} placeholder="Note for the organisers (optional), e.g. I play keyboard" />
      )}
      <div className="mt-3 flex gap-2">
        <Button className="flex-1" disabled={!chosen} onClick={async () => { if (await act({ action: "signup", roleId: chosen, note }, changing ? "Role updated" : "You're in! See you there 🎉")) setChanging(false); }}>
          {changing ? "Save" : "Sign up"}
        </Button>
        {changing && <Button variant="ghost" onClick={() => setChanging(false)}>Cancel</Button>}
      </div>
    </Card>
  );
}

function CheckIn({ act }: { act: Act }) {
  const [code, setCode] = useState("");
  return (
    <Card className="border-gold/40">
      <div className="flex items-center gap-2 font-display text-lg font-semibold"><KeyRound size={18} className="text-gold" /> Check in</div>
      <p className="text-xs text-mute">At the venue? Enter the 4-digit code the organisers show to verify your attendance.</p>
      <div className="mt-3 flex gap-2">
        <input className={cx(input, "text-center font-mono text-lg tracking-[0.4em]")} inputMode="numeric" maxLength={4} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="0000" aria-label="Check-in code" />
        <Button disabled={code.length !== 4} onClick={() => act({ action: "checkin", code }, "Checked in! Attendance verified ✅")}>Check in</Button>
      </div>
    </Card>
  );
}

function Share({ d }: { d: EventDetail }) {
  const { toast } = useStore();
  const url = typeof window !== "undefined" ? `${window.location.origin}/events/${d.event.id}` : "";
  const text = whatsappText(d.event, url);
  return (
    <Card>
      <div className="font-display font-semibold">Bring your friends</div>
      <p className="text-xs text-mute">Share in your class or hostel WhatsApp group.</p>
      <div className="mt-3 flex gap-2">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="flex-1"><Button size="sm" className="w-full"><MessageCircle size={14} /> WhatsApp</Button></a>
        <Button size="sm" variant="soft" onClick={() => navigator.clipboard?.writeText(text).then(() => toast("Copied invite text", "info"), () => toast("Couldn't copy", "error"))}><Copy size={14} /> Copy</Button>
      </div>
    </Card>
  );
}

function WhosComing({ d }: { d: EventDetail }) {
  const e = d.event;
  const byRole = e.roles.map((r) => ({ r, people: d.people.filter((p) => p.roleId === r.id) })).filter((g) => g.people.length || g.r.id !== AUDIENCE.id);
  return (
    <Card>
      <SectionHead title="Who's coming" sub={`${e.going} signed up${e.friendsGoing.length ? ` · ${e.friendsGoing.length} of your friends` : ""}`} />
      {e.going === 0 && <p className="mb-3 text-sm text-mute">Nobody yet. Be the first!</p>}
      <div className="space-y-4">
        {byRole.map(({ r, people }) => (
          <div key={r.id}>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-mute">
              <span>{r.id === AUDIENCE.id ? "Audience" : r.label} {r.id !== AUDIENCE.id && <span className="normal-case tracking-normal">· {r.stage ? "on stage" : "backstage"}</span>}</span>
              <span>{r.slots > 0 ? `${r.filled}/${r.slots}` : r.filled}</span>
            </div>
            {r.slots > 0 && <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-fg/10"><div className="h-full rounded-full grad-bg" style={{ width: `${Math.min(100, (r.filled / r.slots) * 100)}%` }} /></div>}
            <div className="flex flex-wrap gap-2">
              {people.map((p) => (
                <Link key={p.id} href={`/u/${p.id}`} className={cx("flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs hover:bg-fg/5", p.friend ? "border-gold/50 bg-sand/15" : "border-line bg-white")}>
                  <Avatar name={p.name} src={p.avatar} size={22} hue={p.name.length * 37} /> {p.name.split(" ")[0]}
                </Link>
              ))}
              {!people.length && r.id !== AUDIENCE.id && <span className="text-xs italic text-mute">Open: {r.slots > 0 ? `${r.slots} spots` : "join in"}</span>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------------- Organiser tools (core members) ---------------- */

function Organiser({ d, act, reload }: { d: EventDetail; act: Act; reload: () => void }) {
  const { toast } = useStore();
  const router = useRouter();
  const e = d.event;
  const [star, setStar] = useState<EventPerson | null>(null);
  const attendedCount = d.people.filter((p) => p.attended).length;
  const roleLabel = (rid: string) => (rid === AUDIENCE.id ? "Audience" : e.roles.find((r) => r.id === rid)?.label ?? "Audience");

  const csv = () => {
    const rows = [["Name", "Branch", "Year", "Role", "Note", "Attended"], ...d.people.map((p) => [p.name, p.dept, String(p.year), roleLabel(p.roleId), p.note ?? "", p.attended ? "yes" : "no"])];
    const blob = new Blob([rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${e.title.replace(/[^\w]+/g, "-")}-signups.csv`;
    a.click();
  };

  const cancel = async () => {
    if (!confirm(e.cancelled ? "Restore this event?" : "Cancel this event? Members who signed up will see it as cancelled.")) return;
    const err = await patchJSON(`/api/events/${e.id}`, { cancelled: !e.cancelled });
    if (err) return toast(err, "error");
    toast(e.cancelled ? "Event restored" : "Event cancelled", "info");
    reload();
  };
  const remove = async () => {
    if (!confirm("Delete this event permanently? Sign-ups and attendance will be lost.")) return;
    const err = await del(`/api/events/${e.id}`);
    if (err) return toast(err, "error");
    toast("Event deleted", "info");
    router.push("/events");
  };

  return (
    <div className="space-y-4 rounded-3xl border-2 border-fg/15 bg-fg/[0.03] p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl core-bg px-4 py-3">
        <div>
          <div className="font-display text-lg font-semibold">Organiser tools</div>
          <div className="text-xs text-sand/80">Check-in, attendance, stars and invites. Members never see this.</div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-sand/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-sand"><ShieldCheck size={11} /> Core only</span>
      </div>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHead title="Event controls" />
          <div className="flex flex-wrap gap-2">
            <Link href={`/core/events/new?id=${e.id}`}><Button size="sm" variant="soft"><Pencil size={14} /> Edit</Button></Link>
            <Button size="sm" variant="ghost" onClick={cancel}><Ban size={14} /> {e.cancelled ? "Restore" : "Cancel event"}</Button>
            <Button size="sm" variant="ghost" onClick={remove} aria-label="Delete event"><Trash2 size={14} /></Button>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-panel2/60 p-3 text-center">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-mute">Check-in code</div>
            <div className="font-mono text-3xl font-bold tracking-[0.3em] text-iris">{d.checkinCode}</div>
            <div className="text-[11px] text-mute">Show it at the venue</div>
          </div>
          <div className="rounded-2xl bg-panel2/60 p-3 text-center">
            <div className="font-display text-3xl font-bold">{e.going}</div>
            <div className="text-xs text-mute">signed up</div>
          </div>
          <div className="rounded-2xl bg-panel2/60 p-3 text-center">
            <div className="font-display text-3xl font-bold">{attendedCount}</div>
            <div className="text-xs text-mute">checked in</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHead
          title="Sign-up list"
          sub="Mark attendance and star the people who shone"
          right={d.people.length > 0 && <Button size="sm" variant="soft" onClick={csv}><Download size={14} /> CSV</Button>}
        />
        {d.people.length === 0 ? <p className="text-sm text-mute">No sign-ups yet. Use “Find people” below to invite members who'd fit.</p> : (
          <div className="divide-y divide-line">
            {d.people.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <Link href={`/u/${p.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                  <Avatar name={p.name} src={p.avatar} size={34} hue={p.name.length * 37} />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold hover:underline">{p.name} {p.star && <span title="Event star">⭐</span>}</div>
                    <div className="truncate text-xs text-mute">{p.dept} · Y{p.year} · <b className="text-fg/80">{roleLabel(p.roleId)}</b>{p.note ? ` · “${p.note}”` : ""}</div>
                  </div>
                </Link>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => act({ action: "attend", userId: p.id, attended: !p.attended })}
                    className={cx("flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold", p.attended ? "border-aqua/50 bg-aqua/10 text-aqua" : "border-line text-mute hover:text-fg")}
                  >
                    {p.attended ? <><Check size={12} /> Present</> : <><ClipboardCheck size={12} /> Mark present</>}
                  </button>
                  <button
                    onClick={() => (p.star ? confirm(`Remove ${p.name.split(" ")[0]}'s star?`) && act({ action: "unstar", userId: p.id }, "Star removed") : setStar(p))}
                    className={cx("rounded-full border p-1.5", p.star ? "border-gold/60 bg-sand/30 text-gold" : "border-line text-mute hover:text-gold")}
                    aria-label={p.star ? "Remove star" : "Star this member"} title={p.star ? "Remove star" : "Star of the event"}
                  >
                    <Star size={14} className={p.star ? "fill-current" : ""} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {!e.cancelled && !isPast(e) && <FindPeople d={d} act={act} />}

      <RecognizeDialog
        open={!!star} name={star?.name ?? ""} eventTitle={e.title} initialTitle={star && e.roles.find((r) => r.id === star.roleId)?.stage === false ? "Backstage Hero" : "Star Performer"}
        onClose={() => setStar(null)}
        onSubmit={async (title, message) => act({ action: "star", userId: star!.id, title, message }, `${recognitionEmoji(title)} ${star!.name.split(" ")[0]} is a star of ${e.title}!`)}
      />
    </div>
  );
}

function FindPeople({ d, act }: { d: EventDetail; act: Act }) {
  const e = d.event;
  const [list, setList] = useState<Suggestion[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [roleFor, setRoleFor] = useState<Record<string, string>>({});
  const open = e.roles.filter((r) => r.id === AUDIENCE.id || r.slots === 0 || r.filled < r.slots);
  const defaultRole = (open.find((r) => r.id !== AUDIENCE.id) ?? open[0] ?? e.roles[0]).id;

  const find = async () => {
    setLoading(true);
    const r = await fetch(`/api/events/${e.id}?suggest=1`).then((x) => x.json()).catch(() => ({}));
    setList(r.suggestions ?? []);
    setLoading(false);
  };
  const invite = async (s: Suggestion) => {
    if (await act({ action: "invite", userId: s.id, roleId: roleFor[s.id] ?? defaultRole }, `Invited ${s.name.split(" ")[0]} ✉️`)) setList((l) => l?.filter((x) => x.id !== s.id) ?? null);
  };

  return (
    <Card>
      <SectionHead
        title="Find people"
        sub="Members who'd suit this event, ranked by Creative DNA, free time and art forms they love"
        right={<Button size="sm" onClick={find} disabled={loading}><Search size={14} /> {list ? "Refresh" : loading ? "Finding…" : "Find"}</Button>}
      />
      {d.invites && d.invites.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          {d.invites.map((i) => (
            <span key={i.userId} className={cx("rounded-full border px-2.5 py-1 text-xs", i.status === "accepted" ? "border-aqua/40 bg-aqua/10 text-aqua" : i.status === "declined" ? "border-line text-mute line-through" : "border-gold/40 bg-sand/15")}>
              {i.name.split(" ")[0]} · {i.status === "pending" ? "invited" : i.status}
            </span>
          ))}
        </div>
      )}
      {!list ? (
        <p className="text-sm text-mute">{loading ? "Looking through members…" : "Tap Find to see who you could invite. They get the invite in their Events tab."}</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-mute">Everyone's already signed up or invited. 🎉</p>
      ) : (
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3">
              <Link href={`/u/${s.id}`} className="flex min-w-0 flex-1 items-center gap-2.5">
                <Avatar name={s.name} src={s.avatar} size={38} hue={s.name.length * 37} />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold hover:underline">{s.name} <span className="font-normal text-mute">· {s.dept} Y{s.year} · {LADDER[s.level]?.name}</span></div>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {s.reasons.length ? s.reasons.map((r) => <span key={r} className="rounded-full bg-fg/5 px-2 py-0.5 text-[11px] text-fg/75">{r}</span>) : <span className="text-[11px] text-mute">Hasn&apos;t shared much yet</span>}
                  </div>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-sm font-bold text-gold"><Sparkles size={13} /> {s.fit}%</span>
                <select value={roleFor[s.id] ?? defaultRole} onChange={(ev) => setRoleFor((m) => ({ ...m, [s.id]: ev.target.value }))} className="rounded-full border border-line bg-white px-2 py-1.5 text-xs" aria-label="Invite as">
                  {open.map((r) => <option key={r.id} value={r.id}>{r.id === AUDIENCE.id ? "Audience" : r.label}</option>)}
                </select>
                <Button size="sm" onClick={() => invite(s)}><Send size={13} /> Invite</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-mute"><Users size={12} /> Tip: share the WhatsApp text too. Most sign-ups still come from friends.</p>
    </Card>
  );
}
