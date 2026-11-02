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

### Database, authentication and storage (Supabase)

Spandana uses **Supabase**: hosted Postgres for data, Supabase Auth for phone-OTP login (JWT sessions in secure cookies), and Supabase Storage for uploaded photos, music and reels.

**1. Create the project.** At https://supabase.com, click **New project**, pick region **Mumbai (ap-south-1)**, and set a database password.

**2. Create the tables.** Go to **SQL Editor → New query**, paste [supabase/schema.sql](supabase/schema.sql) and click **Run**. This creates `profiles`, `posts`, `comments`, `friendships`, `events`, `event_signups`, `event_invites`, `recognitions` and `announcements` (all with RLS on), the `add_reaction` function, the public `media` storage bucket, seed showcase posts and three sample upcoming events. *Already ran an older `schema.sql`?* Run the files in [supabase/migrations](supabase/migrations) you haven't run yet, in order (`002_friends.sql`, `003_events_achievements.sql`, `004_club_opportunities.sql`, `005_endorsements.sql`). Until you do, the rest of the app keeps working and those features show what to run.

**3. Turn on phone OTP.** Go to **Authentication → Sign In / Providers → Phone** and enable it.
- **Real SMS:** choose **Twilio Verify**. Get the Account SID and Auth Token from https://console.twilio.com, and the Verify Service SID from **Verify → Services → Create new**. A Twilio trial only texts numbers you've verified in Twilio.
- **Judging without SMS:** in the same panel, add **Test Phone Numbers and OTPs**, e.g. `919000000002=123456`. Logging in with that number accepts code `123456` and sends no SMS.

**4. Add the keys.** Copy the URL and keys from **Project Settings → API** into `.env` (see [.env.example](.env.example)), then restart `npm run dev`.

**5. Make the first SVM core member.** Register in the app with your mobile number, then run this in the SQL editor:

```sql
update public.profiles set role = 'core' where phone = '+919876543210';  -- your number
```

Core members can post events and notices, invite members, mark attendance and give recognitions. They can promote other members from their profile page ("Make core member").

**Demo accounts:** "Explore with a demo account" on the home page signs in to a shared demo student; "as an SVM core member" signs in to a shared demo organiser. Both are created automatically on first use and need no phone number. The demo organiser can't promote anyone, and demo accounts are kept off the leaderboards.

**Security model:** browsers never talk to the tables directly. All reads and writes go through Next.js API routes that check the Supabase session (and the core-member role for organiser actions) and use the service-role key server-side. Uploads go straight from the browser to Storage through one-time signed URLs that the server issues after checking file type and size.

### Deploy to Vercel

1. Push to GitHub, then at https://vercel.com click **Add New → Project** and import the repo.
2. Under **Environment Variables**, add everything from your `.env`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `GEMINI_API_KEY` or `ANTHROPIC_API_KEY`.
3. Click **Deploy**. Every push to `main` redeploys automatically.

## What's inside — mapped to the problem statement

| Problem-statement direction | Spandana feature | Where |
|---|---|---|
| Intelligent Talent Discovery | **Creative Spark** — 5 micro-games (Rhythm Echo tap test, Pitch Match via real mic pitch detection, Frame-It rule-of-thirds crop, AI-scored Finish-the-Verse, Vibe Check) → **Creative DNA** radar across 6 dimensions + a **hidden spark** (strongest skill you *didn't* claim) with campus percentile | `/spark` |
| Personalized Engagement | **Pulse feed** — explainable recommendations ("why you're seeing this") ranked by DNA fit, **timetable free slots**, comfort level and passport novelty | `/home` |
| Inclusive Participation | **Mask Mode** — upload photos, music, reels and writing anonymously, AI-moderated kind comments, no downvotes, **unmask when ready**. **Confidence Ladder** Explorer → Crew → Collaborator → Performer → Mentor | `/stage`, `/passport` |
| Participation & Motivation | **Micro-gigs** (20–60 min backstage roles), **Exam Mode** (freezes streaks, short sessions only), **Kala Passport** stamps for trying each of 9 art forms | `/home`, `/passport` |
| Achievements | **26 badges** (bronze, silver, gold) across Explorer, Showcase, Events, Community and Organiser: First Step, Showed Up, Backstage Hero, In the Spotlight, Star of the Night, Kind Voice, Unmasked, Navarasa… with progress bars and unlock toasts. **Leaderboards** are opt-out, count backstage work and kindness as much as the stage, and include a *this month* board so newcomers can top it. Masked works count toward your own badges but never show publicly | `/achievements` |
| Recognition by SVM | Core members **star** people at events and give **recognitions** (Star Performer, Backstage Hero, Rising Star…) with a personal note. They appear on the **Wall of Fame**, the member's profile and their Passport | `/achievements`, `/u/<id>` |
| Running events (core members) | **Post events** with a call for roles (Singers ×4, Anchor ×1, Stage crew ×5…) and a poster; members sign up for a role. **Find people** ranks members who'd fit by Creative DNA, art forms they love and free time, with one-tap **invites**. **WhatsApp share**, sign-up list with CSV export, **check-in code** for verified attendance, **notice board** | `/events`, `/events/<id>` |
| Community Building | **AI Squad Builder** — cross-discipline teams balancing skill, shared free time, branch diversity and a beginner/expert mix; live **Creative Constellation** network graph | `/squads` |
| Talent Development | **Guru** AI mentor chat, AI **4-week learning paths**, **Guru–Shishya** peer-mentor matching by shared free slots | `/guru` |
| Recognition | **Cultural Portfolio** — events verified by check-in, SVM recognitions, backstage credited equal to stage, indicative AICTE/VTU activity-point mapping, save as PDF | `/passport` |
| Core workspace | A separate dark-themed area only core members can open: a **live Dashboard** (members, events, check-in rate, fest interest, "needs your attention" to-dos), **Endorse work**, a **Members** directory with filters and CSV export (no phone numbers), **Post an event** and **Insights**. Core-only tools inside member pages are marked *Core only* | `/core` |
| Core endorsements | Core members **endorse** standout Mask Mode work as an **SVM Core Pick**: gold highlight, a note to the creator, a *Core Picks* spotlight on everyone's home page and the gold **Core Pick** badge. The creator stays anonymous | `/core/showcase`, `/stage`, `/home` |
| Fests and the club | **Opportunities** board with the VTU Youth Festival's 25 events, "good fit for you" matching and hands raised; **SVM Club** trophy cabinet and shared club goals | `/opportunities`, `/club` |
| Event & Activity Intelligence | **AI Event Planner** — roles (incl. first-timer roles), timeline, bilingual promo; **turnout prediction** model; **targeted invites** to matching Explorers free at that slot | `/core/insights` → AI Event Planner |
| Engagement Analytics | Growth trend, participation **funnel**, dept × year **heatmap with gap detection**, art-form mix, **churn-risk** regulars, AI weekly insights | `/core/insights` |
| Hidden talent outreach | **Talent Radar** — students with high DNA scores who have *never* participated, with personal invite | `/core/insights` → Talent Radar |
| Experiential Engagement | **Live Stage** — projector applause meter, audience emoji reactions, Audience Choice voting, "first time on stage" spotlight | `/live` |

## 5-minute demo script

1. **Landing** → "Everyone has a spark." Hand a judge your phone: **Start Creative Spark**. Let them tap the rhythm and frame the photo.
2. **DNA reveal** → archetype + hidden spark ("higher than 85% of campus — and you never listed it").
3. Or click **Try the demo student** (Ananya, CSE 2nd yr, signed up for writing — hidden spark: Rhythm).
4. **Pulse** → top pick is a 45-min percussion circle in her only free slot, with reasons. Tap *I'm in* → points, passport stamp, level up. Toggle **Exam Mode**.
5. **Mask Mode** → compose a tune on the pad, post anonymously, watch reactions arrive, **Unmask**.
6. **Squads** → *Build my squad* on the Kannada rap video → AI names the squad, *Join* → gold links light up on the constellation.
7. **Core workspace** → from the home page choose *as an SVM core member* → the live **Dashboard** → **Endorse work** on a Mask Mode post (it turns gold on everyone's home page) → **Post an event** with roles to fill → **Find people** → invite the top match → show the check-in code → on the sign-up list mark someone present and ⭐ star them → their badge and recognition appear on the **Wall of Fame**.
8. **Insights** (core workspace) → heatmap finds the 3rd-year Civil/Mech gap, Talent Radar finds dormant rhythm talent, AI Event Planner predicts turnout and drafts the plan with a Kannada promo line.
9. **Live Stage** → applause meter for first-time performers.

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Framer Motion · Recharts · react-force-graph · Web Audio API (drum synth, tone generation, autocorrelation pitch detection) · Claude API (`@anthropic-ai/sdk`) / Gemini REST with offline fallback.

- `src/lib/engine.ts` — explainable recommendation scoring, squad builder, Creative DNA, analytics, turnout model
- `src/lib/achievements.ts` — badge definitions; `src/lib/server/stats.ts` computes them from real activity
- `src/lib/server/club.ts` — events, roles, and "find people" member matching
- `src/lib/data.ts` — deterministic seeded campus (320 students, events, quests, showcase)
- `src/app/api/ai/route.ts` — AI gateway (Claude → Gemini → offline) with circuit breaker
- `src/lib/audio.ts` — Web Audio toolkit

**Honesty note:** the 320 campus students, analytics history and seeded showcase posts are **simulated demo data** (labelled in the UI). Accounts, profiles, uploads, reactions, comments, friends, events, sign-ups, attendance, recognitions and achievements are real and stored in Supabase. The personalised *Your Pulse* suggestions still come from the simulated activity list; real SVM events appear above them.
