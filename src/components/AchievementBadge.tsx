"use client";

import {
  Award, Brush, CalendarCheck, Compass, Crown, Flame, Gem, Handshake, Heart, Images, Lock, Megaphone, MessageCircleHeart,
  MicVocal, PartyPopper, Flag, Repeat, Rocket, Sparkles, Star, Ticket, Trophy, UserPlus, Users, VenetianMask, Wrench, type LucideIcon,
} from "lucide-react";
import { ACHIEVEMENT_MAP, TIER_COLOR, TIER_POINTS, type Progress } from "@/lib/achievements";
import { cx } from "./ui";

const ICONS: Record<string, LucideIcon> = {
  Award, Brush, CalendarCheck, Compass, Crown, Flame, Gem, Handshake, Heart, Images, Megaphone, MessageCircleHeart,
  MicVocal, PartyPopper, Flag, Repeat, Rocket, Sparkles, Star, Ticket, Trophy, UserPlus, Users, VenetianMask, Wrench,
};

/** Round medal for an achievement, ringed in its tier colour (bronze / silver / gold). */
export function Medal({ id, size = 56, locked = false }: { id: string; size?: number; locked?: boolean }) {
  const a = ACHIEVEMENT_MAP[id];
  if (!a) return null;
  const Icon = ICONS[a.icon] ?? Award;
  const c = TIER_COLOR[a.tier];
  return (
    <div
      title={`${a.name}: ${a.desc}`}
      className={cx("relative grid shrink-0 place-items-center rounded-full", locked ? "border-2 border-dashed border-fg/15 bg-fg/[0.03]" : "shadow-md")}
      style={{ width: size, height: size, ...(locked ? {} : { background: `radial-gradient(circle at 30% 25%, ${c}cc, ${c} 55%, #3b2416 140%)`, boxShadow: `0 0 0 3px #fffbf4, 0 0 0 5px ${c}55` }) }}
    >
      <Icon size={size * 0.44} className={locked ? "text-fg/25" : "text-white drop-shadow"} />
      {locked && <Lock size={Math.max(10, size * 0.2)} className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5 text-mute" />}
    </div>
  );
}

export function AchievementTile({ p }: { p: Progress }) {
  const a = ACHIEVEMENT_MAP[p.id];
  if (!a) return null;
  const c = TIER_COLOR[a.tier];
  return (
    <div className={cx("card flex items-center gap-4 p-4", !p.unlocked && "bg-white/60")}>
      <Medal id={a.id} size={52} locked={!p.unlocked} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cx("truncate font-display font-semibold", !p.unlocked && "text-fg/60")}>{a.name}</span>
          <span className="shrink-0 rounded-full px-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: c, background: `${c}18` }}>{a.tier}</span>
        </div>
        <div className="text-xs text-mute">{a.desc}</div>
        {p.unlocked ? (
          <div className="mt-1.5 text-[11px] font-semibold text-aqua">Unlocked · +{TIER_POINTS[a.tier]} pts</div>
        ) : (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10"><div className="h-full rounded-full" style={{ width: `${(p.value / p.goal) * 100}%`, background: c }} /></div>
            <span className="text-[11px] tabular-nums text-mute">{p.value}/{p.goal}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** A row of earned medals, e.g. on a member's profile. */
export function MedalRow({ ids, size = 40, max = 12 }: { ids: string[]; size?: number; max?: number }) {
  const shown = ids.filter((id) => ACHIEVEMENT_MAP[id]).slice(0, max);
  return (
    <div className="flex flex-wrap gap-3">
      {shown.map((id) => (
        <div key={id} className="flex w-16 flex-col items-center gap-1 text-center">
          <Medal id={id} size={size} />
          <span className="text-[10px] font-medium leading-tight text-fg/80">{ACHIEVEMENT_MAP[id].name}</span>
        </div>
      ))}
      {ids.length > shown.length && <span className="self-center text-xs text-mute">+{ids.length - shown.length} more</span>}
    </div>
  );
}
