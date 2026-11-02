-- SVM club trophies (wins at fests and competitions) and opportunities (VTU Youth Festival and other
-- external fests) with "I'm interested" sign-ups. Run once in Supabase SQL editor. Safe to re-run.

-- ---------- Club trophy cabinet ----------
create table if not exists public.club_trophies (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,                       -- e.g. "Folk Dance"
  fest        text not null,                       -- e.g. "VTU Youth Festival 2025"
  level       text not null default 'university'
              check (level in ('college', 'inter-college', 'university', 'zonal', 'national', 'international')),
  position    text not null default 'winner'
              check (position in ('winner', 'runner-up', 'third', 'special', 'participation')),
  discipline  text,
  won_on      date,
  member_ids  uuid[] not null default '{}',        -- Spandana members on the team (shown on their profiles)
  team        text not null default '',            -- other names, free text
  description text not null default '',
  photo       text,
  photo_path  text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists club_trophies_won_idx on public.club_trophies (won_on desc nulls last);

-- ---------- Opportunities beyond campus ----------
create table if not exists public.opportunities (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  organiser   text not null default '',
  level       text not null default 'university'
              check (level in ('college', 'inter-college', 'university', 'zonal', 'national', 'international')),
  kind        text not null default 'fest' check (kind in ('fest', 'competition', 'audition', 'workshop', 'scholarship')),
  location    text not null default '',
  starts_on   date,
  ends_on     date,
  deadline    date,                                -- last day to register with SVM
  link        text,
  description text not null default '',
  categories  jsonb not null default '[]'::jsonb,  -- [{id, name, discipline, team}]
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.opportunity_interests (
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  category       text not null default '',
  created_at     timestamptz not null default now(),
  primary key (opportunity_id, user_id, category)
);
create index if not exists opportunity_interests_user_idx on public.opportunity_interests (user_id);

alter table public.club_trophies         enable row level security;
alter table public.opportunities         enable row level security;
alter table public.opportunity_interests enable row level security;

-- ---------- Seed: VTU Youth Festival (dates are filled in by SVM core from the official circular) ----------
insert into public.opportunities (id, title, organiser, level, kind, location, description, categories)
values (
  '00000000-0000-4000-9200-000000000001',
  'VTU Youth Festival',
  'Visvesvaraya Technological University',
  'university', 'fest', 'Announced by VTU',
  E'VTU''s inter-collegiate cultural festival. Colleges send teams across music, dance, literary, theatre and fine-arts events, and winners can go on to represent VTU at the AIU youth festivals.\nMark the events you''d like to try. SVM core will pick and train the team. Dates, rules and team sizes come from the official VTU circular.',
  '[
    {"id":"classical-vocal","name":"Classical Vocal Solo","discipline":"vocal","team":false},
    {"id":"light-vocal","name":"Light Vocal (Indian)","discipline":"vocal","team":false},
    {"id":"western-vocal","name":"Western Vocal Solo","discipline":"vocal","team":false},
    {"id":"group-song-indian","name":"Group Song (Indian)","discipline":"vocal","team":true},
    {"id":"group-song-western","name":"Group Song (Western)","discipline":"vocal","team":true},
    {"id":"percussion","name":"Classical Instrumental (Percussion)","discipline":"instrument","team":false},
    {"id":"non-percussion","name":"Classical Instrumental (Non-percussion)","discipline":"instrument","team":false},
    {"id":"folk-orchestra","name":"Folk Orchestra","discipline":"instrument","team":true},
    {"id":"folk-dance","name":"Folk / Tribal Dance","discipline":"dance","team":true},
    {"id":"classical-dance","name":"Classical Dance","discipline":"dance","team":false},
    {"id":"one-act-play","name":"One-Act Play","discipline":"theatre","team":true},
    {"id":"skit","name":"Skit","discipline":"theatre","team":true},
    {"id":"mime","name":"Mime","discipline":"theatre","team":true},
    {"id":"mimicry","name":"Mimicry","discipline":"theatre","team":false},
    {"id":"quiz","name":"Quiz","discipline":"writing","team":true},
    {"id":"elocution","name":"Elocution","discipline":"anchoring","team":false},
    {"id":"debate","name":"Debate","discipline":"anchoring","team":true},
    {"id":"painting","name":"On-the-spot Painting","discipline":"art","team":false},
    {"id":"collage","name":"Collage","discipline":"art","team":false},
    {"id":"poster","name":"Poster Making","discipline":"art","team":false},
    {"id":"clay","name":"Clay Modelling","discipline":"art","team":false},
    {"id":"cartooning","name":"Cartooning","discipline":"art","team":false},
    {"id":"rangoli","name":"Rangoli","discipline":"art","team":false},
    {"id":"installation","name":"Installation","discipline":"art","team":true},
    {"id":"photography","name":"On-the-spot Photography","discipline":"photo","team":false}
  ]'::jsonb
)
on conflict (id) do nothing;

notify pgrst, 'reload schema';
