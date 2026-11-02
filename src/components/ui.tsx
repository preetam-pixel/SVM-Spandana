"use client";

import {
  Camera, Clapperboard, Drama, Drum, Feather, Footprints, Megaphone, Mic, Palette, Sparkles, type LucideIcon,
} from "lucide-react";
import { DISC_MAP } from "@/lib/data";
import type { DisciplineId } from "@/lib/types";

const ICONS: Record<string, LucideIcon> = { Mic, Drum, Footprints, Camera, Clapperboard, Palette, Feather, Megaphone, Drama };

export function DiscIcon({ id, size = 18, className = "" }: { id: DisciplineId; size?: number; className?: string }) {
  const Icon = ICONS[DISC_MAP[id]?.icon] ?? Sparkles;
  return <Icon size={size} className={className} style={{ color: DISC_MAP[id]?.color }} />;
}

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "soft" | "ghost"; size?: "sm" | "md" | "lg" };

export function Button({ variant = "primary", size = "md", className, ...rest }: BtnProps) {
  return (
    <button
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        size === "sm" && "px-3.5 py-1.5 text-sm",
        size === "md" && "px-5 py-2.5 text-sm",
        size === "lg" && "px-7 py-3.5 text-base",
        variant === "primary" && "grad-bg text-white shadow-lg shadow-iris/25 hover:brightness-110",
        variant === "soft" && "bg-fg/8 text-fg border border-line hover:bg-fg/12",
        variant === "ghost" && "text-mute hover:text-fg hover:bg-fg/5",
        className,
      )}
    />
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...rest} className={cx("card p-5", className)}>
      {children}
    </div>
  );
}

export function Badge({ children, color, className }: { children: React.ReactNode; color?: string; className?: string }) {
  return (
    <span
      className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", className)}
      style={{ background: `${color ?? "#5c3a21"}14`, color: color ?? "#5c4033", border: `1px solid ${color ?? "#5c3a21"}2e` }}
    >
      {children}
    </span>
  );
}

export function Kn({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cx("font-kn", className)}>{children}</span>;
}

export function SectionHead({ title, kn, sub, right }: { title: string; kn?: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {title} {kn && <Kn className="ml-1 text-base font-normal text-mute">{kn}</Kn>}
        </h2>
        {sub && <p className="mt-0.5 text-sm text-mute">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

export function Shimmer({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="shimmer h-4" style={{ width: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function AiTag({ source }: { source?: string }) {
  if (!source) return null;
  const label = source === "claude" ? "Claude AI" : source === "gemini" ? "Gemini AI" : "Offline AI";
  return (
    <Badge color={source === "offline" ? "#8a6f58" : "#4f7b5f"}>
      <Sparkles size={11} /> {label}
    </Badge>
  );
}

export function Avatar({ name, hue = 300, size = 36, src }: { name: string; hue?: number; size?: number; src?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("");
  if (src)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="shrink-0 rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />;
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36, background: `linear-gradient(135deg, hsl(${hue % 50 + 15} 45% 52%), hsl(${hue % 50 + 5} 50% 32%))` }}
    >
      {initials}
    </div>
  );
}
