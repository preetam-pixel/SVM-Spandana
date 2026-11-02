import type {
  Dept,
  Dim,
  DNA,
  Discipline,
  DisciplineId,
  MaskPost,
  Profile,
  Quest,
  Student,
  SvmEvent,
} from "./types";

export const DIMS: { key: Dim; label: string; kn: string; color: string; blurb: string }[] = [
  { key: "rhythm", label: "Rhythm", kn: "ಲಯ", color: "#b5651d", blurb: "Timing, groove and beat" },
  { key: "melody", label: "Melody", kn: "ರಾಗ", color: "#8b3a3a", blurb: "Pitch, tune and voice" },
  { key: "visual", label: "Visual", kn: "ದೃಶ್ಯ", color: "#4f7b5f", blurb: "Framing, colour and composition" },
  { key: "verbal", label: "Verbal", kn: "ಸಾಹಿತ್ಯ", color: "#6e5384", blurb: "Words, imagery and story" },
  { key: "movement", label: "Movement", kn: "ನೃತ್ಯ", color: "#c08a2e", blurb: "Body, expression and flow" },
  { key: "stage", label: "Stagecraft", kn: "ರಂಗ", color: "#3e6a8a", blurb: "Presence, hosting and voice" },
];

export const DIM_MAP = Object.fromEntries(DIMS.map((d) => [d.key, d])) as Record<Dim, (typeof DIMS)[number]>;

export const DISCIPLINES: Discipline[] = [
  { id: "vocal", name: "Vocal Music", kn: "ಗಾಯನ", icon: "Mic", color: "#8b3a3a", dims: { melody: 1, stage: 0.4 } },
  { id: "instrument", name: "Instruments & Percussion", kn: "ವಾದ್ಯ", icon: "Drum", color: "#b5651d", dims: { rhythm: 1, melody: 0.5 } },
  { id: "dance", name: "Dance", kn: "ನೃತ್ಯ", icon: "Footprints", color: "#c08a2e", dims: { movement: 1, rhythm: 0.6, stage: 0.3 } },
  { id: "photo", name: "Photography", kn: "ಛಾಯಾಗ್ರಹಣ", icon: "Camera", color: "#4f7b5f", dims: { visual: 1 } },
  { id: "video", name: "Videography & Editing", kn: "ಚಿತ್ರೀಕರಣ", icon: "Clapperboard", color: "#2f7f86", dims: { visual: 0.8, rhythm: 0.4, verbal: 0.3 } },
  { id: "art", name: "Art & Design", kn: "ಚಿತ್ರಕಲೆ", icon: "Palette", color: "#5e8c4a", dims: { visual: 1, movement: 0.2 } },
  { id: "writing", name: "Literature & Poetry", kn: "ಸಾಹಿತ್ಯ", icon: "Feather", color: "#6e5384", dims: { verbal: 1 } },
  { id: "anchoring", name: "Anchoring & Hosting", kn: "ನಿರೂಪಣೆ", icon: "Megaphone", color: "#3e6a8a", dims: { stage: 1, verbal: 0.6 } },
  { id: "theatre", name: "Theatre", kn: "ರಂಗಭೂಮಿ", icon: "Drama", color: "#a0526d", dims: { stage: 1, movement: 0.5, verbal: 0.4 } },
];

export const DISC_MAP = Object.fromEntries(DISCIPLINES.map((d) => [d.id, d])) as Record<DisciplineId, Discipline>;

export const LADDER = [
  { level: 0, name: "Explorer", kn: "ಅನ್ವೇಷಕ", desc: "Watch, browse, take the spark", next: "Join any 1 activity or micro-gig" },
  { level: 1, name: "Crew", kn: "ತಂಡ", desc: "Backstage roles & micro-gigs", next: "Make 3 contributions" },
  { level: 2, name: "Collaborator", kn: "ಸಹಯೋಗಿ", desc: "Create with a squad", next: "Showcase once — masked is fine" },
  { level: 3, name: "Performer", kn: "ಕಲಾವಿದ", desc: "On stage or on display", next: "Guide one beginner" },
  { level: 4, name: "Mentor", kn: "ಗುರು", desc: "Guide the next wave", next: "You are the culture now" },
];

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const TIMES = ["13:00", "16:00", "17:00", "18:30"];
export const SLOTS = [...DAYS.flatMap((d) => TIMES.map((t) => `${d} ${t}`)), "Sat 07:00", "Sat 10:00", "Sat 15:00"];

export const DEPTS: Dept[] = ["CSE", "ISE", "ECE", "EEE", "MECH", "CIVIL", "AIML"];
// Simulated enrolment per department per year, used for participation rates.
export const ENROLLED: Record<Dept, number> = { CSE: 120, ISE: 60, ECE: 90, EEE: 60, MECH: 90, CIVIL: 60, AIML: 60 };

/* ---------- deterministic seed ---------- */
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = [
  "Ananya", "Rahul", "Sneha", "Kiran", "Pooja", "Vinayak", "Shreya", "Aditya", "Bhavana", "Chetan", "Divya", "Ganesh",
  "Harsha", "Ishaan", "Jyoti", "Karthik", "Lakshmi", "Manoj", "Nikhil", "Prajwal", "Rakshita", "Sagar", "Tanvi", "Uday",
  "Varsha", "Yashas", "Akshata", "Basavaraj", "Deepa", "Girish", "Keerthi", "Mahesh", "Nandini", "Omkar", "Pavan",
  "Rohini", "Sanjana", "Sudeep", "Tejas", "Vaishnavi", "Abhishek", "Amruta", "Darshan", "Megha", "Praveen", "Ramya",
  "Shashank", "Spoorthi", "Vivek", "Kavya", "Soumya", "Rohan", "Anusha", "Siddharth", "Pallavi", "Sameer",
];
const LAST = [
  "Patil", "Kulkarni", "Hegde", "Joshi", "Desai", "Naik", "Shetty", "Rao", "Gowda", "Kamath", "Bhat", "Hiremath",
  "Angadi", "Pujar", "Badiger", "Kattimani", "Shirol", "Deshpande", "Kalburgi", "Mathad", "Hosamani", "Jadhav",
];

const DIM_KEYS: Dim[] = ["rhythm", "melody", "visual", "verbal", "movement", "stage"];

export function discFit(dna: DNA, id: DisciplineId): number {
  const w = DISC_MAP[id].dims;
  let s = 0;
  let t = 0;
  for (const k of Object.keys(w) as Dim[]) {
    s += (w[k] ?? 0) * dna[k];
    t += w[k] ?? 0;
  }
  return s / t / 100;
}

function primaryFor(dna: DNA): DisciplineId {
  let best: DisciplineId = "vocal";
  let bs = -1;
  for (const d of DISCIPLINES) {
    const f = discFit(dna, d.id);
    if (f > bs) {
      bs = f;
      best = d.id;
    }
  }
  return best;
}

function buildStudents(): { students: Student[]; links: { source: string; target: string }[] } {
  const rand = mulberry32(2026);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const deptWeights: Dept[] = ["CSE", "CSE", "CSE", "ISE", "ISE", "ECE", "ECE", "EEE", "MECH", "MECH", "CIVIL", "AIML", "AIML"];
  const students: Student[] = [];
  for (let i = 0; i < 320; i++) {
    const dna = {} as DNA;
    for (const k of DIM_KEYS) dna[k] = Math.round(14 + rand() * 44);
    const strong = 1 + Math.floor(rand() * 2);
    for (let s = 0; s < strong; s++) {
      const k = pick(DIM_KEYS);
      dna[k] = Math.min(98, Math.round(dna[k] + 24 + rand() * 32));
    }
    const r = rand();
    const level = r < 0.36 ? 0 : r < 0.6 ? 1 : r < 0.8 ? 2 : r < 0.94 ? 3 : 4;
    const dept = pick(deptWeights);
    // Mechanical 3rd-years are deliberately under-represented, so the cockpit has a real gap to find.
    const year = dept === "MECH" && rand() < 0.85 ? pick([1, 2, 4]) : 1 + Math.floor(rand() * 4);
    const slots = new Set<string>();
    const n = 3 + Math.floor(rand() * 4);
    while (slots.size < n) slots.add(pick(SLOTS));
    students.push({
      id: `s${i}`,
      name: `${pick(FIRST)} ${pick(LAST)}`,
      dept,
      year,
      dna,
      primary: primaryFor(dna),
      level,
      events: level === 0 ? 0 : Math.round(level * 3 + rand() * level * 4),
      lastActiveDaysAgo: level === 0 ? 999 : Math.floor(rand() * (level >= 2 && rand() < 0.22 ? 60 : 20)),
      freeSlots: [...slots],
      hue: Math.floor(rand() * 360),
    });
  }
  const active = students.filter((s) => s.level >= 1);
  const links: { source: string; target: string }[] = [];
  const seen = new Set<string>();
  for (const s of active) {
    const k = 1 + Math.floor(rand() * Math.min(3, s.level + 1));
    for (let j = 0; j < k; j++) {
      const sameDisc = rand() < 0.55;
      const pool = sameDisc ? active.filter((o) => o.primary === s.primary && o.id !== s.id) : active;
      const o = pool.length ? pick(pool) : pick(active);
      if (o.id === s.id) continue;
      const key = [s.id, o.id].sort().join("-");
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ source: s.id, target: o.id });
    }
  }
  return { students, links };
}

const seeded = buildStudents();
export const STUDENTS = seeded.students;
export const COLLAB_LINKS = seeded.links;

/** Percentile of a score within the campus distribution for a dimension. */
export function percentile(dim: Dim, score: number): number {
  const below = STUDENTS.filter((s) => s.dna[dim] < score).length;
  return Math.round((below / STUDENTS.length) * 100);
}

export const EVENTS: SvmEvent[] = [
  { id: "e1", title: "Beat Basics — Percussion Circle", discipline: "instrument", type: "jam", slot: "Thu 16:00", durationMin: 45, venue: "SVM Room", level: "beginner", spots: 20, going: 11, desc: "Bring nothing but your hands. Cajón, tabla and table-top grooves, one beat at a time." },
  { id: "e2", title: "Open Mic Friday", discipline: "anchoring", type: "performance", slot: "Fri 17:00", durationMin: 90, venue: "Open Air Theatre", level: "open", spots: 40, going: 27, desc: "5 minutes, any art form. Sing, read, joke, beatbox — or just cheer." },
  { id: "e3", title: "Phone Photography Walk", discipline: "photo", type: "workshop", slot: "Sat 07:00", durationMin: 90, venue: "Campus → Unkal Lake", level: "beginner", spots: 25, going: 14, desc: "Golden-hour walk. Learn framing, leading lines and light using only your phone." },
  { id: "e4", title: "Kavi Goshti — Poetry Circle", discipline: "writing", type: "workshop", slot: "Wed 16:00", durationMin: 60, venue: "Library Lawn", level: "beginner", spots: 20, going: 9, desc: "Kannada, English, Hinglish — all welcome. Write together from one prompt." },
  { id: "e5", title: "Folk Fusion Dance Workshop", discipline: "dance", type: "workshop", slot: "Tue 17:00", durationMin: 60, venue: "Seminar Hall", level: "beginner", spots: 30, going: 18, desc: "Dollu Kunitha meets hip-hop. Two left feet are officially welcome." },
  { id: "e6", title: "Reel Editing in 30 Minutes", discipline: "video", type: "workshop", slot: "Mon 13:00", durationMin: 30, venue: "Lab 3", level: "beginner", spots: 30, going: 21, desc: "Cut a 15-sec reel on your phone during lunch break. Templates provided." },
  { id: "e7", title: "Sangeet Sandhya Auditions", discipline: "vocal", type: "performance", slot: "Sat 10:00", durationMin: 120, venue: "Auditorium", level: "experienced", spots: 25, going: 19, desc: "Auditions for the semester's flagship music evening." },
  { id: "e8", title: "Rangoli & Mandala Jam", discipline: "art", type: "jam", slot: "Wed 13:00", durationMin: 45, venue: "Main Foyer", level: "beginner", spots: 20, going: 8, desc: "Colours, chalk and calm. Create a collaborative floor piece in one lunch hour." },
  { id: "e9", title: "Improv Theatre Games", discipline: "theatre", type: "workshop", slot: "Thu 17:00", durationMin: 60, venue: "Seminar Hall", level: "beginner", spots: 24, going: 10, desc: "No scripts, no pressure. Games that build stage confidence fast." },
  { id: "e10", title: "Anchoring Bootcamp", discipline: "anchoring", type: "workshop", slot: "Tue 16:00", durationMin: 60, venue: "SVM Room", level: "open", spots: 15, going: 12, desc: "Voice, pause, crowd work. Leave with a 60-second intro you can use anywhere." },
  { id: "e11", title: "Unplugged Jam Night", discipline: "vocal", type: "jam", slot: "Fri 18:30", durationMin: 90, venue: "Campus Lawn", level: "open", spots: 50, going: 33, desc: "Acoustic, candles, chai. Join a song or just hum along." },
  { id: "e12", title: "Short Film in 48h — Kickoff", discipline: "video", type: "showcase", slot: "Sat 15:00", durationMin: 60, venue: "Seminar Hall", level: "open", spots: 60, going: 24, desc: "Form squads, get a secret theme, make a film by Monday." },
  // Micro-gigs: small, low-pressure backstage roles
  { id: "g1", title: "Design the Open Mic poster", discipline: "art", type: "gig", slot: "Anytime", durationMin: 30, venue: "Remote", level: "beginner", spots: 2, going: 1, role: "Design crew", desc: "Canva template ready. Make Friday look irresistible." },
  { id: "g2", title: "Sound-check crew — Open Mic", discipline: "instrument", type: "gig", slot: "Fri 16:00", durationMin: 30, venue: "Open Air Theatre", level: "beginner", spots: 3, going: 1, role: "Backstage", desc: "Help set up mics and test levels. Zero stage time, huge impact." },
  { id: "g3", title: "Shoot 5 candids at Open Mic", discipline: "photo", type: "gig", slot: "Fri 17:00", durationMin: 40, venue: "Open Air Theatre", level: "beginner", spots: 3, going: 0, role: "Photo crew", desc: "Phone is enough. Your 5 best shots go on SVM's page with credit." },
  { id: "g4", title: "Write 3 anchor one-liners", discipline: "writing", type: "gig", slot: "Anytime", durationMin: 20, venue: "Remote", level: "beginner", spots: 4, going: 2, role: "Script crew", desc: "Witty links between acts. The anchor reads them; you get credit." },
  { id: "g5", title: "Stage-lights assistant", discipline: "theatre", type: "gig", slot: "Sat 10:00", durationMin: 60, venue: "Auditorium", level: "beginner", spots: 2, going: 0, role: "Backstage", desc: "Learn the light board during auditions. See the stage from the other side." },
  { id: "g6", title: "Edit the 30-sec fest teaser", discipline: "video", type: "gig", slot: "Anytime", durationMin: 60, venue: "Remote", level: "open", spots: 2, going: 1, role: "Edit crew", desc: "Raw clips provided. Make the campus feel the hype." },
];

export const QUESTS: Quest[] = [
  {
    id: "q1", title: "Kannada Rap Music Video", tag: "Music × Film", by: "Rohan (ECE, 3rd yr)", due: "3 weeks",
    desc: "An original Kannada rap about hostel life — shot across campus, released on SVM's channel.",
    roles: [
      { role: "Lyricist", dim: "verbal", discipline: "writing" },
      { role: "Rapper / Vocalist", dim: "melody", discipline: "vocal", lead: true },
      { role: "Beatmaker", dim: "rhythm", discipline: "instrument" },
      { role: "Videographer", dim: "visual", discipline: "video" },
      { role: "Dancer", dim: "movement", discipline: "dance" },
    ],
  },
  {
    id: "q2", title: "Fest Theme Film — ‘Namma Campus’", tag: "Film × Words", by: "SVM Core Team", due: "2 weeks",
    desc: "A 2-minute film that opens the annual fest. Needs a story, a voice and a camera eye.",
    roles: [
      { role: "Script writer", dim: "verbal", discipline: "writing", lead: true },
      { role: "Cinematographer", dim: "visual", discipline: "video" },
      { role: "Narrator", dim: "stage", discipline: "anchoring" },
      { role: "Background score", dim: "melody", discipline: "instrument" },
    ],
  },
  {
    id: "q3", title: "Photo Story: Faces of Hubballi", tag: "Photo × Writing", by: "Spoorthi (CSE, 4th yr)", due: "10 days",
    desc: "Street portraits of the people who make our city, each with a 3-line story.",
    roles: [
      { role: "Lead photographer", dim: "visual", discipline: "photo", lead: true },
      { role: "Photographer", dim: "visual", discipline: "photo" },
      { role: "Story writer", dim: "verbal", discipline: "writing" },
      { role: "Exhibition designer", dim: "visual", discipline: "art" },
    ],
  },
  {
    id: "q4", title: "Freshers' Day Flash Mob", tag: "Dance × Beats", by: "SVM Dance Crew", due: "12 days",
    desc: "A surprise 3-minute flash mob in the canteen. Beginners are the secret weapon.",
    roles: [
      { role: "Choreographer", dim: "movement", discipline: "dance", lead: true },
      { role: "Dancer", dim: "movement", discipline: "dance" },
      { role: "Dancer", dim: "movement", discipline: "dance" },
      { role: "Beat / DJ", dim: "rhythm", discipline: "instrument" },
      { role: "Video crew", dim: "visual", discipline: "video" },
    ],
  },
];

export const MASK_POSTS: MaskPost[] = [
  { id: "m1", alias: "Quiet Comet", kind: "text", title: "Lab Record", text: "Between two lab records\nI hid a sunset\nnobody graded.", reactions: { heart: 41, fire: 12, wow: 9, clap: 18 }, comments: ["‘nobody graded’ hit hard 🥲", "This deserves a stage at Open Mic."], hoursAgo: 3 },
  { id: "m2", alias: "Midnight Raga", kind: "tune", title: "Hostel corridor hum", notes: [["E4", 0.35], ["G4", 0.35], ["A4", 0.6], ["G4", 0.3], ["E4", 0.3], ["D4", 0.6], ["E4", 0.35], ["G4", 0.35], ["C5", 0.8], ["A4", 0.9]], reactions: { heart: 29, fire: 22, wow: 7, clap: 11 }, comments: ["Stuck in my head now!", "Someone add lyrics to this 🙏"], hoursAgo: 7 },
  { id: "m3", alias: "Ink Monsoon", kind: "text", title: "ಮಳೆ (Rain)", text: "ಮಳೆ ಬಂದಾಗ ಮನಸು ಹಾಡುತ್ತದೆ —\nthe canteen roof keeps time,\nand I forget the syllabus.", reactions: { heart: 52, fire: 15, wow: 20, clap: 24 }, comments: ["Kannada + English blend is beautiful", "‘the canteen roof keeps time’ ✨"], hoursAgo: 11 },
  { id: "m4", alias: "Pixel Peacock", kind: "sketch", title: "Doodle from DSA class", seed: 7, reactions: { heart: 33, fire: 9, wow: 14, clap: 10 }, comments: ["The colours are so calm.", "Would love this as a fest poster!"], hoursAgo: 15 },
  { id: "m5", alias: "Golden Hour", kind: "scene", title: "Unkal at 6:12 pm", seed: 3, reactions: { heart: 61, fire: 30, wow: 25, clap: 19 }, comments: ["That horizon placement 👌", "Join the photo walk please!!"], hoursAgo: 20, unmasked: "Prajwal Hegde (MECH, 2nd yr)" },
  { id: "m6", alias: "Paper Tabla", kind: "tune", title: "Desk-drum loop", notes: [["C4", 0.2], ["C4", 0.2], ["G4", 0.4], ["C4", 0.2], ["E4", 0.2], ["G4", 0.4], ["A4", 0.25], ["G4", 0.25], ["E4", 0.5]], reactions: { heart: 18, fire: 26, wow: 6, clap: 13 }, comments: ["Groove is real 🔥"], hoursAgo: 26 },
  { id: "m7", alias: "Chalk Whisper", kind: "sketch", title: "Rangoli study #2", seed: 19, reactions: { heart: 27, fire: 6, wow: 17, clap: 9 }, comments: ["So symmetrical!", "Teach us at the Rangoli Jam?"], hoursAgo: 31 },
];

export const DEMO_PROFILE: Profile = {
  name: "Ananya Kulkarni",
  dept: "CSE",
  year: 2,
  dna: { rhythm: 88, melody: 52, visual: 61, verbal: 70, movement: 45, stage: 28 },
  sparkDone: true,
  declared: ["writing"],
  hiddenSpark: "rhythm",
  freeSlots: ["Mon 13:00", "Wed 16:00", "Thu 16:00", "Fri 17:00", "Sat 07:00"],
  examMode: false,
  level: 0,
  stamps: [],
  joined: [],
  quests: [],
  contributions: [{ title: "Took the Creative Spark", kind: "spark", date: "Today", points: 10 }],
  myPosts: [],
  streakWeeks: 0,
};

export const EMPTY_PROFILE: Profile = {
  ...DEMO_PROFILE,
  name: "",
  dna: { rhythm: 0, melody: 0, visual: 0, verbal: 0, movement: 0, stage: 0 },
  sparkDone: false,
  declared: [],
  hiddenSpark: null,
  contributions: [],
};

/* ---------- simulated history for analytics ---------- */
export const MONTHLY = [
  { month: "Jun", active: 46, events: 3, newcomers: 5 },
  { month: "Jul", active: 52, events: 4, newcomers: 8 },
  { month: "Aug", active: 61, events: 5, newcomers: 11 },
  { month: "Sep", active: 118, events: 9, newcomers: 49 },
  { month: "Oct", active: 167, events: 14, newcomers: 58 },
  { month: "Nov", active: 205, events: 18, newcomers: 41 },
];
