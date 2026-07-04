-- Run this if your database already has the old Micky's Workshop schema.
do $$ begin
  create type public.project_visibility as enum ('private', 'public');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.change_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;

alter table public.projects add column if not exists visibility public.project_visibility not null default 'private';
alter table public.projects add column if not exists source_project_id uuid references public.projects(id) on delete set null;

create table if not exists public.project_change_requests (
  id uuid primary key default gen_random_uuid(),
  original_project_id uuid not null references public.projects(id) on delete cascade,
  copied_project_id uuid not null references public.projects(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  message text,
  status public.change_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(original_project_id, copied_project_id, requester_id)
);

alter table public.project_change_requests enable row level security;

drop policy if exists "projects select members" on public.projects;
drop policy if exists "projects select members or public" on public.projects;
create policy "projects select members or public" on public.projects for select using (visibility = 'public' or public.can_access_project(id, auth.uid()));

drop policy if exists "change requests visible to requester or original owner" on public.project_change_requests;
drop policy if exists "change requests insert copied owner" on public.project_change_requests;
drop policy if exists "change requests update original owner" on public.project_change_requests;

create policy "change requests visible to requester or original owner" on public.project_change_requests for select using (
  requester_id = auth.uid()
  or exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
);
create policy "change requests insert copied owner" on public.project_change_requests for insert with check (
  requester_id = auth.uid()
  and exists (select 1 from public.projects where id = copied_project_id and owner_id = auth.uid())
  and exists (select 1 from public.projects where id = original_project_id and visibility = 'public')
);
create policy "change requests update original owner" on public.project_change_requests for update using (
  exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
);
