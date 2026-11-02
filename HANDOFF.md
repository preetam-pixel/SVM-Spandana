# HANDOFF — SVM Spandana (read this first)

This file lets another AI agent (or developer) continue the project without the original chat.
Last updated: 2026-11-02. Author of the work so far: Claude (Claude Code) with the user (GitHub: `preetam-pixel`).

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
- **NEW (uncommitted, in progress)**: People/friends, public profiles, SVM Team page, unmask improvements, clickable Constellation.

Theme: classical **beige/brown/white**, Playfair Display headings, SVM logo, and a "Sangeeta Vrinda" artwork as the home page background.

---

## 2. Location, repo, how to run

- Local folder: `C:\Users\beast\OneDrive\Desktop\SVM_Spandana` (Windows 11, Node 25, npm 11, Git Bash + PowerShell).
- GitHub: https://github.com/preetam-pixel/SVM-Spandana (branch `main`).
- Last pushed commit: **`d14c48e`** "Supabase database, phone-OTP auth and Sangeeta Vrinda home page".
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
  (student)/team/          NEW: SVM Team page (data from src/lib/officials.ts)
  api/ai                   AI gateway (tasks: verse, path, guru, squad, plan, kind, insight)
  api/auth/{send-otp,verify,logout,demo}   Supabase Auth phone OTP + demo login
  api/me                   GET current account; PATCH profile fields / engagement state / avatarPath
  api/uploads              Issues signed upload URLs (Supabase Storage bucket "media")
  api/posts, api/posts/[id]  Mask Mode feed; actions react/comment/unmask/remask; DELETE own post
  api/people, api/people/[id], api/friends   NEW: directory, public profile, friend actions
src/lib/
  data.ts        Seed/sim data: 320 synthetic STUDENTS, EVENTS, QUESTS, MASK_POSTS, DIMS, DISCIPLINES, LADDER, DEMO_PROFILE
  engine.ts      Recommendations, squad builder, DNA/archetype, analytics, turnout model
  store.tsx      Client store (useStore): account, profile (engagement state), debounced save to /api/me, toasts
  types.ts       All shared types (Profile, Account, MaskPost, PublicProfile, PersonCard, FriendStatus…)
  supabase/server.ts   supabaseAuth() (cookie-bound SSR client), admin() (service role, server only)
  server/{auth,db,posts,people}.ts   Server helpers (currentUser, otpMessage, profile mapping, friendship helpers)
  upload-client.ts     Browser upload via signed URL
  people-client.ts     NEW: friendAction(), demoProfile() for synthetic students
  officials.ts         NEW: SVM coordinators data (PLACEHOLDERS for the user to fill)
src/components/  ui.tsx (Button, Card, Badge, Avatar, DiscIcon…), Constellation.tsx, DnaRadar.tsx, FriendButton.tsx (NEW), PublicProfileView.tsx (NEW), Logo.tsx, Toaster.tsx
src/middleware.ts      Refreshes Supabase session cookies
supabase/schema.sql    Full schema (profiles, posts, comments, friendships, add_reaction fn, media bucket, seed posts)
supabase/migrations/002_friends.sql   NEW friendships table (must be run on the live DB; see below)
```

**Data model (Supabase Postgres, RLS enabled with NO policies; all access via server routes using the service role):**
- `profiles` (id = auth.users.id, phone, name, usn, email, dept, year, bio, instagram, youtube, avatar, avatar_path, state jsonb = Creative DNA/stamps/joined/contributions…, created_at)
- `posts` (Mask Mode; user_id null = seeded; `unmasked` text set when the creator reveals; `creatorId` is only exposed to clients when unmasked)
- `comments`, function `add_reaction(post, kind)`, storage bucket `media` (public, 50 MB)
- `friendships` (requester, addressee, status pending|accepted; unique per pair) — **NEW**

**Privacy rules implemented:** phone is never shown to other users; email + USN are visible only to friends; masked posts never reveal the creator.

---

## 5. Current state (IMPORTANT)

### Done and pushed (`d14c48e`)
Everything in sections 1–4 except the "NEW" items. It was tested end to end against the live Supabase project: demo login, profile saving, signed uploads, reactions, comments, unmask, delete, RLS blocking the anon key, and real SMS signup.

### Done locally, NOT committed, only partly tested (the work in progress when the session stopped)
1. **Friends/People**: `api/people`, `api/people/[id]`, `api/friends`, `lib/server/people.ts`, `(student)/people/page.tsx`, `(student)/u/[id]/page.tsx`, `components/FriendButton.tsx`, `components/PublicProfileView.tsx`, `lib/people-client.ts`, types added in `lib/types.ts`.
2. **Unmask improvements**: Unmask / "Mask again" buttons on your own post cards (`(student)/stage/page.tsx`) and in Profile → My works (`(student)/profile/page.tsx`). Unmasked creator names link to `/u/<id>`. API action `remask` was added in `api/posts/[id]`. `serializePost` exposes `creatorId` only when unmasked.
3. **Constellation** (`components/Constellation.tsx`): tap any dot → confirmation card "Open X's profile?" → `/u/<id>` (demo students open `/u/s123`, "You" opens `/profile`). Real friends are drawn as gold-ringed named dots linked to "You". Minimum dot size and a larger tap area for phones. Backup `zoomToFit` after 1.5 s. Squads page passes `friends` (from `/api/friends`).
4. **SVM Team page** `(student)/team/page.tsx` + **`src/lib/officials.ts`** (placeholders in `[square brackets]`; the page shows a reminder until they're replaced; photos go in `public/team/`).
5. **Navigation** `(student)/layout.tsx`: sidebar = Pulse, Mask Mode, Squads, People (request badge), Guru, Passport, SVM Team, Profile. Mobile bottom bar = Pulse, Mask Mode, Squads, People, **More** (sheet: Guru, Passport, SVM Team, Profile, Organizer Cockpit, Live Stage). People/Team/Profile/u/* work before the Creative Spark is taken.
6. `supabase/schema.sql` now includes the friendships table; `supabase/migrations/002_friends.sql` added.

**Verified so far:** typecheck passed after each step until the very last edit. The SVM Team page renders. Constellation tap shows the confirmation card. The new mobile nav renders.
**NOT yet verified:** the final Constellation edit (confirmation card restacked for phones) wasn't typechecked; a follow-up removal of the now-unused `X` import from `lucide-react` in `Constellation.tsx` was **not applied**. Remove it if lint complains. tsc doesn't fail on unused imports (no `noUnusedLocals`).

---

## 6. Next steps (in order)

1. **Run the friends migration on the live DB** (the user must do this, or an agent with dashboard access): open the SQL editor link above, paste `supabase/migrations/002_friends.sql`, Run. **Until then `/api/people`, `/api/people/[id]` and `/api/friends` return 500 ("Could not find the table 'public.friendships'").** Verify with a service-role query `from('friendships').select('*').limit(1)`.
2. `npx tsc --noEmit`; remove the unused `X` import in `src/components/Constellation.tsx`.
3. **Test the new features** (dev server + browser):
   - `/people`: search, branch filter, Add friend → Requested → cancel; accept/decline from the Requests tab; Friends tab; Remove friend. Two real accounts exist (demo + "likhit"). For automated tests you can insert a pending row via the service role (other user → demo) and accept it through the API with the demo session (`POST /api/auth/demo` sets cookies).
   - `/u/<uuid>` for real users (email/USN hidden unless friends) and `/u/s12` (demo banner, no friend button).
   - Mask Mode: Unmask from a post card → creator name links to the profile; "Mask again" works; Profile → My works Unmask/Mask.
   - Constellation: tap dot → confirm → profile; friends appear as gold dots after accepting.
   - Mobile "More" menu and the People badge.
4. **Commit and push** (check `.env.example` has no keys; `.env` and `data/` are git-ignored). The commit message should end with: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
5. User fills **`src/lib/officials.ts`** with real coordinator names/contacts and adds photos under `public/team/`.
6. **Deploy to Vercel**: import the GitHub repo, add the env vars from `.env`, deploy. Optionally set Supabase Auth → URL configuration Site URL to the Vercel URL.
7. Judging prep: add Supabase test phone numbers (Twilio trial limit); the demo account button always works. The README has a 5-minute demo script.

**Ideas not started (optional):** use the Sangeeta Vrinda artwork on auth pages; real-user counts in the Cockpit; notifications for unmask/friend events; chat between friends.

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
- The browser-preview pane throttles animations (framer-motion `initial={{opacity:0}}` can look blank for a few seconds); real browsers are fine.

---

## 8. Conventions

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css` `@theme`), framer-motion, recharts, react-force-graph-2d, lucide-react, `@supabase/ssr` + `@supabase/supabase-js`, `@anthropic-ai/sdk`.
- Server routes: `export const runtime = "nodejs"`, wrap in try/catch and `return failure(e)`, auth via `currentUser()`, DB via `admin()` (never import `admin` into client components).
- Client state: `useStore()` → `account`, `profile`, `update(fn)` (debounced persist), `addContribution`, `saveAccount`, `toast`.
- Simulated data (320 students, analytics history, seeded posts) is labelled "demo/simulated" in the UI. Keep that honesty.
- Kannada text is used sparingly (labels like ಸ್ಪಂದನ, ತಂಡ); keep spellings correct.
