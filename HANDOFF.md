# HANDOFF — SVM Spandana (read this first)

This file lets another AI agent (or developer) continue the project without the original chat.
Last updated: 2026-11-02 (second session: review + fixes, then events / recognition / achievements). Author of the work so far: Claude (Claude Code) with the user (GitHub: `preetam-pixel`).

---

## 1. What this project is

**Hackathon problem:** "Reimagining Campus Culture: Intelligent Student Engagement and Talent Ecosystem for Sangeeta Vrinda Madhyam (SVM)", the cultural club of **KLE Institute of Technology, Hubballi**. The goals are to discover hidden talent, reduce participation barriers (shyness, exams, not knowing anyone), encourage cross-discipline collaboration, and give organizers analytics. It's a **6-hour hackathon** prototype.

**Solution:** **Spandana (ಸ್ಪಂದನ)** — "Find your art. Find your people." A web app (Next.js) with:
- **Creative Spark**: 5 micro-games (rhythm tapping, pitch via mic, photo framing, AI-scored verse, vibe quiz) → **Creative DNA** radar (6 dimensions) + **hidden spark**.
- **Pulse** feed: explainable recommendations based on DNA, free timetable slots, comfort level; micro-gigs; **Exam Mode**.
- **Mask Mode**: anonymous uploads (photo/music/video/writing), kind-comment AI moderation, **unmask** when ready.
- **Squads**: AI squad builder + **Creative Constellation** network graph.
- **Guru**: AI mentor chat, 4-week learning paths, peer-mentor matching.
- **Passport/Portfolio**: Confidence Ladder, art-form stamps, contributions, activity points.
- **Organizer Cockpit**: analytics (funnel, heatmap gaps, churn), Talent Radar, AI Event Planner.
- **Live Stage**: audience reactions/applause meter.
- **Auth**: register/login with **mobile OTP** (Supabase Auth + Twilio Verify), profile page with edit.
- **People/friends**, public profiles (`/u/<id>`), **SVM Team** page, unmask / mask-again controls, clickable Constellation (committed in `b10a5ac`).
- **Events for SVM core members** (`/events`): post events with a call for roles + poster, members sign up per role, "Find people" suggestions + invites, WhatsApp share, sign-up list (CSV), check-in code for verified attendance, stars, notice board. Core role = `profiles.role = 'core'`.
- **Recognition & achievements** (`/achievements`): 22 badges computed server-side from real activity, Wall of Fame (recognitions from core), leaderboards (opt-out; all-time badge points + last 30 days), unlock toasts, verified activity on the Passport.

Theme: classical **beige/brown/white**, Playfair Display headings, SVM logo, and a "Sangeeta Vrinda" artwork as the home page background.

---

## 2. Location, repo, how to run

- Local folder: `C:\Users\beast\OneDrive\Desktop\SVM_Spandana` (Windows 11, Node 25, npm 11, Git Bash + PowerShell).
- GitHub: https://github.com/preetam-pixel/SVM-Spandana (branch `main`; review fixes are on branch `claude/trusting-thompson-fzkh1k`, see section 5).
- `main` head: **`b10a5ac`** "People, friends, public profiles, SVM Team page and unmask controls".
- Run: `npm install` then `npm run dev` → http://localhost:3000
- Typecheck: `npx tsc --noEmit` · Production build: `npx next build` (**stop the dev server and `rm -rf .next` before/after**; see Gotchas).

---

## 3. Services and secrets (values are in `.env`, NEVER commit them)

`.env` (git-ignored) contains: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEMO_PASSWORD` (empty → default in code), `ANTHROPIC_API_KEY` (empty), `GEMINI_API_KEY` (set).
`.env.example` is the committed template with empty values. **The user once pasted real keys into `.env.example`; that was caught before commit. Always check that `.env.example` has no keys before committing.**

- **Supabase** project ref `eqsalbhoeastabgmkdgq` (URL `https://eqsalbhoeastabgmkdgq.supabase.co`, region Mumbai).
  - Dashboard SQL editor: https://supabase.com/dashboard/project/eqsalbhoeastabgmkdgq/sql/new
  - Auth providers: https://supabase.com/dashboard/project/eqsalbhoeastabgmkdgq/auth/providers
  - Phone provider = **Twilio Verify** (configured by the user in the dashboard, not in `.env`). Twilio account is a **trial**: only verified caller IDs receive SMS. For judging, suggest Supabase "Test Phone Numbers and OTPs" (e.g. `919000000002=123456`).
- **AI**: `src/app/api/ai/route.ts`. Claude (`claude-opus-5-5`, effort low, server-side fallbacks beta) if `ANTHROPIC_API_KEY`, else Gemini REST (model chain `gemini-3-flash-preview` → `gemini-3.5-flash` → `gemini-flash-latest`), else **offline fallbacks** (`src/lib/fallback.ts`). There's a circuit breaker for failing providers. The user's Gemini key is a new-format `AQ.` key: it **must be sent as `?key=` query param**, because the `x-goog-api-key` header hangs. Gemini is often overloaded (503/timeouts), and the offline fallback covers that.
- Registered real users so far: demo user **Ananya Kulkarni** (email login `demo@svm-spandana.app`, password = `DEMO_PASSWORD` or default in `src/lib/server/db.ts`) and **likhit** (real phone signup, worked via Twilio).

---

## 4. Architecture / key files

```
src/app/
  page.tsx                 Home: Sangeeta Vrinda artwork background (public/sangeeta-vrinda.webp) + welcome card (Register/Login/demo)
  register/ login/         OTP auth pages (components/auth/OtpFlow.tsx)
  spark/                   Creative Spark game (components/spark/*)
  cockpit/  live/          Organizer Cockpit, Live Stage (public)
  (student)/layout.tsx     Auth guard, sidebar + mobile bottom nav (+ "More" sheet), friend-request badge
  (student)/home stage squads guru passport profile   Main student pages
  (student)/people/        NEW: directory, Friends, Requests tabs
  (student)/u/[id]/        NEW: public profile (real uuid → API; "s123" → demo student from seed data)
  (student)/team/          SVM Team page (data from src/lib/officials.ts)
  (student)/events/        Events list + notices + invites; events/new (post/edit, core only); events/[id] (sign up, check in, share; organiser tools for core)
  (student)/achievements/  Badges, Wall of Fame, leaderboards
  api/ai                   AI gateway (tasks: verse, path, guru, squad, plan, kind, insight)
  api/auth/{send-otp,verify,logout,demo}   Supabase Auth phone OTP + demo login
  api/me                   GET current account; PATCH profile fields / engagement state / avatarPath
  api/uploads              Issues signed upload URLs (Supabase Storage bucket "media")
  api/posts, api/posts/[id]  Mask Mode feed; actions react/comment/unmask/remask; DELETE own post
  api/people, api/people/[id], api/friends   Directory, public profile (+ badges, recognitions; PATCH role by core), friend actions
  api/events, api/events/[id]   List/create; detail, ?suggest=1, PATCH/DELETE (core); POST actions signup/leave/checkin/respond, core: invite/attend/star/unstar
  api/announcements, api/recognitions, api/achievements, api/leaderboard, api/notifications
src/lib/
  data.ts        Seed/sim data: 320 synthetic STUDENTS, EVENTS, QUESTS, MASK_POSTS, DIMS, DISCIPLINES, LADDER, DEMO_PROFILE
  engine.ts      Recommendations, squad builder, DNA/archetype, analytics, turnout model
  store.tsx      Client store (useStore): account, profile (engagement state), debounced save to /api/me, toasts
  types.ts       All shared types (Profile, Account, MaskPost, PublicProfile, PersonCard, FriendStatus…)
  supabase/server.ts   supabaseAuth() (cookie-bound SSR client), admin() (service role, server only)
  server/{auth,db,posts,people}.ts   Server helpers (currentUser, otpMessage, profile mapping, friendship helpers)
  upload-client.ts     Browser upload via signed URL
  people-client.ts     NEW: friendAction(), demoProfile() for synthetic students
  officials.ts         SVM coordinators data (PLACEHOLDERS for the user to fill)
  achievements.ts      Badge definitions + evaluate(stats); club.ts  shared event helpers (kinds, role presets, IST dates, WhatsApp text)
  server/club.ts       Event rows ↔ ClubEvent, role parsing/validation, suggestFor() member matching, recognitions/notices
  server/stats.ts      collectStats(): achievement facts per member from the DB (public = unmasked works only; private adds own masked works)
  server/setup.ts      isMissing()/rowsOrEmpty(): tables from later migrations read as empty; SetupNeeded errors → 503 with the SQL file to run
src/components/  ui.tsx (Button, Card, Badge, Avatar, DiscIcon…), Constellation.tsx, DnaRadar.tsx, FriendButton.tsx (NEW), PublicProfileView.tsx (NEW), Logo.tsx, Toaster.tsx
src/middleware.ts      Refreshes Supabase session cookies
supabase/schema.sql    Full schema (profiles, posts, comments, friendships, add_reaction fn, media bucket, seed posts)
supabase/migrations/002_friends.sql   friendships table
supabase/migrations/003_events_achievements.sql   role column, events, event_signups, event_invites, recognitions, announcements + 3 seed events
```

**Data model (Supabase Postgres, RLS enabled with NO policies; all access via server routes using the service role):**
- `profiles` (id = auth.users.id, phone, name, usn, email, dept, year, bio, instagram, youtube, avatar, avatar_path, state jsonb = Creative DNA/stamps/joined/contributions…, created_at)
- `posts` (Mask Mode; user_id null = seeded; `unmasked` text set when the creator reveals; `creatorId` is only exposed to clients when unmasked)
- `comments`, function `add_reaction(post, kind)`, storage bucket `media` (public, 50 MB)
- `friendships` (requester, addressee, status pending|accepted; unique per pair)
- `profiles.role` ('member' | 'core'); `events` (roles jsonb = call for participants, checkin_code, cancelled); `event_signups` (role_id, note, attended); `event_invites` (role_id, status); `recognitions` (event_id set = an event "star"); `announcements`

**Privacy rules implemented:** phone is never shown to other users; email + USN are visible only to friends; masked posts never reveal the creator, and badges/leaderboards shown to others only count unmasked works. Check-in codes, sign-up notes and attendance are visible to core members only. The demo core account can't change roles; demo accounts are excluded from leaderboards.

---

## 5. Current state (IMPORTANT)

### On `main` (`b10a5ac`)
Everything in sections 1–4. The base app (`d14c48e`) was tested end to end against the live Supabase project: demo login, profile saving, signed uploads, reactions, comments, unmask, delete, RLS blocking the anon key, and real SMS signup. The People/friends/Team/Constellation work in `b10a5ac` was typechecked and partly tested in the browser.

### Review + fixes on branch `claude/trusting-thompson-fzkh1k` (second session)
Done in a cloud container **without** the `.env` keys, so verified with typecheck, production build, a unit test of the server sanitizers, and headless-Chromium runs of every page (desktop + mobile) against mocked `/api/*` responses. **Not yet re-tested against the live Supabase project.**
1. **Friends before the migration**: `/api/people` and `/api/people/[id]` now work without the `friendships` table (everyone shows as "not friends"); `/api/friends` GET returns empty lists plus a `setup` note, and friend actions return 503 with "run `supabase/migrations/002_friends.sql`". The People page shows that note instead of breaking. (`FriendsNotSetUp` in `lib/server/people.ts`, handled by `failure()`.)
2. **Bad profile data can't crash other people's pages**: `toCard`/`toPublic` sanitize the browser-written `state` (DNA numbers, art-form ids, `hiddenSpark`, level, dept). Before, one malformed profile crashed the whole People page for everyone.
3. **Unmask points**: Unmask → Mask again → Unmask used to add +15 points each time. Contributions now take an optional `ref` (`unmask:<postId>`) and the store counts each ref once. Unmasking from Profile → My works now earns the same points as from Mask Mode.
4. **People page**: after any friend action both the tabs and the Discover list refresh (no stale "Accept" button); stale search responses are ignored; Requests tab is split into "Waiting for you" and "Sent"; tabs no longer spin forever if `/api/friends` fails. `FriendButton` follows status changes from its parent.
5. **Public profile on phones**: header no longer squeezes the name into a narrow column; points/stamps now show on mobile too. `/u/[id]` no longer refetches on every profile save.
6. **Constellation**: "You" is pinned to the centre of the network (with only friends linked it used to drift off as a separate clump); friend names are drawn below their dot with a white halo, so they don't collide with "YOU".
7. Small: auth routes return 400 (not an HTML 500) on malformed JSON; friend actions validate `action` and handle the both-sides-requested-at-once race; mobile "Exam Mode" pill no longer wraps; `@anthropic-ai/sdk` pinned to `^1.3.0` instead of `latest`.

`npm audit` reports a PostCSS advisory inside Next 15's bundled build tooling; the only fix is Next 16 (breaking), so it was left alone.

## 6. Next steps (in order)

1. **Run the migrations on the live DB** (the user must do this, or an agent with dashboard access): SQL editor → paste and run `supabase/migrations/002_friends.sql` (if not done yet), then `supabase/migrations/003_events_achievements.sql`. Until then those features show what to run; nothing else breaks.
2. **Make the first core member:** `update public.profiles set role = 'core' where phone = '+91…';` (their registered number). They can promote others in the app (profile → "Make core member").
3. **Merge the branch** `claude/trusting-thompson-fzkh1k` into `main` (open a PR on GitHub).
4. **Smoke test against the live project** with the real `.env`: demo core login → post an event → Find people → invite; demo student → sign up → check in with the code; core → star → Wall of Fame. Also friends (`/people`) and Mask Mode unmask.
5. User fills **`src/lib/officials.ts`** with real coordinator names/contacts and adds photos under `public/team/`.
6. **Deploy to Vercel**: import the GitHub repo, add the env vars from `.env`, deploy. Then set Supabase Auth → URL configuration → Site URL to the Vercel URL.
7. Judging prep: add Supabase test phone numbers (Twilio trial limit); both demo buttons always work. The README has a demo script.
8. Before committing anything: check `.env.example` has no keys (`.env` and `data/` are git-ignored). Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

**How the events/achievements work was tested (second session, no live keys):** the schema and migration were applied to a real local Postgres 16 (fresh install, upgrade from the previous schema, and re-runs). The app ran against a small test-only stand-in for Supabase's REST/auth/storage APIs, with 66 API checks (permissions, capacity, invites, check-in rate limit, stars, achievements, Mask Mode privacy, leaderboards, roles, cancel/edit/delete), checks for a DB without migration 003, and browser flows on desktop and mobile. That stand-in isn't in the repo; the real Supabase project still needs the step 4 smoke test.

**Ideas not started (optional):** connect the Organizer Cockpit analytics to real events/sign-ups (it's still simulated); feed real events into the personalised "Your Pulse" ranking; push/SMS reminders before events; peer-to-peer kudos; use the Sangeeta Vrinda artwork on auth pages; chat between friends.

---

## 7. Gotchas learned the hard way

- **Port 3000 "EADDRINUSE"**: stopping the npm wrapper leaves an orphaned `node ... next/dist/server/lib/start-server.js`. Kill it in PowerShell:
  `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | ? { $_.CommandLine -like '*SVM_Spandana*next*' } | % { Stop-Process -Id $_.ProcessId -Force }`
- **Running `next build` while dev is running** breaks the dev server (`Cannot find module './611.js'`): stop dev, `rm -rf .next`, restart.
- **Git Bash heredocs with many files** sometimes fail with "unexpected EOF"; write files with an editor tool or a Node script instead.
- **Twilio errors via Supabase**: `21212 Invalid From Number` = the provider was set to "Twilio" instead of **"Twilio Verify"**; `21608` = trial account and the number isn't a verified caller ID. `otpMessage()` in `src/lib/server/auth.ts` maps these and logs raw errors as `[otp:send]` / `[otp:verify]`.
- Deleted storage files may still load for a while (Supabase CDN cache). They really are deleted.
- `useEffect(() => el.scrollIntoView())` crashes in new Chromium (it returns a Promise); always use braces in effects.
- React StrictMode double-invokes state updaters, so don't put side effects (toasts) inside `setState` updaters.
- Theme: dark-theme classes were bulk-mapped: `text-fg` (brown ink), `bg-fg/x` (brown tints), `.grad-bg` forces white text (unlayered CSS). A Tailwind v4 custom variant `wide:` (≥900px and aspect ≥5/4) is used on the home page.
- `next build` can fail with `An error occurred in next/font … Cannot read properties of null (reading '1')` when Google Fonts doesn't answer; it's a network blip, just run the build again.
- The browser-preview pane throttles animations (framer-motion `initial={{opacity:0}}` can look blank for a few seconds); real browsers are fine.

---

## 8. Conventions

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css` `@theme`), framer-motion, recharts, react-force-graph-2d, lucide-react, `@supabase/ssr` + `@supabase/supabase-js`, `@anthropic-ai/sdk`.
- Server routes: `export const runtime = "nodejs"`, wrap in try/catch and `return failure(e)`, auth via `currentUser()`, DB via `admin()` (never import `admin` into client components).
- Client state: `useStore()` → `account`, `profile`, `update(fn)` (debounced persist), `addContribution`, `saveAccount`, `toast`.
- Simulated data (320 students, analytics history, seeded posts) is labelled "demo/simulated" in the UI. Keep that honesty.
- Kannada text is used sparingly (labels like ಸ್ಪಂದನ, ತಂಡ); keep spellings correct.
