-- Friends / connections between members.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run. Safe to re-run.

create table if not exists public.friendships (
  requester    uuid not null references public.profiles(id) on delete cascade,
  addressee    uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  primary key (requester, addressee),
  check (requester <> addressee)
);

-- One row per pair, whichever direction the request went.
create unique index if not exists friendships_pair_idx
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee, status);

-- Same model as the other tables: only the server (service role) reads and writes.
alter table public.friendships enable row level security;
