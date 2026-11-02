-- SVM Spandana database schema.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste this file → Run.
-- Safe to re-run: everything uses IF NOT EXISTS / ON CONFLICT.

-- ---------- Tables ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone       text unique,
  name        text not null,
  usn         text not null default '',
  email       text not null default '',
  dept        text not null default 'CSE',
  year        int  not null default 1 check (year between 1 and 4),
  bio         text not null default '',
  instagram   text not null default '',
  youtube     text not null default '',
  avatar      text not null default '',
  avatar_path text,
  state       jsonb not null default '{}'::jsonb,   -- Creative DNA, stamps, joined events, contributions…
  created_at  timestamptz not null default now()
);

create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete cascade,   -- null = seeded showcase post
  alias       text not null,
  kind        text not null check (kind in ('text','photo','audio','video','tune','sketch','scene')),
  title       text not null,
  body        text,
  media       text,          -- public URL in the "media" storage bucket
  media_path  text,          -- object path, used to delete the file
  mime        text,
  notes       jsonb,         -- seeded tunes: [["E4",0.35],…]
  seed        int,
  heart       int not null default 0,
  fire        int not null default 0,
  wow         int not null default 0,
  clap        int not null default 0,
  unmasked    text,          -- "Name (DEPT, Y yr)" once the creator chooses to reveal
  created_at  timestamptz not null default now()
);
create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_user_idx on public.posts (user_id);

create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  post_id     uuid not null references public.posts(id) on delete cascade,
  user_id     uuid references public.profiles(id) on delete set null,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id, created_at);

-- ---------- Security ----------
-- All reads and writes go through the app's server routes using the service-role key,
-- so RLS is enabled with no policies: the public anon key cannot touch these tables.
alter table public.profiles enable row level security;
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

-- Atomic reaction counter (avoids lost updates when many people react at once).
create or replace function public.add_reaction(post uuid, kind text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if kind not in ('heart','fire','wow','clap') then
    raise exception 'invalid reaction %', kind;
  end if;
  execute format('update public.posts set %I = %I + 1 where id = $1', kind, kind) using post;
end $$;
revoke execute on function public.add_reaction(uuid, text) from public, anon, authenticated;

-- ---------- Storage: uploaded photos, music, reels, avatars ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800, array['image/*','audio/*','video/*'])
on conflict (id) do update set public = true, file_size_limit = 52428800, allowed_mime_types = array['image/*','audio/*','video/*'];

-- ---------- Seed: showcase posts from classmates ----------
insert into public.posts (id, alias, kind, title, body, notes, seed, heart, fire, wow, clap, unmasked, created_at)
values
  ('00000000-0000-4000-8000-000000000001', 'Quiet Comet', 'text', 'Lab Record',
   E'Between two lab records\nI hid a sunset\nnobody graded.', null, null, 41, 12, 9, 18, null, now() - interval '3 hours'),
  ('00000000-0000-4000-8000-000000000002', 'Midnight Raga', 'tune', 'Hostel corridor hum', null,
   '[["E4",0.35],["G4",0.35],["A4",0.6],["G4",0.3],["E4",0.3],["D4",0.6],["E4",0.35],["G4",0.35],["C5",0.8],["A4",0.9]]', null, 29, 22, 7, 11, null, now() - interval '7 hours'),
  ('00000000-0000-4000-8000-000000000003', 'Ink Monsoon', 'text', 'ಮಳೆ (Rain)',
   E'ಮಳೆ ಬಂದಾಗ ಮನಸು ಹಾಡುತ್ತದೆ —\nthe canteen roof keeps time,\nand I forget the syllabus.', null, null, 52, 15, 20, 24, null, now() - interval '11 hours'),
  ('00000000-0000-4000-8000-000000000004', 'Pixel Peacock', 'sketch', 'Doodle from DSA class', null, null, 7, 33, 9, 14, 10, null, now() - interval '15 hours'),
  ('00000000-0000-4000-8000-000000000005', 'Golden Hour', 'scene', 'Unkal at 6:12 pm', null, null, 3, 61, 30, 25, 19, 'Prajwal Hegde (MECH, 2nd yr)', now() - interval '20 hours'),
  ('00000000-0000-4000-8000-000000000006', 'Paper Tabla', 'tune', 'Desk-drum loop', null,
   '[["C4",0.2],["C4",0.2],["G4",0.4],["C4",0.2],["E4",0.2],["G4",0.4],["A4",0.25],["G4",0.25],["E4",0.5]]', null, 18, 26, 6, 13, null, now() - interval '26 hours'),
  ('00000000-0000-4000-8000-000000000007', 'Chalk Whisper', 'sketch', 'Rangoli study #2', null, null, 19, 27, 6, 17, 9, null, now() - interval '31 hours')
on conflict (id) do nothing;

insert into public.comments (post_id, body, created_at)
select v.post_id::uuid, v.body, now() - v.ago
from (values
  ('00000000-0000-4000-8000-000000000001', '‘nobody graded’ hit hard 🥲', interval '2 hours'),
  ('00000000-0000-4000-8000-000000000001', 'This deserves a stage at Open Mic.', interval '1 hour'),
  ('00000000-0000-4000-8000-000000000002', 'Stuck in my head now!', interval '6 hours'),
  ('00000000-0000-4000-8000-000000000002', 'Someone add lyrics to this 🙏', interval '5 hours'),
  ('00000000-0000-4000-8000-000000000003', 'Kannada + English blend is beautiful', interval '10 hours'),
  ('00000000-0000-4000-8000-000000000003', '‘the canteen roof keeps time’ ✨', interval '9 hours'),
  ('00000000-0000-4000-8000-000000000004', 'The colours are so calm.', interval '14 hours'),
  ('00000000-0000-4000-8000-000000000004', 'Would love this as a fest poster!', interval '13 hours'),
  ('00000000-0000-4000-8000-000000000005', 'That horizon placement 👌', interval '19 hours'),
  ('00000000-0000-4000-8000-000000000005', 'Join the photo walk please!!', interval '18 hours'),
  ('00000000-0000-4000-8000-000000000006', 'Groove is real 🔥', interval '25 hours'),
  ('00000000-0000-4000-8000-000000000007', 'So symmetrical!', interval '30 hours'),
  ('00000000-0000-4000-8000-000000000007', 'Teach us at the Rangoli Jam?', interval '29 hours')
) as v(post_id, body, ago)
where not exists (select 1 from public.comments c where c.post_id = v.post_id::uuid);
