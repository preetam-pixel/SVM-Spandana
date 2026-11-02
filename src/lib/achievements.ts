import type { Stats } from "./types";

export type Tier = "bronze" | "silver" | "gold";
export type AchievementCategory = "explorer" | "showcase" | "events" | "fests" | "community" | "organizer";

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  icon: string; // lucide-react icon name, mapped in components/AchievementBadge
  tier: Tier;
  category: AchievementCategory;
  stat: keyof Stats;
  goal: number;
}

export const TIER_POINTS: Record<Tier, number> = { bronze: 10, silver: 25, gold: 50 };
export const TIER_COLOR: Record<Tier, string> = { bronze: "#b5651d", silver: "#7d8597", gold: "#a87a26" };

export const CATEGORIES: { id: AchievementCategory; label: string; sub: string }[] = [
  { id: "events", label: "Events", sub: "Show up, help out, take the stage" },
  { id: "fests", label: "Fests & competitions", sub: "Represent SVM beyond campus" },
  { id: "showcase", label: "Showcase", sub: "Share your work in Mask Mode" },
  { id: "community", label: "Community", sub: "Friends, squads and recognition" },
  { id: "explorer", label: "Explorer", sub: "Try every art form" },
  { id: "organizer", label: "Organiser", sub: "For SVM core members who run events" },
];

export const ACHIEVEMENTS: AchievementDef[] = [
  // Explorer
  { id: "spark", name: "Spark Lit", desc: "Take the Creative Spark", icon: "Sparkles", tier: "bronze", category: "explorer", stat: "sparkDone", goal: 1 },
  { id: "curious", name: "Curious Soul", desc: "Earn passport stamps in 3 art forms", icon: "Compass", tier: "bronze", category: "explorer", stat: "stamps", goal: 3 },
  { id: "navarasa", name: "Navarasa", desc: "Earn stamps in all 9 art forms", icon: "Gem", tier: "gold", category: "explorer", stat: "stamps", goal: 9 },
  // Showcase
  { id: "first-work", name: "First Brushstroke", desc: "Share your first work in Mask Mode", icon: "Brush", tier: "bronze", category: "showcase", stat: "posts", goal: 1 },
  { id: "portfolio", name: "Portfolio", desc: "Share 5 works", icon: "Images", tier: "silver", category: "showcase", stat: "posts", goal: 5 },
  { id: "unmasked", name: "Unmasked", desc: "Reveal yourself as the creator of a work", icon: "VenetianMask", tier: "silver", category: "showcase", stat: "unmasked", goal: 1 },
  { id: "applause", name: "Applause", desc: "Receive 25 reactions on your works", icon: "Heart", tier: "silver", category: "showcase", stat: "reactions", goal: 25 },
  { id: "crowd-favourite", name: "Crowd Favourite", desc: "Receive 100 reactions on your works", icon: "Flame", tier: "gold", category: "showcase", stat: "reactions", goal: 100 },
  { id: "kind-voice", name: "Kind Voice", desc: "Leave 5 kind comments on classmates' work", icon: "MessageCircleHeart", tier: "bronze", category: "showcase", stat: "comments", goal: 5 },
  // Events
  { id: "first-step", name: "First Step", desc: "Sign up for an SVM event", icon: "Ticket", tier: "bronze", category: "events", stat: "signups", goal: 1 },
  { id: "showed-up", name: "Showed Up", desc: "Check in at your first event", icon: "CalendarCheck", tier: "bronze", category: "events", stat: "attended", goal: 1 },
  { id: "regular", name: "Regular", desc: "Attend 5 SVM events", icon: "Repeat", tier: "silver", category: "events", stat: "attended", goal: 5 },
  { id: "backstage-hero", name: "Backstage Hero", desc: "Work 3 backstage roles at events", icon: "Wrench", tier: "silver", category: "events", stat: "crew", goal: 3 },
  { id: "spotlight", name: "In the Spotlight", desc: "Perform on stage at an SVM event", icon: "MicVocal", tier: "silver", category: "events", stat: "stage", goal: 1 },
  { id: "star-night", name: "Star of the Night", desc: "Be named an event star by SVM", icon: "Star", tier: "gold", category: "events", stat: "stars", goal: 1 },
  // Fests & competitions
  { id: "fest-ready", name: "Fest Ready", desc: "Raise your hand for a fest or competition event", icon: "Flag", tier: "bronze", category: "fests", stat: "interests", goal: 1 },
  { id: "all-rounder", name: "All-Rounder", desc: "Show interest in 3 competition events", icon: "Rocket", tier: "silver", category: "fests", stat: "interests", goal: 3 },
  { id: "represented-svm", name: "Represented SVM", desc: "Be part of an SVM trophy at a fest or competition", icon: "Trophy", tier: "gold", category: "fests", stat: "trophies", goal: 1 },
  // Community
  { id: "connector", name: "Connector", desc: "Make your first friend on Spandana", icon: "UserPlus", tier: "bronze", category: "community", stat: "friends", goal: 1 },
  { id: "inner-circle", name: "Inner Circle", desc: "Make 10 friends", icon: "Users", tier: "silver", category: "community", stat: "friends", goal: 10 },
  { id: "squad-up", name: "Squad Up", desc: "Join a squad quest", icon: "Handshake", tier: "bronze", category: "community", stat: "quests", goal: 1 },
  { id: "recognised", name: "Recognised", desc: "Receive a recognition from SVM core", icon: "Award", tier: "silver", category: "community", stat: "recognitions", goal: 1 },
  { id: "hall-of-fame", name: "Hall of Fame", desc: "Receive 3 recognitions from SVM core", icon: "Crown", tier: "gold", category: "community", stat: "recognitions", goal: 3 },
  // Organiser
  { id: "host", name: "Host", desc: "Organise an SVM event", icon: "Megaphone", tier: "silver", category: "organizer", stat: "hosted", goal: 1 },
  { id: "crowd-gatherer", name: "Crowd Gatherer", desc: "Get 20 sign-ups for an event you organise", icon: "PartyPopper", tier: "gold", category: "organizer", stat: "biggestEvent", goal: 20 },
];

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<string, AchievementDef>;

export const EMPTY_STATS: Stats = {
  sparkDone: false, stamps: 0, quests: 0, posts: 0, unmasked: 0, reactions: 0, comments: 0, friends: 0,
  signups: 0, attended: 0, crew: 0, stage: 0, stars: 0, recognitions: 0, hosted: 0, biggestEvent: 0, interests: 0, trophies: 0,
};

export interface Progress {
  id: string;
  value: number;
  goal: number;
  unlocked: boolean;
}

const valueOf = (s: Stats, k: keyof Stats) => Number(s[k]) || 0;

export function evaluate(stats: Stats): Progress[] {
  return ACHIEVEMENTS.map((a) => {
    const value = valueOf(stats, a.stat);
    return { id: a.id, value: Math.min(value, a.goal), goal: a.goal, unlocked: value >= a.goal };
  });
}

export const unlockedIds = (stats: Stats) => evaluate(stats).filter((p) => p.unlocked).map((p) => p.id);

export const achievementPoints = (ids: string[]) =>
  ids.reduce((sum, id) => sum + (ACHIEVEMENT_MAP[id] ? TIER_POINTS[ACHIEVEMENT_MAP[id].tier] : 0), 0);
