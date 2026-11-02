"use client";

import {
  ArrowLeft, ArrowUpRight, Award, BadgeCheck, CalendarDays, CalendarPlus, Flag, Gauge, LayoutDashboard, Radio, ShieldCheck, Trophy, Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Card, cx } from "@/components/ui";
import { useStore } from "@/lib/store";

// Pages that only exist for core members.
const WORKSPACE = [
  { href: "/core", label: "Dashboard", icon: LayoutDashboard },
  { href: "/core/showcase", label: "Endorse work", icon: BadgeCheck },
  { href: "/core/members", label: "Members", icon: Users },
  { href: "/core/events/new", label: "Post an event", icon: CalendarPlus },
  { href: "/core/insights", label: "Insights", icon: Gauge },
];
// Member pages where core members get extra tools (marked "Core only" there).
const MEMBER_VIEW = [
  { href: "/events", label: "Events & notices", icon: CalendarDays },
  { href: "/opportunities", label: "Opportunities", icon: Flag },
  { href: "/club", label: "Trophy cabinet", icon: Trophy },
  { href: "/achievements", label: "Wall of Fame", icon: Award },
  { href: "/live", label: "Live stage screen", icon: Radio },
];

const isActive = (path: string, href: string) => (href === "/core" ? path === "/core" : path === href || path.startsWith(`${href}/`));

/** The core workspace: a dark organiser shell, kept visibly apart from the light member app. */
export default function CoreLayout({ children }: { children: React.ReactNode }) {
  const { ready, account } = useStore();
  const path = usePathname();

  if (!ready) return <div className="grid min-h-dvh place-items-center text-mute">Loading…</div>;
  if (!account || account.role !== "core") return <Gate signedIn={!!account} />;

  return (
    <div className="min-h-dvh lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col core-bg p-5 lg:flex">
        <Brand />
        <nav className="mt-8 space-y-1">
          {WORKSPACE.map((n) => (
            <Link key={n.href} href={n.href} className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", isActive(path, n.href) ? "bg-sand text-fg shadow-md" : "text-ink/75 hover:bg-white/10 hover:text-ink")}>
              <n.icon size={18} /> {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-sand/70">Tools in member pages</div>
        <nav className="mt-2 space-y-0.5">
          {MEMBER_VIEW.map((n) => (
            <Link key={n.href} href={n.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink/65 transition hover:bg-white/10 hover:text-ink">
              <n.icon size={16} /> {n.label} <ArrowUpRight size={13} className="ml-auto opacity-50" />
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3">
          <Link href="/home" className="flex items-center justify-center gap-2 rounded-xl border border-white/20 px-3 py-2.5 text-xs font-semibold text-ink/85 hover:bg-white/10"><ArrowLeft size={14} /> Back to member view</Link>
          <div className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
            <Avatar name={account.name} src={account.avatar} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{account.name}</div>
              <div className="flex items-center gap-1 text-xs text-sand"><ShieldCheck size={12} /> SVM Core</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Phones and tablets: dark bar with the workspace tabs underneath. */}
      <header className="sticky top-0 z-20 core-bg lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Brand compact />
          <Link href="/home" className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-ink/90"><ArrowLeft size={13} /> Member view</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {[...WORKSPACE, ...MEMBER_VIEW.slice(0, 3)].map((n) => (
            <Link key={n.href} href={n.href} className={cx("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium", isActive(path, n.href) ? "bg-sand text-fg" : "text-ink/75 hover:bg-white/10")}>
              <n.icon size={14} /> {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/core" className="flex items-center gap-3">
      <span className="grid place-items-center rounded-xl bg-[#fff8ea] p-1.5"><Image src="/svm-logo.png" alt="SVM logo" width={1086} height={861} className={compact ? "h-7 w-auto" : "h-9 w-auto"} /></span>
      <span>
        <span className="block font-display text-base font-semibold leading-tight text-ink">Core workspace</span>
        <span className={cx("text-[11px] text-sand/80", compact ? "hidden sm:block" : "block")}>SVM coordinators & core team</span>
      </span>
    </Link>
  );
}

/** Shown to anyone who isn't a core member: log in, try the demo core account, or go back. */
function Gate({ signedIn }: { signedIn: boolean }) {
  const { loadDemo, toast } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const demo = async () => {
    setBusy(true);
    const err = await loadDemo("core");
    setBusy(false);
    if (err) toast(err, "error");
    else router.refresh();
  };
  return (
    <div className="grid min-h-dvh place-items-center core-bg px-4">
      <Card className="max-w-md p-8 text-center text-fg">
        <ShieldCheck className="mx-auto text-gold" size={36} />
        <h1 className="mt-4 font-display text-2xl font-semibold">Core workspace</h1>
        <p className="mt-2 text-sm text-mute">
          {signedIn
            ? "This area is for SVM core members and coordinators. Ask a coordinator on the SVM Team page if you should have access."
            : "Log in with a core member's phone number to manage events, endorse work and see live club numbers."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {signedIn ? (
            <Link href="/home"><Button>Back to Spandana</Button></Link>
          ) : (
            <>
              <Link href="/login"><Button>Log in</Button></Link>
              <Button variant="core" disabled={busy} onClick={demo}>{busy ? "Opening…" : "Try the demo core account"}</Button>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
