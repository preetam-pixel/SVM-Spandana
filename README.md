# SVM Spandana (ಸ್ಪಂದನ) — *Find your art. Find your people.*

An intelligent talent-discovery and engagement ecosystem for **Sangeet Vrinda x Madhyam (SVM)**, KLE Institute of Technology.

> Students don't lack talent. They lack a **safe first step**, a reason that **fits their timetable**, and **someone to do it with**.
> Clubs ask "what's your talent?" on day one — the students SVM most needs can't answer that. Spandana discovers talent through **play, not forms**.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Works on any phone browser (mic + touch supported).

### AI keys (optional)

The app is **fully functional without any key** — every AI feature has a built-in offline fallback, and a circuit breaker
skips a failing provider so the demo never stalls. Copy `.env.example` → `.env` and add **one** key:

| Provider | Where to get it | Notes |
|---|---|---|
| **Claude** (`ANTHROPIC_API_KEY`) | https://console.anthropic.com → Settings → API Keys | Best quality; needs a few dollars of credits. Uses `claude-opus-5-5`. |
| **Gemini** (`GEMINI_API_KEY`) | https://aistudio.google.com/apikey | Free tier. Tries `gemini-3-flash-preview` → `gemini-3.5-flash` → `gemini-flash-latest`. |

Every AI response shows a small badge (Claude AI / Gemini AI / Offline AI) so judges can see what's live.

### Accounts, OTP and database

- **Register / Login with mobile OTP** (`/register`, `/login`). Indian 10-digit numbers; codes expire in 5 minutes, 5 tries max, 5 sends per 15 minutes.
- **Demo mode (default):** with no SMS provider configured, the OTP is shown on screen and printed in the server console.
- **Real SMS:** set the three `TWILIO_*` variables in `.env` (Twilio Verify; free trial texts numbers you've verified in the Twilio console).
- **Demo account:** "Explore with a demo account" on the home page, or log in with `90000 00001`.
- **Database:** SQLite file at `data/spandana.db` (Node's built-in `node:sqlite`, no install). Tables: `users`, `sessions`, `otps`, `posts`, `comments`. Uploaded photos, music and reels are stored in `data/uploads/` and streamed via `/api/media/…` with seeking support. Delete the `data/` folder to start fresh; it re-seeds on next start.

## What's inside — mapped to the problem statement

| Problem-statement direction | Spandana feature | Where |
|---|---|---|
| Intelligent Talent Discovery | **Creative Spark** — 5 micro-games (Rhythm Echo tap test, Pitch Match via real mic pitch detection, Frame-It rule-of-thirds crop, AI-scored Finish-the-Verse, Vibe Check) → **Creative DNA** radar across 6 dimensions + a **hidden spark** (strongest skill you *didn't* claim) with campus percentile | `/spark` |
| Personalized Engagement | **Pulse feed** — explainable recommendations ("why you're seeing this") ranked by DNA fit, **timetable free slots**, comfort level and passport novelty | `/home` |
| Inclusive Participation | **Mask Mode** — upload photos, music, reels and writing anonymously, AI-moderated kind comments, no downvotes, **unmask when ready**. **Confidence Ladder** Explorer → Crew → Collaborator → Performer → Mentor | `/stage`, `/passport` |
| Participation & Motivation | **Micro-gigs** (20–60 min backstage roles), **Exam Mode** (freezes streaks, short sessions only), **Kala Passport** stamps for trying each of 9 art forms, **no global leaderboard** (it discourages beginners) | `/home`, `/passport` |
| Community Building | **AI Squad Builder** — cross-discipline teams balancing skill, shared free time, branch diversity and a beginner/expert mix; live **Creative Constellation** network graph | `/squads` |
| Talent Development | **Guru** AI mentor chat, AI **4-week learning paths**, **Guru–Shishya** peer-mentor matching by shared free slots | `/guru` |
| Recognition | **Cultural Portfolio** — verified contributions, backstage credited equal to stage, indicative AICTE/VTU activity-point mapping, save as PDF | `/passport` |
| Event & Activity Intelligence | **AI Event Planner** — roles (incl. first-timer roles), timeline, bilingual promo; **turnout prediction** model; **targeted invites** to matching Explorers free at that slot | `/cockpit` → AI Event Planner |
| Engagement Analytics | Growth trend, participation **funnel**, dept × year **heatmap with gap detection**, art-form mix, **churn-risk** regulars, AI weekly insights | `/cockpit` |
| Hidden talent outreach | **Talent Radar** — students with high DNA scores who have *never* participated, with personal invite | `/cockpit` → Talent Radar |
| Experiential Engagement | **Live Stage** — projector applause meter, audience emoji reactions, Audience Choice voting, "first time on stage" spotlight | `/live` |

## 5-minute demo script

1. **Landing** → "Everyone has a spark." Hand a judge your phone: **Start Creative Spark**. Let them tap the rhythm and frame the photo.
2. **DNA reveal** → archetype + hidden spark ("higher than 85% of campus — and you never listed it").
3. Or click **Try the demo student** (Ananya, CSE 2nd yr, signed up for writing — hidden spark: Rhythm).
4. **Pulse** → top pick is a 45-min percussion circle in her only free slot, with reasons. Tap *I'm in* → points, passport stamp, level up. Toggle **Exam Mode**.
5. **Mask Mode** → compose a tune on the pad, post anonymously, watch reactions arrive, **Unmask**.
6. **Squads** → *Build my squad* on the Kannada rap video → AI names the squad, *Join* → gold links light up on the constellation.
7. **Organizer Cockpit** → heatmap finds the 3rd-year Civil/Mech gap, Talent Radar finds dormant rhythm talent, AI Event Planner predicts turnout and drafts the plan with a Kannada promo line.
8. **Live Stage** → applause meter for first-time performers.

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · react-force-graph · Web Audio API (drum synth, tone generation, autocorrelation pitch detection) · Claude API (`@anthropic-ai/sdk`) / Gemini REST with offline fallback.

- `src/lib/engine.ts` — explainable recommendation scoring, squad builder, Creative DNA, analytics, turnout model
- `src/lib/data.ts` — deterministic seeded campus (320 students, events, quests, showcase)
- `src/app/api/ai/route.ts` — AI gateway (Claude → Gemini → offline) with circuit breaker
- `src/lib/audio.ts` — Web Audio toolkit

**Honesty note:** student records, analytics history and Mask Mode reactions on your own posts are **simulated demo data** (labelled in the UI). Profile state is stored in the browser's localStorage.
