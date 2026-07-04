create table if not exists public.tech_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  summary text not null,
  provider text not null,
  created_at timestamptz not null default now()
);

alter table public.tech_news enable row level security;

drop policy if exists "tech news readable" on public.tech_news;
create policy "tech news readable" on public.tech_news for select using (auth.uid() is not null);
drop policy if exists "tech news insert own" on public.tech_news;
create policy "tech news insert own" on public.tech_news for insert with check (user_id = auth.uid());
drop policy if exists "tech news delete own" on public.tech_news;
create policy "tech news delete own" on public.tech_news for delete using (user_id = auth.uid());