export type Dim = "rhythm" | "melody" | "visual" | "verbal" | "movement" | "stage";
export type DNA = Record<Dim, number>;

export type DisciplineId =
  | "vocal"
  | "instrument"
  | "dance"
  | "photo"
  | "video"
  | "art"
  | "writing"
  | "anchoring"
  | "theatre";

export interface Discipline {
  id: DisciplineId;
  name: string;
  kn: string;
  icon: string;
  color: string;
  dims: Partial<Record<Dim, number>>;
}

export type Dept = "CSE" | "ISE" | "ECE" | "EEE" | "MECH" | "CIVIL" | "AIML";

export interface Student {
  id: string;
  name: string;
  dept: Dept;
  year: number;
  dna: DNA;
  primary: DisciplineId;
  level: number; // 0..4 confidence ladder
  events: number;
  lastActiveDaysAgo: number; // 999 = never participated
  freeSlots: string[];
  hue: number;
}

export type EventType = "workshop" | "jam" | "performance" | "gig" | "showcase";
export type EventLevel = "beginner" | "open" | "experienced";

export interface SvmEvent {
  id: string;
  title: string;
  discipline: DisciplineId;
  type: EventType;
  slot: string; // "Thu 16:00" or "Anytime"
  durationMin: number;
  venue: string;
  level: EventLevel;
  spots: number;
  going: number;
  desc: string;
  role?: string; // micro-gig role, e.g. "Backstage"
}

export interface QuestRole {
  role: string;
  dim: Dim;
  discipline: DisciplineId;
  lead?: boolean;
}

export interface Quest {
  id: string;
  title: string;
  desc: string;
  by: string;
  due: string;
  roles: QuestRole[];
  tag: string;
}

export type MaskKind = "text" | "photo" | "audio" | "video" | "tune" | "sketch" | "scene";

export interface MaskPost {
  id: string;
  alias: string;
  kind: MaskKind;
  title: string;
  text?: string;
  notes?: [string, number][];
  seed?: number;
  reactions: { heart: number; fire: number; wow: number; clap: number };
  comments: string[];
  hoursAgo: number;
  unmasked?: string;
  mine?: boolean;
  media?: string; // URL of an uploaded photo / audio / video
  mime?: string;
}

export interface Contribution {
  title: string;
  kind: "attended" | "gig" | "showcase" | "squad" | "spark" | "mentor";
  discipline?: DisciplineId;
  date: string;
  points: number;
}

export interface Profile {
  name: string;
  dept: Dept;
  year: number;
  dna: DNA;
  sparkDone: boolean;
  declared: DisciplineId[];
  hiddenSpark: Dim | null;
  freeSlots: string[];
  examMode: boolean;
  level: number;
  stamps: DisciplineId[];
  joined: string[];
  quests: string[];
  contributions: Contribution[];
  myPosts: MaskPost[];
  streakWeeks: number;
}

/** Account details stored in their own columns; `profile` holds the engagement state. */
export interface Account {
  id: string;
  phone: string;
  name: string;
  usn: string;
  email: string;
  dept: Dept;
  year: number;
  bio: string;
  instagram: string;
  youtube: string;
  avatar: string;
  createdAt: number;
  profile: Profile;
}

export type AiTask = "verse" | "path" | "guru" | "squad" | "plan" | "kind" | "insight";
export type AiSource = "claude" | "gemini" | "offline";
