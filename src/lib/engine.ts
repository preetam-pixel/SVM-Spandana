import { DEPTS, DIMS, DIM_MAP, DISC_MAP, ENROLLED, EVENTS, STUDENTS, discFit } from "./data";
import type { Dim, DNA, Profile, Quest, QuestRole, Student, SvmEvent } from "./types";

/* ---------------- Creative DNA ---------------- */

const ARCHETYPES: Record<string, string> = {
  "rhythm-verbal": "The Beat Poet",
  "rhythm-visual": "The Visual Drummer",
  "rhythm-melody": "The Groove Maker",
  "rhythm-movement": "The Pulse Dancer",
  "rhythm-stage": "The Show Starter",
  "melody-verbal": "The Songwriter",
  "melody-visual": "The Mood Painter",
  "melody-movement": "The Lyrical Mover",
  "melody-stage": "The Voice of the Fest",
  "visual-verbal": "The Story Framer",
  "visual-movement": "The Choreo Eye",
  "visual-stage": "The Spotlight Designer",
  "verbal-movement": "The Expressive Storyteller",
  "verbal-stage": "The Born Anchor",
  "movement-stage": "The Stage Mover",
};

export function topDims(dna: DNA, n = 2): Dim[] {
  return (Object.keys(dna) as Dim[]).sort((a, b) => dna[b] - dna[a]).slice(0, n);
}

export function archetype(dna: DNA): string {
  const order = DIMS.map((d) => d.key);
  const [a, b] = topDims(dna).sort((x, y) => order.indexOf(x) - order.indexOf(y));
  return ARCHETYPES[`${a}-${b}`] ?? "The Creative Explorer";
}

/** Strongest dimension the student did NOT already claim as an interest: their hidden spark. */
export function findHiddenSpark(dna: DNA, declared: string[]): Dim {
  const claimed = new Set<Dim>();
  for (const id of declared) {
    const w = DISC_MAP[id as keyof typeof DISC_MAP]?.dims ?? {};
    for (const [k, v] of Object.entries(w)) if ((v ?? 0) >= 0.8) claimed.add(k as Dim);
  }
  const ranked = (Object.keys(dna) as Dim[]).sort((a, b) => dna[b] - dna[a]);
  return ranked.find((d) => !claimed.has(d)) ?? ranked[0];
}

/* ---------------- Recommendations ---------------- */

export interface Rec {
  event: SvmEvent;
  score: number;
  match: number;
  reasons: string[];
}

export function recommend(p: Profile, events: SvmEvent[] = EVENTS): Rec[] {
  return events
    .map((event) => {
      const disc = DISC_MAP[event.discipline];
      const dnaFit = discFit(p.dna, event.discipline);
      const slotFit = event.slot === "Anytime" ? 1 : p.freeSlots.includes(event.slot) ? 1 : 0;
      const levelFit =
        p.level <= 1
          ? event.level === "beginner" ? 1 : event.level === "open" ? 0.6 : 0.1
          : event.level === "experienced" ? 1 : 0.75;
      const novelty = p.stamps.includes(event.discipline) ? 0.35 : 1;
      const spark = p.hiddenSpark && (disc.dims[p.hiddenSpark] ?? 0) >= 0.8 ? 0.15 : 0;
      let score = 0.45 * dnaFit + 0.25 * slotFit + 0.15 * levelFit + 0.15 * novelty + spark;
      const reasons: string[] = [];
      if (spark) reasons.push(`Uses your hidden spark — ${DIM_MAP[p.hiddenSpark!].label}`);
      const lead = (Object.keys(disc.dims) as Dim[]).sort((a, b) => (disc.dims[b] ?? 0) - (disc.dims[a] ?? 0))[0];
      if (dnaFit >= 0.55 && !spark) reasons.push(`Matches your ${DIM_MAP[lead].label} (${p.dna[lead]})`);
      if (event.slot === "Anytime") reasons.push(`Do it anytime · ~${event.durationMin} min`);
      else if (slotFit) reasons.push(`You're free ${event.slot}`);
      if (event.level === "beginner" && p.level <= 1) reasons.push("Beginner-friendly — no experience needed");
      if (!p.stamps.includes(event.discipline)) reasons.push(`New passport stamp: ${disc.name}`);
      if (p.examMode) {
        if (event.durationMin <= 45) reasons.unshift("Short enough for exam week");
        else score *= 0.45;
      }
      return { event, score, match: Math.max(8, Math.min(99, Math.round((score / 1.05) * 100))), reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score);
}

/* ---------------- Squad builder ---------------- */

export interface SquadMember {
  student: Student | null; // null = the current user
  name: string;
  dept: string;
  year: number;
  level: number;
  role: QuestRole;
  fit: number;
  why: string[];
}

export interface Squad {
  members: SquadMember[];
  coverage: number;
  bestSlot: string;
  slotFree: number;
  depts: number;
  beginners: number;
  experienced: number;
}

export function buildSquad(q: Quest, me?: Profile): Squad {
  const used = new Set<string>();
  const members: SquadMember[] = [];
  let roles = [...q.roles];

  if (me) {
    const best = roles.reduce((b, r) => (me.dna[r.dim] > me.dna[b.dim] ? r : b), roles[0]);
    members.push({
      student: null, name: `${me.name.split(" ")[0]} (you)`, dept: me.dept, year: me.year, level: me.level,
      role: best, fit: me.dna[best.dim], why: [`Your ${DIM_MAP[best.dim].label} score is ${me.dna[best.dim]}`],
    });
    roles = roles.filter((r) => r !== best);
  }

  const slotsOf = (m: SquadMember) => (m.student ? m.student.freeSlots : me?.freeSlots ?? []);

  for (const role of roles) {
    let best: Student | null = null;
    let bestScore = -1;
    let bestWhy: string[] = [];
    const teamDepts = new Set(members.map((m) => m.dept));
    const hasBeginner = members.some((m) => m.level <= 1);
    const teamSlots = members.flatMap(slotsOf);
    for (const s of STUDENTS) {
      if (used.has(s.id)) continue;
      const skill = s.dna[role.dim] / 100;
      const overlap = s.freeSlots.filter((x) => teamSlots.includes(x)).length;
      const avail = members.length ? Math.min(1, overlap / 3) : 0.5;
      const diversity = teamDepts.has(s.dept) ? 0 : 1;
      let mix = 0;
      if (role.lead) mix = s.level >= 3 ? 1 : 0;
      else if (!hasBeginner) mix = s.level <= 1 ? 1 : 0;
      else mix = s.level >= 1 && s.level <= 3 ? 0.6 : 0.3;
      const score = 0.5 * skill + 0.2 * avail + 0.12 * diversity + 0.18 * mix;
      if (score > bestScore) {
        bestScore = score;
        best = s;
        const why = [`${DIM_MAP[role.dim].label} ${s.dna[role.dim]}`];
        if (role.lead && s.level >= 3) why.push("experienced lead");
        if (!role.lead && s.level <= 1 && !hasBeginner) why.push("rising beginner");
        if (diversity) why.push(`brings ${s.dept} perspective`);
        if (overlap >= 2) why.push(`${overlap} shared free slots`);
        bestWhy = why;
      }
    }
    if (best) {
      used.add(best.id);
      members.push({ student: best, name: best.name, dept: best.dept, year: best.year, level: best.level, role, fit: best.dna[role.dim], why: bestWhy });
    }
  }

  const counts = new Map<string, number>();
  for (const m of members) for (const s of slotsOf(m)) counts.set(s, (counts.get(s) ?? 0) + 1);
  const [bestSlot, slotFree] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["Sat 15:00", 0];
  return {
    members,
    coverage: Math.round(members.reduce((a, m) => a + m.fit, 0) / members.length),
    bestSlot,
    slotFree,
    depts: new Set(members.map((m) => m.dept)).size,
    beginners: members.filter((m) => m.level <= 1).length,
    experienced: members.filter((m) => m.level >= 3).length,
  };
}

/* ---------------- Ladder ---------------- */

export function levelFor(p: Profile): number {
  const n = p.contributions.filter((c) => c.kind !== "spark").length;
  const showcased = p.myPosts.length > 0 || p.contributions.some((c) => c.kind === "showcase");
  if (n >= 3 && showcased) return Math.max(p.level, 3);
  if (n >= 3) return Math.max(p.level, 2);
  if (n >= 1) return Math.max(p.level, 1);
  return p.level;
}

export function points(p: Profile): number {
  return p.contributions.reduce((a, c) => a + c.points, 0);
}

/* ---------------- Analytics ---------------- */

export function funnel() {
  const total = STUDENTS.length;
  return [
    { stage: "Took Creative Spark", value: total },
    { stage: "First step", value: STUDENTS.filter((s) => s.level >= 1).length },
    { stage: "Regular (3+)", value: STUDENTS.filter((s) => s.level >= 2).length },
    { stage: "Performer", value: STUDENTS.filter((s) => s.level >= 3).length },
    { stage: "Mentor", value: STUDENTS.filter((s) => s.level >= 4).length },
  ];
}

export function heatmap() {
  return DEPTS.map((dept) => ({
    dept,
    years: [1, 2, 3, 4].map((year) => {
      const active = STUDENTS.filter((s) => s.dept === dept && s.year === year && s.level >= 1).length;
      return { year, active, rate: Math.round((active / ENROLLED[dept]) * 1000) / 10 };
    }),
  }));
}

export function gaps() {
  return heatmap()
    .flatMap((r) => r.years.map((y) => ({ dept: r.dept, year: y.year, rate: y.rate, active: y.active })))
    .filter((c) => c.rate < 4)
    .sort((a, b) => a.rate - b.rate);
}

export function churnRisk() {
  return STUDENTS.filter((s) => s.level >= 2 && s.lastActiveDaysAgo > 21).sort((a, b) => b.level - a.level);
}

export function disciplineMix() {
  const counts = new Map<string, number>();
  for (const s of STUDENTS.filter((x) => x.level >= 1)) counts.set(s.primary, (counts.get(s.primary) ?? 0) + 1);
  return [...counts.entries()].map(([id, value]) => ({ id, name: DISC_MAP[id as keyof typeof DISC_MAP].name, value, color: DISC_MAP[id as keyof typeof DISC_MAP].color })).sort((a, b) => b.value - a.value);
}

/** Students with a strong score in a dimension who have never participated: untapped talent. */
export function dormantTalent(dim: Dim, min = 70) {
  return STUDENTS.filter((s) => s.level === 0 && s.dna[dim] >= min).sort((a, b) => b.dna[dim] - a.dna[dim]);
}

export function crossDisciplineRate(links: { source: string; target: string }[]) {
  const byId = new Map(STUDENTS.map((s) => [s.id, s]));
  const cross = links.filter((l) => byId.get(l.source)?.primary !== byId.get(l.target)?.primary).length;
  return Math.round((cross / Math.max(1, links.length)) * 100);
}

/** Simple, explainable turnout model for the event planner. */
export function predictTurnout(opts: { discipline: keyof typeof DISC_MAP; slot: string; examWeek: boolean; level: string }) {
  const interested = STUDENTS.filter((s) => discFit(s.dna, opts.discipline) >= 0.55);
  const free = interested.filter((s) => s.freeSlots.includes(opts.slot));
  const base = free.length * 0.55 + (interested.length - free.length) * 0.12;
  const levelMul = opts.level === "beginner" ? 1.15 : opts.level === "experienced" ? 0.6 : 1;
  const examMul = opts.examWeek ? 0.45 : 1;
  const expected = Math.round(base * levelMul * examMul);
  return { interested: interested.length, free: free.length, expected, low: Math.round(expected * 0.8), high: Math.round(expected * 1.2) };
}
