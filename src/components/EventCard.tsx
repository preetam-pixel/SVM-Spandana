"use client";

import { Check, Clock, MapPin, Mail, Users } from "lucide-react";
import Link from "next/link";
import { AUDIENCE, KIND_LABEL, dateTile, fmtEventDate, isLive, isPast, openSpots, relativeDay } from "@/lib/club";
import { DISC_MAP } from "@/lib/data";
import type { ClubEvent } from "@/lib/types";
import { Badge, DiscIcon, cx } from "./ui";

/** Status line for the viewer: signed up, checked in, invited, cancelled… */
export function EventStatus({ e }: { e: ClubEvent }) {
  if (e.cancelled) return <Badge color="#8b3a3a">Cancelled</Badge>;
  const role = e.mine && e.roles.find((r) => r.id === e.mine!.roleId);
  if (e.mine?.attended) return <Badge color="#4f7b5f"><Check size={11} /> Checked in</Badge>;
  if (e.mine) return <Badge color="#4f7b5f"><Check size={11} /> You&apos;re in{role && role.id !== AUDIENCE.id ? ` · ${role.label}` : ""}</Badge>;
  if (e.invite?.status === "pending" && !isPast(e)) return <Badge color="#a87a26"><Mail size={11} /> Invited</Badge>;
  if (isLive(e)) return <Badge color="#8b3a3a">● Live now</Badge>;
  return null;
}

export function EventCard({ e, compact = false }: { e: ClubEvent; compact?: boolean }) {
  const d = DISC_MAP[e.discipline];
  const tile = dateTile(e.startsAt);
  const rel = relativeDay(e.startsAt);
  const spots = openSpots(e);
  const needs = e.roles.filter((r) => r.id !== AUDIENCE.id);
  const past = isPast(e);
  return (
    <Link href={`/events/${e.id}`} className={cx("card group flex flex-col overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-lg", (e.cancelled || past) && "opacity-80")}>
      {!compact && e.poster && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.poster} alt="" className="aspect-[16/7] w-full object-cover" />
      )}
      <div className="flex flex-1 gap-4 p-4">
        <div className="flex w-14 shrink-0 flex-col items-center rounded-2xl py-2 text-center" style={{ background: `${d.color}1c` }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-mute">{tile.weekday}</span>
          <span className="font-display text-2xl font-bold leading-none" style={{ color: d.color }}>{tile.day}</span>
          <span className="text-[11px] font-medium text-mute">{tile.month}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold uppercase tracking-wider text-mute">
            <span className="flex items-center gap-1" style={{ color: d.color }}><DiscIcon id={d.id} size={12} /> {d.name}</span>
            <span>· {KIND_LABEL[e.kind]}</span>
            {rel && !past && <span className="text-magenta">· {rel}</span>}
          </div>
          <div className={cx("mt-1 font-display font-semibold leading-snug group-hover:underline", compact ? "text-base" : "text-lg", e.cancelled && "line-through")}>{e.title}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-mute">
            <span className="flex items-center gap-1"><Clock size={12} /> {fmtEventDate(e.startsAt).split(" · ")[1]} · {e.durationMin} min</span>
            {e.venue && <span className="flex min-w-0 items-center gap-1"><MapPin size={12} className="shrink-0" /> <span className="truncate">{e.venue}</span></span>}
          </div>
          {!compact && needs.length > 0 && !past && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {needs.slice(0, 4).map((r) => {
                const full = r.slots > 0 && r.filled >= r.slots;
                return (
                  <span key={r.id} className={cx("rounded-full border px-2 py-0.5 text-[11px]", full ? "border-line text-mute line-through" : "border-gold/40 bg-sand/15 text-fg")}>
                    {r.label} {r.slots > 0 ? `${r.filled}/${r.slots}` : r.filled > 0 ? `· ${r.filled}` : ""}
                  </span>
                );
              })}
              {needs.length > 4 && <span className="text-[11px] text-mute">+{needs.length - 4} roles</span>}
            </div>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="flex items-center gap-1 text-xs text-mute">
              <Users size={12} /> {e.going} going
              {e.friendsGoing.length > 0 && <span className="text-iris"> · {e.friendsGoing.slice(0, 2).join(", ")}{e.friendsGoing.length > 2 ? ` +${e.friendsGoing.length - 2}` : ""}</span>}
              {spots !== null && spots > 0 && !past && !e.cancelled && <span className="font-semibold text-magenta"> · {spots} spot{spots === 1 ? "" : "s"} open</span>}
            </span>
            <EventStatus e={e} />
          </div>
        </div>
      </div>
    </Link>
  );
}
