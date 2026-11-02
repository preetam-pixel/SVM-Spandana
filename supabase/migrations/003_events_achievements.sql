-- Events, sign-ups, invites, recognitions, notices and the SVM core-member role.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to re-run.
--
-- After running, make the first SVM core member (use their registered mobile number):
--   update public.profiles set role = 'core' where phone = '+919876543210';
-- Core members can then promote others from their profile page in the app.

-- ---------- Core members ----------
alter table public.profiles add column if not exists role text not null default 'member';
do $$ begin
  alter table public.profiles add constraint profiles_role_check check (role in ('member', 'core'));
exception when duplicate_object then null; end $$;

-- ---------- Events posted by core members ----------
create table if not exists public.events (
  id           uuid primary key default gen_random_uuid(),
  created_by   uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text not null default '',
  discipline   text not null,
  kind         text not null default 'performance'
               check (kind in ('workshop', 'jam', 'performance', 'showcase', 'competition', 'audition', 'meeting')),
  level        text not null default 'open' check (level in ('beginner', 'open', 'experienced')),
  venue        text not null default '',
  starts_at    timestamptz not null,
  duration_min int  not null default 60 check (duration_min between 15 and 720),
  roles        jsonb not null default '[]'::jsonb,   -- call for participants: [{id, label, slots, stage}]
  poster       text,                                 -- public URL in the "media" bucket
  poster_path  text,
  checkin_code text not null,                        -- shown to core members at the venue
  cancelled    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists events_starts_idx on public.events (starts_at);

-- Who is coming, in which role, and whether they actually showed up.
create table if not exists public.event_signups (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role_id    text not null default 'audience',
  note       text not null default '',
  attended   boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_signups_user_idx on public.event_signups (user_id);

-- Core members inviting suggested members to a role.
create table if not exists public.event_invites (
  event_id   uuid not null references public.events(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  role_id    text not null default 'audience',
  status     text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index if not exists event_invites_user_idx on public.event_invites (user_id, status);

-- Recognition from SVM core (event stars have an event_id). Shown on the Wall of Fame and profiles.
create table if not exists public.recognitions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  given_by   uuid references public.profiles(id) on delete set null,
  event_id   uuid references public.events(id) on delete set null,
  title      text not null,
  message    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists recognitions_user_idx on public.recognitions (user_id);
create index if not exists recognitions_created_idx on public.recognitions (created_at desc);

-- Notice board.
create table if not exists public.announcements (
  id         uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text not null default '',
  link       text,
  pinned     boolean not null default false,
  created_at timestamptz not null default now()
);

-- Same model as the other tables: only the server (service role) reads and writes.
alter table public.events        enable row level security;
alter table public.event_signups enable row level security;
alter table public.event_invites enable row level security;
alter table public.recognitions  enable row level security;
alter table public.announcements enable row level security;

-- ---------- Seed: a few upcoming events and a welcome notice (times are IST) ----------
insert into public.events (id, title, description, discipline, kind, level, venue, starts_at, duration_min, roles, checkin_code)
values
  ('00000000-0000-4000-9000-000000000001', 'Open Mic Friday',
   E'Five minutes, any art form. Sing, read a poem, beatbox, tell a joke or just come and cheer.\nFirst-timers get the loudest applause.',
   'anchoring', 'performance', 'open', 'Open Air Theatre',
   (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '4 days 17 hours') at time zone 'Asia/Kolkata', 90,
   '[{"id":"performer","label":"Performer","slots":12,"stage":true},{"id":"anchor","label":"Anchor","slots":2,"stage":true},{"id":"sound","label":"Sound & lights","slots":2,"stage":false},{"id":"crew","label":"Stage crew","slots":4,"stage":false}]',
   lpad(floor(random() * 10000)::int::text, 4, '0')),
  ('00000000-0000-4000-9000-000000000002', 'Golden Hour Photo Walk',
   E'Campus to Unkal Lake at sunrise. Learn framing, leading lines and light with just your phone.',
   'photo', 'workshop', 'beginner', 'Main gate → Unkal Lake',
   (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '6 days 6 hours 30 minutes') at time zone 'Asia/Kolkata', 120,
   '[{"id":"lead","label":"Walk buddy (experienced)","slots":3,"stage":false},{"id":"video","label":"Behind-the-scenes video","slots":1,"stage":false}]',
   lpad(floor(random() * 10000)::int::text, 4, '0')),
  ('00000000-0000-4000-9000-000000000003', 'Unplugged Night: Auditions',
   E'Auditions for the Unplugged Night line-up. Solo or band, Kannada, Hindi or English. Bring one song.',
   'vocal', 'audition', 'open', 'SVM Room',
   (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '9 days 16 hours') at time zone 'Asia/Kolkata', 120,
   '[{"id":"singer","label":"Singer","slots":10,"stage":true},{"id":"instrument","label":"Instrumentalist","slots":8,"stage":true},{"id":"volunteer","label":"Volunteer","slots":3,"stage":false}]',
   lpad(floor(random() * 10000)::int::text, 4, '0'))
on conflict (id) do nothing;

insert into public.announcements (id, title, body, pinned)
values ('00000000-0000-4000-9100-000000000001', 'Welcome to SVM events on Spandana',
        'Sign up for any role, on stage or backstage. Check in at the venue with the code the organisers show, and your attendance is verified on your Passport.', true)
on conflict (id) do nothing;
