-- Project collaboration rooms + RBI upload storage policies
-- Run this in Supabase SQL Editor after the main schema.

create table if not exists public.project_rooms (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  draft_title text,
  draft_description text,
  draft_tech_stack text,
  draft_github_link text,
  draft_demo_link text,
  draft_notes text,
  status text not null default 'active' check (status in ('active', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.project_rooms(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  email text,
  created_at timestamptz not null default now(),
  unique(room_id, user_id)
);

alter table public.project_rooms enable row level security;
alter table public.project_room_participants enable row level security;

drop policy if exists "rooms select members" on public.project_rooms;
create policy "rooms select members" on public.project_rooms for select using (
  public.can_access_project(project_id, auth.uid())
  or exists (
    select 1 from public.project_room_participants p
    where p.room_id = id and p.user_id = auth.uid()
  )
);

drop policy if exists "rooms insert owner" on public.project_rooms;
create policy "rooms insert owner" on public.project_rooms for insert with check (
  owner_id = auth.uid()
  and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
);

drop policy if exists "rooms update participants" on public.project_rooms;
create policy "rooms update participants" on public.project_rooms for update using (
  owner_id = auth.uid()
  or exists (
    select 1 from public.project_room_participants p
    where p.room_id = id and p.user_id = auth.uid()
  )
) with check (
  owner_id = auth.uid()
  or exists (
    select 1 from public.project_room_participants p
    where p.room_id = id and p.user_id = auth.uid()
  )
);

drop policy if exists "room participants select members" on public.project_room_participants;
create policy "room participants select members" on public.project_room_participants for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.project_rooms r
    where r.id = room_id and public.can_access_project(r.project_id, auth.uid())
  )
);

drop policy if exists "room participants insert self" on public.project_room_participants;
create policy "room participants insert self" on public.project_room_participants for insert with check (user_id = auth.uid());

-- RBI private storage policies. Create a private bucket named rbi-files first if it does not exist.
drop policy if exists "rbi storage owner insert" on storage.objects;
create policy "rbi storage owner insert" on storage.objects for insert with check (
  bucket_id = 'rbi-files'
  and public.is_owner(auth.uid())
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "rbi storage owner read" on storage.objects;
create policy "rbi storage owner read" on storage.objects for select using (
  bucket_id = 'rbi-files'
  and public.is_owner(auth.uid())
  and auth.uid()::text = split_part(name, '/', 1)
);

-- Browser coding workspace for project rooms.
create table if not exists public.project_code_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  room_id uuid references public.project_rooms(id) on delete cascade,
  created_by uuid references public.profiles(id) on delete set null,
  file_path text not null,
  language text not null default 'text',
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists project_code_files_permanent_unique
  on public.project_code_files(project_id, file_path)
  where room_id is null;

create unique index if not exists project_code_files_room_unique
  on public.project_code_files(project_id, room_id, file_path)
  where room_id is not null;

alter table public.project_code_files enable row level security;

drop policy if exists "code files select project members or room members" on public.project_code_files;
create policy "code files select project members or room members" on public.project_code_files for select using (
  public.can_access_project(project_id, auth.uid())
  or exists (
    select 1 from public.project_room_participants p
    where p.room_id = room_id and p.user_id = auth.uid()
  )
);

drop policy if exists "code files insert owner permanent or room member draft" on public.project_code_files;
create policy "code files insert owner permanent or room member draft" on public.project_code_files for insert with check (
  (
    room_id is null
    and created_by = auth.uid()
    and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  or (
    room_id is not null
    and created_by = auth.uid()
    and (
      exists (select 1 from public.project_rooms where id = room_id and owner_id = auth.uid())
      or exists (select 1 from public.project_room_participants p where p.room_id = project_code_files.room_id and p.user_id = auth.uid())
    )
  )
);

drop policy if exists "code files update owner permanent or room member draft" on public.project_code_files;
create policy "code files update owner permanent or room member draft" on public.project_code_files for update using (
  (
    room_id is null
    and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  or (
    room_id is not null
    and (
      exists (select 1 from public.project_rooms where id = room_id and owner_id = auth.uid())
      or exists (select 1 from public.project_room_participants p where p.room_id = project_code_files.room_id and p.user_id = auth.uid())
    )
  )
) with check (
  (
    room_id is null
    and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  or (
    room_id is not null
    and (
      exists (select 1 from public.project_rooms where id = room_id and owner_id = auth.uid())
      or exists (select 1 from public.project_room_participants p where p.room_id = project_code_files.room_id and p.user_id = auth.uid())
    )
  )
);

drop policy if exists "code files delete owner permanent or room member draft" on public.project_code_files;
create policy "code files delete owner permanent or room member draft" on public.project_code_files for delete using (
  (
    room_id is null
    and exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
  )
  or (
    room_id is not null
    and (
      exists (select 1 from public.project_rooms where id = room_id and owner_id = auth.uid())
      or exists (select 1 from public.project_room_participants p where p.room_id = project_code_files.room_id and p.user_id = auth.uid())
    )
  )
);

