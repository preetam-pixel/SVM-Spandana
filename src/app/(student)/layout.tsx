"use client";

import { Activity, BookOpenCheck, Sparkles, Stamp, UserRound, Users, VenetianMask } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import { Avatar, Button, cx } from "@/components/ui";
import { LADDER } from "@/lib/data";
import { useStore } from "@/lib/store";

const NAV = [
  { href: "/home", label: "Pulse", icon: Activity },
  { href: "/stage", label: "Mask Mode", icon: VenetianMask },
  { href: "/squads", label: "Squads", icon: Users },
  { href: "/guru", label: "Guru", icon: Sparkles },
  { href: "/passport", label: "Passport", icon: Stamp },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { ready, account, profile, update, toast } = useStore();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (ready && !account) router.replace("/login");
  }, [ready, account, router]);

  if (!ready || !account) return <div className="grid min-h-dvh place-items-center text-mute">Loading…</div>;

  // The profile page works before the Creative Spark; everything else needs a DNA.
  if (!profile.sparkDone && path !== "/profile")
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

  return (
    <div className="min-h-dvh pb-24 lg:pb-0 lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-night/90 p-5 backdrop-blur-xl lg:flex">
        <Logo small />
        <nav className="mt-8 space-y-1">
          {[...NAV, { href: "/profile", label: "Profile", icon: UserRound }].map((n) => (
            <Link key={n.href} href={n.href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", path === n.href ? "bg-iris text-white shadow-md shadow-iris/20" : "text-mute hover:bg-fg/5 hover:text-fg")}>
              <n.icon size={18} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/cockpit" className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-xs text-mute hover:text-fg"><BookOpenCheck size={15} /> Organizer Cockpit</Link>
          <Link href="/profile" className="flex items-center gap-3 rounded-xl border border-line bg-white p-3 hover:bg-panel2/50">
            <Avatar name={account.name} src={account.avatar} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{account.name}</div>
              <div className="text-xs text-mute">{rung.name} · {account.dept} {account.year} yr</div>
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
            className={cx("flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition", profile.examMode ? "border-aqua/50 bg-aqua/10 text-aqua" : "border-line bg-white text-mute hover:text-fg")}
          >
            <BookOpenCheck size={14} /> Exam Mode {profile.examMode ? "ON" : "OFF"}
          </button>
          <Link href="/profile" className="lg:hidden" aria-label="My profile"><Avatar name={account.name} src={account.avatar} size={32} /></Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-line bg-night/95 px-2 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 backdrop-blur-xl lg:hidden">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={cx("flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-medium", path === n.href ? "text-fg" : "text-mute")}>
            <n.icon size={20} className={path === n.href ? "text-iris" : ""} /> {n.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
