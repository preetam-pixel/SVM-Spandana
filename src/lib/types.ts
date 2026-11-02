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
  creatorId?: string; // only present once the creator has unmasked
  endorsement?: { by: string; note?: string; at: number }; // an SVM core "Core Pick"
}

export type FriendStatus = "self" | "none" | "outgoing" | "incoming" | "friends";

/** What other members can see about someone. Phone is never shared; email and USN only with friends. */
export interface PublicProfile {
  id: string;
  name: string;
  dept: Dept;
  year: number;
  bio: string;
  avatar: string;
  instagram: string;
  youtube: string;
  dna: DNA;
  sparkDone: boolean;
  hiddenSpark: Dim | null;
  level: number;
  stamps: DisciplineId[];
  declared: DisciplineId[];
  points: number;
  contributions: number;
  createdAt: number;
  email?: string;
  usn?: string;
  demo?: boolean; // one of the simulated campus students
  role?: Role;
  achievements?: string[]; // unlocked achievement ids (public activity only)
  recognitions?: Recognition[];
}

export interface PersonCard {
  id: string;
  name: string;
  dept: Dept;
  year: number;
  avatar: string;
  bio: string;
  level: number;
  declared: DisciplineId[];
  dna: DNA;
  sparkDone: boolean;
  status: FriendStatus;
  role?: Role;
}

export interface Contribution {
  title: string;
  kind: "attended" | "gig" | "showcase" | "squad" | "spark" | "mentor";
  discipline?: DisciplineId;
  date: string;
  points: number;
  ref?: string; // one-time actions (e.g. "unmask:<postId>") are only counted once
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
  seenAchievements?: string[]; // achievement ids already celebrated with a toast
  seenRecognitions?: string[];
  hideFromBoards?: boolean; // opt out of leaderboards
}

export type Role = "member" | "core";

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
  role: Role;
  profile: Profile;
}

export type AiTask = "verse" | "path" | "guru" | "squad" | "plan" | "kind" | "insight";
export type AiSource = "claude" | "gemini" | "offline";

/* ---------- Club events posted by SVM core members ---------- */

export type ClubEventKind = "workshop" | "jam" | "performance" | "showcase" | "competition" | "audition" | "meeting";

/** One line of an event's call for participants, e.g. "Singer × 4 (on stage)". slots 0 = no limit. */
export interface EventRole {
  id: string;
  label: string;
  slots: number;
  stage: boolean;
}

export interface RoleFill extends EventRole {
  filled: number;
}

export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  discipline: DisciplineId;
  kind: ClubEventKind;
  level: EventLevel;
  venue: string;
  startsAt: number;
  durationMin: number;
  cancelled: boolean;
  poster?: string;
  roles: RoleFill[]; // always starts with the built-in "audience" role
  going: number;
  host: string;
  friendsGoing: string[]; // first names of the viewer's friends who signed up
  mine?: { roleId: string; attended: boolean };
  invite?: { roleId: string; status: "pending" | "accepted" | "declined" };
}

export interface EventPerson {
  id: string;
  name: string;
  avatar: string;
  dept: Dept;
  year: number;
  roleId: string;
  friend: boolean;
  // Organiser-only fields
  note?: string;
  attended?: boolean;
  star?: boolean;
}

export interface EventDetail {
  event: ClubEvent;
  people: EventPerson[];
  core: boolean;
  canCheckIn: boolean;
  checkinCode?: string; // core only
  invites?: { userId: string; name: string; roleId: string; status: "pending" | "accepted" | "declined" }[]; // core only
}

export interface Suggestion {
  id: string;
  name: string;
  avatar: string;
  dept: Dept;
  year: number;
  level: number;
  fit: number; // 0..100
  reasons: string[];
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  link?: string;
  pinned: boolean;
  createdAt: number;
  by: string;
}

export interface Recognition {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  dept: Dept;
  year: number;
  title: string;
  message: string;
  eventId?: string;
  eventTitle?: string;
  by: string;
  createdAt: number;
}

/* ---------- Achievements ---------- */

/** Facts an achievement can be earned from. Public stats leave out anything from masked works. */
export interface Stats {
  sparkDone: boolean;
  stamps: number;
  quests: number;
  posts: number;
  unmasked: number;
  reactions: number;
  comments: number;
  friends: number;
  signups: number;
  attended: number;
  crew: number;
  stage: number;
  stars: number;
  recognitions: number;
  hosted: number;
  biggestEvent: number; // most sign-ups on an event this member organised
  interests: number; // opportunity categories marked "I'm interested"
  trophies: number; // club trophies this member is part of
  endorsed: number; // works picked by SVM core (masked ones only count for their creator)
}

export interface LeaderRow {
  id: string;
  name: string;
  avatar: string;
  dept: Dept;
  year: number;
  score: number;
  badges: number;
  core: boolean;
}

/* ---------- Club trophies and opportunities (migration 004) ---------- */

export type CompLevel = "college" | "inter-college" | "university" | "zonal" | "national" | "international";
export type TrophyPosition = "winner" | "runner-up" | "third" | "special" | "participation";

export interface ClubTrophy {
  id: string;
  title: string;
  fest: string;
  level: CompLevel;
  position: TrophyPosition;
  discipline: DisciplineId | null;
  wonOn: string | null; // YYYY-MM-DD
  members: { id: string; name: string; avatar: string }[];
  team: string;
  description: string;
  photo: string | null;
  mine: boolean;
}

export interface OpportunityCategory {
  id: string;
  name: string;
  discipline: DisciplineId;
  team: boolean;
}

export interface Opportunity {
  id: string;
  title: string;
  organiser: string;
  level: CompLevel;
  kind: "fest" | "competition" | "audition" | "workshop" | "scholarship";
  location: string;
  startsOn: string | null;
  endsOn: string | null;
  deadline: string | null;
  link: string;
  description: string;
  categories: (OpportunityCategory & { interested: number })[];
  interested: number; // distinct members
  mine: string[]; // category ids the viewer marked
  friendsInterested: number;
}

export interface Milestone {
  id: string;
  label: string;
  unit: string;
  icon: string;
  value: number;
  tiers: number[];
}

/** Live numbers for the core-member dashboard (/core). */
export interface CoreDashboard {
  kpis: {
    members: number; newThisWeek: number; sparkPct: number; core: number;
    upcomingEvents: number; upcomingSignups: number; checkinRate: number | null; handsRaised: number; trophies: number;
  };
  attention: { tone: "urgent" | "info"; text: string; href: string }[];
  upcoming: {
    id: string; title: string; startsAt: number; venue: string; discipline: DisciplineId; going: number; checkinCode: string;
    roles: { label: string; filled: number; slots: number }[]; openSlots: number;
  }[];
  past: { id: string; title: string; startsAt: number; signedUp: number; attended: number }[];
  fests: {
    id: string; title: string; deadline: string | null; startsOn: string | null; people: number;
    categories: { id: string; name: string; discipline: DisciplineId; people: { id: string; name: string }[] }[];
  }[];
  newMembers: { id: string; name: string; avatar: string; dept: string; year: number; createdAt: number; sparkDone: boolean; declared: DisciplineId[] }[];
  branches: { dept: string; members: number }[];
  artForms: { id: DisciplineId; name: string; color: string; members: number }[];
  team: { id: string; name: string; avatar: string; dept: string; year: number }[];
}

/** A row on the core Members page (no contact details). */
export interface CoreMember {
  id: string; name: string; avatar: string; dept: string; year: number; core: boolean;
  sparkDone: boolean; declared: DisciplineId[]; level: number; joinedAt: number;
  signups: number; attended: number; works: number; interests: number; trophies: number; recognitions: number;
}
