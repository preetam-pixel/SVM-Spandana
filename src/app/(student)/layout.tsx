"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Activity, BookOpenCheck, CalendarDays, ClipboardList, Contact, Flag, Medal, Menu, Radio, Sparkles, Stamp, Trophy, UserRound, Users, UsersRound, VenetianMask, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { Avatar, Button, cx } from "@/components/ui";
import { ACHIEVEMENT_MAP } from "@/lib/achievements";
import { LADDER } from "@/lib/data";
import { useStore } from "@/lib/store";
import type { DisciplineId } from "@/lib/types";

const PRIMARY = [
  { href: "/home", label: "Pulse", icon: Activity },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/stage", label: "Mask Mode", icon: VenetianMask },
  { href: "/people", label: "People", icon: UsersRound },
];
const SECONDARY = [
  { href: "/squads", label: "Squads", icon: Users },
  { href: "/opportunities", label: "Opportunities", icon: Flag },
  { href: "/achievements", label: "Achievements", icon: Trophy },
  { href: "/club", label: "SVM Club", icon: Medal },
  { href: "/guru", label: "Guru", icon: Sparkles },
  { href: "/passport", label: "Passport", icon: Stamp },
  { href: "/team", label: "SVM Team", icon: Contact },
  { href: "/profile", label: "Profile", icon: UserRound },
];
const CORE_LINK = { href: "/core", label: "Core Dashboard", icon: ClipboardList };
const EXTRA = [
  { href: "/cockpit", label: "Organizer Cockpit", icon: BookOpenCheck },
  { href: "/live", label: "Live Stage", icon: Radio },
];

// Pages that work before the Creative Spark is taken (and everything under them).
const OPEN_BEFORE_SPARK = ["/profile", "/team", "/people", "/u", "/events", "/achievements", "/opportunities", "/club"];
const under = (path: string, href: string) => path === href || path.startsWith(`${href}/`);
const isActive = (path: string, href: string) => under(path, href) || (href === "/people" && path.startsWith("/u/"));

interface Notifications {
  friendRequests: number;
  invites: number;
  unlocked: string[];
  recognitions: { id: string; title: string }[];
  attended?: { id: string; title: string; role: string; kind: "attended" | "gig" | "showcase"; discipline?: DisciplineId }[];
}
const EVENT_POINTS = { attended: 15, gig: 20, showcase: 25 } as const;

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { ready, account, profile, update, addContribution, toast } = useStore();
  const path = usePathname();
  const router = useRouter();
  const [badges, setBadges] = useState({ requests: 0, invites: 0 });
  const [more, setMore] = useState(false);
  const lastCheck = useRef(0);
  const celebrated = useRef(new Set<string>());
  const seenRef = useRef({ achievements: profile.seenAchievements, recognitions: profile.seenRecognitions, contributions: profile.contributions });
  seenRef.current = { achievements: profile.seenAchievements, recognitions: profile.seenRecognitions, contributions: profile.contributions };
  const accountId = account?.id;

  // Nav badges (friend requests, event invites) and newly earned achievements / recognitions.
  // Refreshed on navigation, at most every 10 seconds.
  useEffect(() => {
    setMore(false);
    if (!accountId || Date.now() - lastCheck.current < 10_000) return;
    lastCheck.current = Date.now();
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((d: Notifications) => {
        if (!Array.isArray(d.unlocked)) return;
        setBadges({ requests: d.friendRequests ?? 0, invites: d.invites ?? 0 });
        // Events verified by check-in count like any contribution: points, a passport stamp, ladder progress.
        const credited = new Set(seenRef.current.contributions.map((c) => c.ref).filter(Boolean));
        for (const a of d.attended ?? []) {
          if (credited.has(`event:${a.id}`)) continue;
          addContribution({
            title: a.kind === "attended" ? `Attended ${a.title}` : `${a.role} at ${a.title}`, kind: a.kind, discipline: a.discipline,
            points: EVENT_POINTS[a.kind], ref: `event:${a.id}`,
          });
        }
        const seen = new Set([...(seenRef.current.achievements ?? []), ...celebrated.current]);
        const fresh = d.unlocked.filter((id) => !seen.has(id) && ACHIEVEMENT_MAP[id]);
        const seenRecs = new Set([...(seenRef.current.recognitions ?? []), ...celebrated.current]);
        const recs = d.recognitions.filter((r) => !seenRecs.has(r.id));
        if (!fresh.length && !recs.length) return;
        [...fresh, ...recs.map((r) => r.id)].forEach((id) => celebrated.current.add(id));
        if (fresh.length > 2) toast(`🏅 ${fresh.length} new achievements unlocked! See them in Achievements`, "level");
        else fresh.forEach((id, i) => setTimeout(() => toast(`🏅 Achievement unlocked: ${ACHIEVEMENT_MAP[id].name}`, "level"), i * 600));
        recs.slice(0, 2).forEach((r) => toast(`🏆 SVM recognised you: ${r.title}!`, "level"));
        update((p) => ({
          ...p,
          seenAchievements: [...new Set([...(p.seenAchievements ?? []), ...d.unlocked])],
          seenRecognitions: [...new Set([...(p.seenRecognitions ?? []), ...d.recognitions.map((r) => r.id)])],
        }));
      })
      .catch(() => {});
  }, [accountId, path, toast, update, addContribution]);

  useEffect(() => {
    if (ready && !account) router.replace("/login");
  }, [ready, account, router]);

  if (!ready || !account) return <div className="grid min-h-dvh place-items-center text-mute">Loading…</div>;

  // The profile page works before the Creative Spark; everything else needs a DNA.
  if (!profile.sparkDone && !OPEN_BEFORE_SPARK.some((p) => under(path, p)))
    return (
      <div className="grid min-h-dvh place-items-center px-4">
        <div className="card max-w-md p-8 text-center">
          <div className="flex justify-center"><Logo /></div>
          <h1 className="mt-6 font-display text-2xl font-semibold">Find your spark first, {account.name.split(" ")[0]}</h1>
          <p className="mt-2 text-sm text-mute">Take the 3-minute Creative Spark so Spandana can personalise everything for you.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => router.push("/spark")}>Start Creative Spark</Button>
            <Button variant="soft" onClick={() => router.push("/profile")}>My profile</Button>
          </div>
        </div>
      </div>
    );

  const rung = LADDER[profile.level];
  const badgeFor = (href: string) => (href === "/people" ? badges.requests : href === "/events" ? badges.invites : 0);

  return (
    <div className="min-h-dvh pb-24 lg:pb-0 lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-night/90 p-5 backdrop-blur-xl lg:flex">
        <Logo small />
        <nav className="mt-8 space-y-1">
          {[...PRIMARY, ...SECONDARY].map((n) => (
            <Link key={n.href} href={n.href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(path, n.href) ? "bg-iris text-white shadow-md shadow-iris/20" : "text-mute hover:bg-fg/5 hover:text-fg")}>
              <n.icon size={18} /> {n.label}
              {badgeFor(n.href) > 0 && <span className="ml-auto rounded-full bg-magenta px-1.5 text-[11px] font-bold text-white">{badgeFor(n.href)}</span>}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          {account.role === "core" && (
            <Link href="/core" className="flex items-center gap-2 rounded-xl grad-bg px-3 py-2.5 text-xs font-semibold"><ClipboardList size={15} /> Core Dashboard</Link>
          )}
          <Link href="/cockpit" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-xs text-mute hover:text-fg"><BookOpenCheck size={15} /> Organizer Cockpit</Link>
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:bg-panel2/50">
            <Avatar name={account.name} src={account.avatar} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{account.name}</div>
              <div className="text-xs text-mute">{account.role === "core" ? "SVM Core" : rung.name} · {account.dept} {account.year} yr</div>
            </div>
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-line bg-ink/85 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="lg:hidden"><Logo small /></div>
        <div className="hidden text-sm text-mute lg:block">
          <span className="font-kn">ನಮಸ್ಕಾರ</span>, <span className="font-semibold text-fg">{account.name.split(" ")[0]}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              update((p) => ({ ...p, examMode: !p.examMode }));
              toast(profile.examMode ? "Exam Mode off. Welcome back!" : "Exam Mode on: only short sessions, streak frozen", "info");
            }}
            className={cx("flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold transition", profile.examMode ? "border-aqua/50 bg-aqua/10 text-aqua" : "border-line bg-white text-mute hover:text-fg")}
          >
            <BookOpenCheck size={14} /> Exam Mode {profile.examMode ? "ON" : "OFF"}
          </button>
          <Link href="/profile" className="lg:hidden" aria-label="My profile"><Avatar name={account.name} src={account.avatar} size={32} /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-night/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
        {PRIMARY.map((n) => (
          <Link key={n.href} href={n.href} className={cx("relative flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium", isActive(path, n.href) ? "text-fg" : "text-mute")}>
            <n.icon size={20} className={isActive(path, n.href) ? "text-iris" : ""} /> {n.label}
            {badgeFor(n.href) > 0 && <span className="absolute -top-0.5 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-magenta px-1 text-[9px] font-bold text-white">{badgeFor(n.href)}</span>}
          </Link>
        ))}
        <button onClick={() => setMore(true)} className={cx("flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium", SECONDARY.some((n) => isActive(path, n.href)) ? "text-fg" : "text-mute")}>
          <Menu size={20} /> More
        </button>
      </nav>

      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-40 bg-fg/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)}>
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-night p-5 pb-[max(env(safe-area-inset-bottom),20px)] shadow-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-lg font-semibold">More</span>
                <button onClick={() => setMore(false)} className="rounded-full p-1.5 text-mute hover:bg-fg/5" aria-label="Close"><X size={18} /></button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[...SECONDARY, ...(account.role === "core" ? [CORE_LINK] : []), ...EXTRA].map((n) => (
                  <Link key={n.href} href={n.href} className={cx("flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center text-xs font-medium", isActive(path, n.href) ? "border-iris bg-iris text-white" : "border-line bg-white text-fg")}>
                    <n.icon size={20} /> {n.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
