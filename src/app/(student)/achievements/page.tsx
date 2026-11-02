"use client";

import { Award, Crown, EyeOff, Medal as MedalIcon, Trophy } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AchievementTile } from "@/components/AchievementBadge";
import { Avatar, Badge, Card, Kn, SectionHead, Shimmer, cx } from "@/components/ui";
import { ACHIEVEMENTS, ACHIEVEMENT_MAP, CATEGORIES, type Progress } from "@/lib/achievements";
import { recognitionEmoji } from "@/lib/club";
import { useStore } from "@/lib/store";
import type { LeaderRow, Recognition, Stats } from "@/lib/types";

type Tab = "badges" | "fame" | "boards";
interface Mine { stats?: Stats; progress: Progress[]; points: number }
interface Boards { top: LeaderRow[]; month: LeaderRow[]; me: { points: number; recent: number; rank: number | null; monthRank: number | null; hidden: boolean } }

export default function AchievementsPage() {
  const { account } = useStore();
  const [tab, setTab] = useState<Tab>("badges");
  const [mine, setMine] = useState<Mine | null>(null);
  const [boards, setBoards] = useState<Boards | null>(null);
  const [fame, setFame] = useState<Recognition[] | null>(null);

  useEffect(() => {
    fetch("/api/achievements").then((r) => r.json()).then((d) => setMine(d.progress ? d : { progress: [], points: 0 })).catch(() => setMine({ progress: [], points: 0 }));
    fetch("/api/leaderboard").then((r) => r.json()).then((d) => d.top && setBoards(d)).catch(() => {});
  }, []);
  useEffect(() => {
    if (tab === "fame" && !fame) fetch("/api/recognitions").then((r) => r.json()).then((d) => setFame(d.recognitions ?? [])).catch(() => setFame([]));
  }, [tab, fame]);

  const unlocked = mine?.progress.filter((p) => p.unlocked).length ?? 0;
  const showOrganiser = account?.role === "core" || (mine?.stats?.hosted ?? 0) > 0;
  const total = ACHIEVEMENTS.filter((a) => a.category !== "organizer" || showOrganiser).length;

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sand/60 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gold/15"><Trophy className="text-gold" /></div>
            <div>
              <h1 className="font-display text-2xl font-bold">Achievements <Kn className="text-lg font-normal text-mute">ಸಾಧನೆ</Kn></h1>
              <p className="mt-1 max-w-lg text-sm text-mute">Badges for showing up, helping out, sharing your work and lifting others. Backstage work counts as much as the stage.</p>
            </div>
          </div>
          <div className="flex gap-3 text-center">
            <Stat n={mine ? `${unlocked}/${total}` : "–"} l="badges" />
            <Stat n={mine ? mine.points : "–"} l="points" />
            <Stat n={boards?.me.rank ? `#${boards.me.rank}` : "–"} l="rank" />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([["badges", "My badges", Award], ["fame", "Wall of Fame", Crown], ["boards", "Leaderboards", MedalIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={cx("flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition", tab === id ? "border-iris bg-iris text-white" : "border-line bg-white text-mute hover:text-fg")}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "badges" && (!mine ? <Card><Shimmer lines={6} /></Card> : (
        <div className="space-y-6">
          {CATEGORIES.filter((c) => c.id !== "organizer" || showOrganiser).map((c) => {
            const items = mine.progress.filter((p) => ACHIEVEMENT_MAP[p.id]?.category === c.id).sort((a, b) => Number(b.unlocked) - Number(a.unlocked));
            return (
              <section key={c.id}>
                <SectionHead title={c.label} sub={c.sub} right={<span className="text-xs text-mute">{items.filter((p) => p.unlocked).length}/{items.length}</span>} />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <AchievementTile key={p.id} p={p} />)}</div>
              </section>
            );
          })}
          <p className="text-xs text-mute">Masked works count toward your own badges. Other people only see badges earned from works you&apos;ve unmasked, so Mask Mode stays anonymous.</p>
        </div>
      ))}

      {tab === "fame" && <WallOfFame list={fame} core={account?.role === "core"} />}
      {tab === "boards" && <Leaderboards boards={boards} me={account?.id} />}
    </div>
  );
}

function Stat({ n, l }: { n: string | number; l: string }) {
  return (
    <div className="min-w-[72px] rounded-2xl bg-panel2/60 px-3 py-2">
      <div className="font-display text-2xl font-bold">{n}</div>
      <div className="text-[11px] text-mute">{l}</div>
    </div>
  );
}

function WallOfFame({ list, core }: { list: Recognition[] | null; core: boolean }) {
  if (!list) return <Card><Shimmer lines={5} /></Card>;
  return (
    <div className="space-y-4">
      {core && <p className="text-sm text-mute">To recognise someone, open their profile from <Link href="/people" className="font-semibold text-iris hover:underline">People</Link> or star them in an event&apos;s sign-up list.</p>}
      {list.length === 0 ? (
        <Card className="py-10 text-center text-sm text-mute"><Crown className="mx-auto mb-3 text-gold" size={30} />No recognitions yet. The first event stars will appear here.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((r) => (
            <div key={r.id} className="card relative overflow-hidden p-5">
              <div className="absolute -right-6 -top-6 text-7xl opacity-10">{recognitionEmoji(r.title)}</div>
              <div className="relative flex items-center gap-3">
                <Avatar name={r.name} src={r.avatar} size={48} hue={r.name.length * 37} />
                <div className="min-w-0">
                  <Link href={`/u/${r.userId}`} className="font-display text-lg font-semibold hover:underline">{r.name}</Link>
                  <div className="text-xs text-mute">{r.dept} · Year {r.year}</div>
                </div>
              </div>
              <div className="relative mt-3"><Badge color="#a87a26">{recognitionEmoji(r.title)} {r.title}</Badge></div>
              {r.message && <p className="relative mt-2 text-sm italic text-fg/85">“{r.message}”</p>}
              <div className="relative mt-3 text-[11px] text-mute">
                {r.eventTitle && r.eventId ? <>At <Link href={`/events/${r.eventId}`} className="font-semibold text-iris hover:underline">{r.eventTitle}</Link> · </> : null}
                by {r.by} · {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Leaderboards({ boards, me }: { boards: Boards | null; me?: string }) {
  const { profile, update, toast } = useStore();
  if (!boards) return <Card><Shimmer lines={6} /></Card>;
  const hidden = !!profile.hideFromBoards;
  const toggle = () => {
    update((p) => ({ ...p, hideFromBoards: !p.hideFromBoards }));
    toast(hidden ? "You'll appear on leaderboards again" : "You're hidden from leaderboards. Your badges still count.", "info");
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white/70 p-3 text-sm">
        <span className="flex items-center gap-2 text-mute"><EyeOff size={15} /> Prefer to stay off the boards? Your badges still count.</span>
        <button onClick={toggle} className={cx("rounded-full border px-3 py-1.5 text-xs font-semibold", hidden ? "border-iris bg-iris text-white" : "border-line text-fg hover:bg-fg/5")}>
          {hidden ? "Hidden · show me again" : "Hide me from leaderboards"}
        </button>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Board title="Top achievers" sub="All-time badge points" rows={boards.top} me={me} unit="pts" />
        <Board title="Most active this month" sub="Verified events, unmasked works and recognitions in the last 30 days" rows={boards.month} me={me} unit="pts" />
      </div>
      <p className="text-xs text-mute">Leaderboards only use public activity: checked-in events, unmasked works and recognitions. Demo accounts aren&apos;t listed.</p>
    </div>
  );
}

const MEDALS = ["🥇", "🥈", "🥉"];

function Board({ title, sub, rows, me, unit }: { title: string; sub: string; rows: LeaderRow[]; me?: string; unit: string }) {
  return (
    <Card>
      <SectionHead title={title} sub={sub} />
      {rows.length === 0 ? <p className="text-sm text-mute">Nobody here yet. Sign up for an event and check in to be first!</p> : (
        <ol className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.id}>
              <Link href={r.id === me ? "/profile" : `/u/${r.id}`} className={cx("flex items-center gap-3 rounded-2xl px-2.5 py-2 transition hover:bg-fg/[0.04]", r.id === me && "bg-sand/25 ring-1 ring-gold/40")}>
                <span className="w-7 text-center font-display text-lg font-bold text-mute">{MEDALS[i] ?? i + 1}</span>
                <Avatar name={r.name} src={r.avatar} size={34} hue={r.name.length * 37} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{r.name}{r.id === me && " (you)"} {r.core && <Badge color="#5c3a21" className="ml-1">Core</Badge>}</div>
                  <div className="text-xs text-mute">{r.dept} · Y{r.year} · {r.badges} badge{r.badges === 1 ? "" : "s"}</div>
                </div>
                <span className="font-display text-lg font-bold tabular-nums">{r.score}<span className="ml-0.5 text-[10px] font-normal text-mute">{unit}</span></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
