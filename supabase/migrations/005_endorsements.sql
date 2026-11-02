-- SVM core endorsements ("Core Picks") on Mask Mode posts.
-- One endorsement per post: the core member who endorsed it, when, and an optional note to the creator.
-- The creator stays anonymous; only the endorser's name is shown.

alter table public.posts add column if not exists endorsed_by  uuid references public.profiles(id) on delete set null;
alter table public.posts add column if not exists endorsed_at  timestamptz;
alter table public.posts add column if not exists endorse_note text;

create index if not exists posts_endorsed_idx on public.posts (endorsed_at desc) where endorsed_at is not null;

notify pgrst, 'reload schema';
