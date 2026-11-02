/* Offline "AI" used when no API key is configured or a call fails, so the demo never breaks. */
import { DISC_MAP, DIM_MAP } from "./data";
import type { AiTask, Dim, DisciplineId } from "./types";

type Json = Record<string, unknown>;

const SENSORY = ["smell", "taste", "warm", "cold", "light", "dark", "rain", "sound", "silence", "gold", "blue", "red", "soft", "sharp", "whisper", "echo", "glow", "chai", "night", "sun", "moon", "wind", "ink", "dust", "colour", "color"];

function verse(p: Json) {
  const text = String(p.text ?? "").trim();
  const words = text.toLowerCase().match(/[\p{L}']+/gu) ?? [];
  const unique = new Set(words).size / Math.max(1, words.length);
  const sensory = words.filter((w) => SENSORY.some((s) => w.startsWith(s))).length;
  const figurative = /\b(like|as if|as though|became|is a|was a)\b/i.test(text) ? 1 : 0;
  const lenScore = words.length < 4 ? 0.3 : words.length <= 30 ? 1 : 0.75;
  const imagery = Math.min(100, Math.round(40 + sensory * 15 + figurative * 20));
  const originality = Math.min(100, Math.round(35 + unique * 45 + (figurative ? 10 : 0)));
  const feeling = Math.min(100, Math.round(45 + lenScore * 25 + (/[!?…—]/.test(text) ? 10 : 0)));
  const score = Math.round((imagery + originality + feeling) / 3);
  const feedback =
    sensory > 0
      ? "You write through the senses — that's what makes a line stay with people. Try ending on an unexpected image."
      : figurative
        ? "Nice comparison! Add one concrete detail (a sound, a smell) to make it unforgettable."
        : "Good instinct. Next time, swap one abstract word for something we can see or hear.";
  return { score, imagery, originality, feeling, feedback };
}

const PATHS: Record<DisciplineId, [string, string, string][]> = {
  vocal: [["Find your range", "Hum scales for 5 min daily", "Record one line of a song you love"], ["Breath & pitch", "Practise 4-count belly breathing", "Match 5 notes with a tuner app"], ["Sing with others", "Join Unplugged Jam Night as chorus", "Learn one harmony line"], ["First small stage", "Sing 1 verse at Open Mic (masked practice first)", "Ask a mentor for one tip"]],
  instrument: [["Feel the pulse", "Clap along to 3 songs at 3 tempos", "Tap Rhythm Echo patterns daily"], ["Basic grooves", "Learn 2 cajón / tabla bols", "Join Beat Basics circle"], ["Play in a group", "Keep a steady beat for 2 min in a jam", "Record a desk-drum loop"], ["Accompany", "Back a singer for one song", "Volunteer on sound-check crew"]],
  dance: [["Body awareness", "10-min freestyle to one song daily", "Mirror a short reel move"], ["Foundations", "Learn 4 basic steps at Folk Fusion", "Count music in 8s"], ["Flow & expression", "Link steps into a 30-sec piece", "Film and rewatch once"], ["Group performance", "Join the Freshers' Flash Mob", "Teach one move to a friend"]],
  photo: [["See light", "Shoot the same spot at 3 times of day", "Study one photo you love"], ["Composition", "Practise rule of thirds × 10 shots", "Join the Photo Walk"], ["Story in frames", "Make a 5-photo story", "Get feedback in Mask Mode"], ["Publish", "Shoot candids at Open Mic", "Curate your best 3 for SVM's page"]],
  video: [["Shot basics", "Film 5 shots: wide, mid, close, over-shoulder, detail", "Watch one reel frame by frame"], ["Editing rhythm", "Cut a 15-sec reel on beat", "Join Reel Editing in 30 Minutes"], ["Story", "Plan a 30-sec story with 6 shots", "Pair with a writer"], ["Release", "Edit the fest teaser micro-gig", "Join the 48h Short Film squad"]],
  art: [["Daily doodle", "5-min sketch every day", "Copy one artist's style for fun"], ["Colour & form", "Make a 3-colour palette piece", "Join the Rangoli Jam"], ["Design for a cause", "Design the Open Mic poster micro-gig", "Get peer feedback"], ["Exhibit", "Post a series of 3 in Mask Mode", "Collaborate with a photographer"]],
  writing: [["Write small", "One 3-line poem a day", "Read 2 poets you haven't before"], ["Imagery", "Rewrite a line using only senses", "Join Kavi Goshti"], ["Voice", "Try one bilingual Kannada–English piece", "Share it masked"], ["Perform or publish", "Write anchor one-liners micro-gig", "Read one piece at Open Mic"]],
  anchoring: [["Voice warm-up", "Read aloud 5 min daily", "Record a 30-sec self-intro"], ["Pause & presence", "Practise 3 power pauses", "Join Anchoring Bootcamp"], ["Crowd work", "Host a small squad meeting", "Write 5 transition lines"], ["Host a segment", "Co-anchor one Open Mic segment", "Get mentor feedback"]],
  theatre: [["Play first", "Join Improv Theatre Games", "Observe people for 10 min"], ["Voice & body", "Practise projection and posture", "Act out a 1-min monologue"], ["Ensemble", "Do a 2-person scene", "Assist on stage lights micro-gig"], ["Perform", "Join a short skit at Open Mic", "Reflect with a mentor"]],
};

function path(p: Json) {
  const d = (p.discipline as DisciplineId) ?? "writing";
  const disc = DISC_MAP[d] ?? DISC_MAP.writing;
  const weeks = (PATHS[d] ?? PATHS.writing).map(([focus, a, b], i) => ({ week: i + 1, focus, tasks: [a, b] }));
  return {
    title: `${disc.name}: from zero to first stage`,
    weeks,
    mentorTip: `Every ${disc.name.toLowerCase()} performer you admire was once a beginner. 20 focused minutes, 4 days a week, beats one long session.`,
  };
}

function guru(p: Json) {
  const m = String(p.message ?? "").toLowerCase();
  const spark = p.spark as Dim | undefined;
  const sparkLabel = spark ? DIM_MAP[spark]?.label : "your strongest area";
  if (/(nervous|scared|fear|shy|confiden|judge|embarrass)/.test(m))
    return { reply: `Stage fear is normal — even seasoned performers feel it. Start invisible: post something in Mask Mode and let people react before anyone knows it's you. Then try a backstage micro-gig to feel the stage without being on it. Confidence is built in small reps, not one big leap. 🌱` };
  if (/(start|begin|never|no talent|beginner|where do i)/.test(m))
    return { reply: `Your Creative DNA says your hidden spark is ${sparkLabel}. My suggestion: one beginner session this week that uses it, plus one 20-minute micro-gig. No experience needed — SVM's beginner sessions are designed for exactly where you are.` };
  if (/(time|exam|busy|study|marks|internal)/.test(m))
    return { reply: `Academics first — always. Turn on Exam Mode and I'll only show sessions under 45 minutes, and your streak freezes automatically. Even 20 minutes of something creative a week helps you de-stress, and every contribution counts toward your activity points.` };
  if (/(team|friend|alone|people|group|collab)/.test(m))
    return { reply: `You don't have to do it alone. Open Squads — I can build a team around a project where your ${sparkLabel} skill fills a gap, mixed with people from other branches who are free when you are.` };
  if (/(song|sing|music|guitar|tabla|drum)/.test(m))
    return { reply: `Love that! Try the Percussion Circle or Unplugged Jam Night — both are beginner-friendly. Want a 4-week learning path? Tap "Build my path" above.` };
  return { reply: `Great question! Based on your Creative DNA I'd lean into ${sparkLabel} first. Check your Pulse feed — I've ranked activities that fit your free time and comfort level. Anything specific you're curious about?` };
}

function squad(p: Json) {
  const title = String(p.title ?? "Project");
  const roles = (p.roles as string[]) ?? [];
  const names = ["Neon Nadi", "Chai & Chords", "Frame Theory", "Golden Hour Gang", "Beat Basavas", "Midnight Mosaic"];
  const name = names[title.length % names.length];
  return {
    name,
    pitch: `${name} blends ${roles.slice(0, 3).join(", ")} across ${p.depts ?? "several"} branches — a balanced mix of experience and fresh energy, all free at the same time. Built to finish ${title} on schedule.`,
  };
}

function plan(p: Json) {
  const title = String(p.title ?? "SVM Event");
  const d = (p.discipline as DisciplineId) ?? "vocal";
  const disc = DISC_MAP[d] ?? DISC_MAP.vocal;
  return {
    tagline: `${title} — where every kind of talent gets a stage.`,
    roles: [
      { role: "Event lead", count: 1, note: "Experienced member (Performer/Mentor)" },
      { role: `${disc.name} performers`, count: 8, note: "Mix of 5 regulars + 3 first-timers" },
      { role: "Anchors", count: 2, note: "One experienced, one from Anchoring Bootcamp" },
      { role: "Backstage & sound crew", count: 4, note: "Ideal micro-gigs for Explorers" },
      { role: "Photo / video crew", count: 3, note: "Phone shooters welcome" },
      { role: "Design & promo", count: 2, note: "Posters, reels, countdown stories" },
    ],
    timeline: [
      { when: "T-14 days", task: "Lock venue & slot avoiding internals; open role sign-ups" },
      { when: "T-10 days", task: "Send personalised invites to matched dormant talent" },
      { when: "T-7 days", task: "Pair first-timers with mentors; first rehearsal" },
      { when: "T-3 days", task: "Teaser reel + poster drop; confirm crew" },
      { when: "T-0", task: "Event, live reactions on, capture candids" },
      { when: "T+2 days", task: "Publish highlights, credit every contributor, send thank-yous" },
    ],
    promo: `🎶 ${title} is coming! No experience? Perfect. Perform, crew, shoot or just vibe — there's a role for you. Find yours on Spandana.`,
    promoKn: `ಬನ್ನಿ, ನಿಮ್ಮ ಕಲೆಗೆ ವೇದಿಕೆ ಸಿದ್ಧವಾಗಿದೆ!`,
  };
}

const HARSH = ["bad", "worst", "trash", "cringe", "stupid", "ugly", "boring", "lame", "pathetic", "terrible", "useless", "hate"];

function kind(p: Json) {
  const text = String(p.text ?? "");
  const hit = HARSH.find((w) => new RegExp(`\\b${w}\\b`, "i").test(text));
  if (!hit) return { ok: true, suggestion: "" };
  return { ok: false, suggestion: "Try framing it as what could make it even better — e.g. “I'd love to hear this with a slower ending!”" };
}

function insight(p: Json) {
  const g = (p.gaps as { dept: string; year: number }[]) ?? [];
  const churn = Number(p.churn ?? 0);
  const top = String(p.topDiscipline ?? "Vocal Music");
  const low = String(p.lowDiscipline ?? "Theatre");
  return {
    insights: [
      g.length ? `Engagement gap: ${g.slice(0, 2).map((x) => `${x.dept} year ${x.year}`).join(" and ")} have almost no participation. Run a lunch-hour micro-event in their block.` : "No major department gaps this week — keep the momentum.",
      `${churn} regulars have gone quiet for 3+ weeks. A personal message from their squad mates works better than a broadcast.`,
      `${top} dominates participation while ${low} is under-represented. Pair a ${low} workshop with a popular ${top} event.`,
      "Newcomers who join a squad within 2 weeks are far more likely to stay. Prioritise squad invites for first-timers.",
    ],
  };
}

export function offline(task: AiTask, payload: Json): Json {
  switch (task) {
    case "verse": return verse(payload);
    case "path": return path(payload);
    case "guru": return guru(payload);
    case "squad": return squad(payload);
    case "plan": return plan(payload);
    case "kind": return kind(payload);
    case "insight": return insight(payload);
  }
}
