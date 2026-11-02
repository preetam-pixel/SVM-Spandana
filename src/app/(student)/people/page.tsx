"use client";

import { Search, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FriendButton } from "@/components/FriendButton";
import { Avatar, Badge, Card, DiscIcon, SectionHead, Shimmer, cx } from "@/components/ui";
import { DEPTS, LADDER } from "@/lib/data";
import { archetype } from "@/lib/engine";
import type { PersonCard } from "@/lib/types";

type Tab = "discover" | "friends" | "requests";

export default function PeoplePage() {
  const [tab, setTab] = useState<Tab>("discover");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const [people, setPeople] = useState<PersonCard[] | null>(null);
  const [lists, setLists] = useState<{ friends: PersonCard[]; incoming: PersonCard[]; outgoing: PersonCard[] } | null>(null);

  const loadLists = useCallback(() => {
    fetch("/api/friends").then((r) => r.json()).then((d) => d.friends && setLists(d)).catch(() => {});
  }, []);

  useEffect(loadLists, [loadLists]);

  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q, dept });
      fetch(`/api/people?${params}`).then((r) => r.json()).then((d) => setPeople(d.people ?? [])).catch(() => setPeople([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, dept]);

  const shown = tab === "discover" ? people : tab === "friends" ? lists?.friends ?? null : lists ? [...lists.incoming, ...lists.outgoing] : null;
  const incoming = lists?.incoming.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-sand/50 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-iris/10"><Users className="text-iris" /></div>
          <div>
            <h1 className="font-display text-2xl font-bold">People</h1>
            <p className="mt-1 text-sm text-mute">Find classmates who share your art forms, view their profiles and add them as friends. Friends see each other's email and USN, and appear as links in your Creative Constellation.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([
          ["discover", "Discover", 0],
          ["friends", "Friends", lists?.friends.length ?? 0],
          ["requests", "Requests", incoming],
        ] as const).map(([id, label, n]) => (
          <button key={id} onClick={() => setTab(id)} className={cx("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition", tab === id ? "border-iris bg-iris text-white" : "border-line bg-white text-mute hover:text-fg")}>
            {label}
            {n > 0 && <span className={cx("rounded-full px-1.5 text-[11px] font-bold", tab === id ? "bg-white/25" : id === "requests" ? "bg-magenta text-white" : "bg-fg/10")}>{n}</span>}
          </button>
        ))}
        {tab === "discover" && (
          <div className="ml-auto flex w-full gap-2 sm:w-auto">
            <label className="flex flex-1 items-center gap-2 rounded-full border border-line bg-white px-3 py-2 sm:w-64">
              <Search size={15} className="text-mute" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="w-full bg-transparent text-sm outline-none" />
            </label>
            <select value={dept} onChange={(e) => setDept(e.target.value)} className="rounded-full border border-line bg-white px-3 py-2 text-sm outline-none">
              <option value="">All branches</option>
              {DEPTS.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
        )}
      </div>

      {tab === "requests" && lists && lists.incoming.length > 0 && <SectionHead title="Waiting for you" sub="Accept to connect" />}

      {!shown ? (
        <Card><Shimmer lines={4} /></Card>
      ) : shown.length === 0 ? (
        <Card className="py-10 text-center">
          <UserPlus className="mx-auto text-mute" size={32} />
          <p className="mt-3 text-sm text-mute">
            {tab === "discover" ? "No members match yet. As classmates register, they'll appear here." : tab === "friends" ? "No friends yet. Discover members and send a request." : "No pending requests."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => <Person key={`${tab}-${p.id}`} p={p} onChange={loadLists} />)}
        </div>
      )}
    </div>
  );
}

function Person({ p, onChange }: { p: PersonCard; onChange: () => void }) {
  return (
    <div className="card flex flex-col p-4">
      <Link href={`/u/${p.id}`} className="flex items-center gap-3">
        <Avatar name={p.name} src={p.avatar} size={52} hue={p.name.length * 37} />
        <div className="min-w-0">
          <div className="truncate font-display text-lg font-semibold hover:underline">{p.name}</div>
          <div className="text-xs text-mute">{p.dept} · Year {p.year} · {LADDER[p.level]?.name ?? "Explorer"}</div>
        </div>
      </Link>
      {p.sparkDone && <Badge color="#a87a26" className="mt-3 self-start">{archetype(p.dna)}</Badge>}
      {p.bio && <p className="mt-2 line-clamp-2 text-sm text-fg/80">{p.bio}</p>}
      {p.declared.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {p.declared.slice(0, 4).map((d) => <span key={d} className="grid h-7 w-7 place-items-center rounded-full bg-panel2/70"><DiscIcon id={d} size={13} /></span>)}
        </div>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 pt-4">
        <Link href={`/u/${p.id}`} className="text-sm font-semibold text-iris hover:underline">View profile</Link>
        <FriendButton userId={p.id} name={p.name} status={p.status} onChange={onChange} />
      </div>
    </div>
  );
}
