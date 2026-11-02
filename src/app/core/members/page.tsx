"use client";

import { Download, Search, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar, Badge, Button, Card, DiscIcon, Shimmer, cx } from "@/components/ui";
import { DEPTS, DISCIPLINES, DISC_MAP, LADDER } from "@/lib/data";
import type { CoreMember, DisciplineId } from "@/lib/types";

const FILTERS = [
  { id: "all", label: "Everyone", test: () => true },
  { id: "core", label: "Core team", test: (m: CoreMember) => m.core },
  { id: "nospark", label: "No Spark yet", test: (m: CoreMember) => !m.sparkDone },
  { id: "never", label: "Never attended", test: (m: CoreMember) => m.attended === 0 },
  { id: "fest", label: "Raised a hand", test: (m: CoreMember) => m.interests > 0 },
] as const;

const SORTS = {
  newest: (a: CoreMember, b: CoreMember) => b.joinedAt - a.joinedAt,
  active: (a: CoreMember, b: CoreMember) => b.attended + b.works + b.interests - (a.attended + a.works + a.interests),
  name: (a: CoreMember, b: CoreMember) => a.name.localeCompare(b.name),
};

const joined = (ms: number) => new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

/** Downloads the filtered list as a spreadsheet-friendly CSV (no contact details). */
function exportCsv(rows: CoreMember[]) {
  const head = ["Name", "Branch", "Year", "Role", "Creative Spark", "Art forms", "Ladder", "Events signed up", "Events attended", "Works shared", "Fest interest", "Trophies", "Joined"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = rows.map((m) => [
    m.name, m.dept, m.year, m.core ? "Core" : "Member", m.sparkDone ? "Yes" : "No", m.declared.map((d) => DISC_MAP[d]?.name).join("; "),
    LADDER[m.level]?.name ?? "", m.signups, m.attended, m.works, m.interests, m.trophies, joined(m.joinedAt),
  ].map(esc).join(","));
  const url = URL.createObjectURL(new Blob([[head.join(","), ...lines].join("\n")], { type: "text/csv" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "svm-members.csv" });
  a.click();
  URL.revokeObjectURL(url);
}

/** Every member at a glance, with filters to find who to invite, nudge or pick for a team. */
export default function MembersPage() {
  const [members, setMembers] = useState<CoreMember[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [dept, setDept] = useState("");
  const [art, setArt] = useState<DisciplineId | "">("");
  const [sort, setSort] = useState<keyof typeof SORTS>("newest");

  useEffect(() => {
    fetch("/api/core/members")
      .then(async (r) => {
        const d = await r.json();
        if (r.ok) setMembers(d.members);
        else setError(d.error ?? "Couldn't load members");
      })
      .catch(() => setError("Couldn't reach the server"));
  }, []);

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.id === filter)!.test;
    const needle = q.trim().toLowerCase();
    return (members ?? [])
      .filter((m) => test(m) && (!dept || m.dept === dept) && (!art || m.declared.includes(art)) && (!needle || m.name.toLowerCase().includes(needle)))
      .sort(SORTS[sort]);
  }, [members, q, filter, dept, art, sort]);

  const select = "rounded-full border border-line bg-white px-3 py-1.5 text-xs outline-none focus:border-fg/40";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Members</h1>
          <p className="mt-1 text-sm text-mute">Everyone on Spandana. Phone numbers are never shown here; contact members through the app.</p>
        </div>
        <Button size="sm" variant="core" disabled={!shown.length} onClick={() => exportCsv(shown)}><Download size={14} /> Download CSV</Button>
      </div>

      <Card className="space-y-3 p-4">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="w-full rounded-full border border-line bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-fg/40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)} className={cx("rounded-full border px-3 py-1.5 text-xs font-medium", filter === f.id ? "border-fg bg-fg text-ink" : "border-line bg-white text-mute hover:text-fg")}>{f.label}</button>
          ))}
          <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
          <select value={dept} onChange={(e) => setDept(e.target.value)} className={select} aria-label="Branch">
            <option value="">All branches</option>
            {DEPTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <select value={art} onChange={(e) => setArt(e.target.value as DisciplineId | "")} className={select} aria-label="Art form">
            <option value="">All art forms</option>
            {DISCIPLINES.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as keyof typeof SORTS)} className={select} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="active">Most active</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </Card>

      {error ? <Card className="text-sm text-magenta">{error}</Card> : !members ? <Card><Shimmer lines={6} /></Card> : (
        <Card className="p-0">
          <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))] gap-3 border-b border-line px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-mute md:grid">
            <span>Member</span><span>Art forms</span><span className="text-center">Attended</span><span className="text-center">Works</span><span className="text-center">Fests</span><span className="text-right">Joined</span>
          </div>
          {shown.length === 0 ? <p className="p-6 text-center text-sm text-mute">No members match these filters.</p> : (
            <ul className="divide-y divide-line">
              {shown.map((m) => (
                <li key={m.id}>
                  <Link href={`/u/${m.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 transition hover:bg-fg/[0.03] md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_repeat(4,minmax(0,0.7fr))]">
                    <span className="flex min-w-0 items-center gap-3">
                      <Avatar name={m.name} src={m.avatar || undefined} size={36} />
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5 truncate text-sm font-semibold">{m.name} {m.core && <ShieldCheck size={13} className="shrink-0 text-gold" aria-label="Core member" />}</span>
                        <span className="block truncate text-xs text-mute">{m.dept} · {m.year} yr · {LADDER[m.level]?.name}{!m.sparkDone && " · no Spark yet"}</span>
                      </span>
                    </span>
                    <span className="hidden items-center gap-1 md:flex">
                      {m.declared.length ? m.declared.slice(0, 5).map((d) => <DiscIcon key={d} id={d} size={15} />) : <span className="text-xs text-mute">–</span>}
                    </span>
                    <span className="text-right text-xs text-mute md:hidden">{m.attended} attended</span>
                    <span className="hidden text-center text-sm md:block">{m.attended}</span>
                    <span className="hidden text-center text-sm md:block">{m.works}</span>
                    <span className="hidden text-center text-sm md:block">{m.interests > 0 ? <Badge color="#b5651d">{m.interests}</Badge> : 0}</span>
                    <span className="hidden text-right text-xs text-mute md:block">{joined(m.joinedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-line px-4 py-2.5 text-xs text-mute">{shown.length} of {members.length} members</div>
        </Card>
      )}
    </div>
  );
}
