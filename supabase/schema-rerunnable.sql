-- Micky's Workshop Supabase schema
-- Run this in the Supabase SQL editor after creating a new project.

create extension if not exists "pgcrypto";

do $$ begin
  create type public.user_role as enum ('owner', 'student', 'collaborator');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.task_status as enum ('todo', 'doing', 'done');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.project_file_type as enum ('report', 'screenshot');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.project_visibility as enum ('private', 'public');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.change_request_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null;
end $$;
do $$ begin
  create type public.rbi_folder as enum ('ESI', 'Finance', 'Management', 'Current Affairs', 'Answer Writing');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  role public.user_role not null default 'student',
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  tech_stack text,
  github_link text,
  demo_link text,
  visibility public.project_visibility not null default 'private',
  source_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_collaborators (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique(project_id, email)
);



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

create table if not exists public.project_files (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_type public.project_file_type not null,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  status public.task_status not null default 'todo',
  assignee_email text,
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  semester text,
  created_at timestamptz not null default now()
);

create table if not exists public.study_files (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_kind text not null check (file_kind in ('syllabus', 'notes', 'pyq')),
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.flashcards (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  question text not null,
  answer text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.weak_topics (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic text not null,
  notes text,
  created_at timestamptz not null default now()
);


create table if not exists public.tech_news (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  title text not null,
  summary text not null,
  provider text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  used_on date not null,
  actions_count integer not null default 0,
  unique(user_id, used_on)
);

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  ai_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id, ai_enabled) values (1, true)
on conflict (id) do nothing;

create table if not exists public.rbi_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  folder public.rbi_folder not null,
  title text not null,
  file_path text,
  extracted_text text,
  created_at timestamptz not null default now()
);

create table if not exists public.rbi_answers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  ai_feedback text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    'student'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_owner(user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'owner'
  );
$$;

create or replace function public.can_access_project(project_id uuid, user_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = project_id
      and (
        p.owner_id = user_id
        or exists (
          select 1
          from public.project_collaborators pc
          left join public.profiles pr on pr.id = user_id
          where pc.project_id = p.id
            and (pc.user_id = user_id or lower(pc.email) = lower(coalesce(pr.email, '')))
        )
      )
  );
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_collaborators enable row level security;
alter table public.project_change_requests enable row level security;
alter table public.project_files enable row level security;
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.subjects enable row level security;
alter table public.study_files enable row level security;
alter table public.flashcards enable row level security;
alter table public.weak_topics enable row level security;
alter table public.tech_news enable row level security;
alter table public.ai_usage enable row level security;
alter table public.app_settings enable row level security;
alter table public.rbi_notes enable row level security;
alter table public.rbi_answers enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (id = auth.uid());
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "projects select members or public" on public.projects;
create policy "projects select members or public" on public.projects for select using (visibility = 'public' or public.can_access_project(id, auth.uid()));
drop policy if exists "projects insert owner" on public.projects;
create policy "projects insert owner" on public.projects for insert with check (owner_id = auth.uid());
drop policy if exists "projects update owner" on public.projects;
create policy "projects update owner" on public.projects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "projects delete owner" on public.projects;
create policy "projects delete owner" on public.projects for delete using (owner_id = auth.uid());

drop policy if exists "collaborators select members" on public.project_collaborators;
create policy "collaborators select members" on public.project_collaborators for select using (public.can_access_project(project_id, auth.uid()));
drop policy if exists "collaborators insert owner" on public.project_collaborators;
create policy "collaborators insert owner" on public.project_collaborators for insert with check (
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
);
drop policy if exists "collaborators delete owner" on public.project_collaborators;
create policy "collaborators delete owner" on public.project_collaborators for delete using (
  exists (select 1 from public.projects where id = project_id and owner_id = auth.uid())
);



drop policy if exists "change requests visible to requester or original owner" on public.project_change_requests;
create policy "change requests visible to requester or original owner" on public.project_change_requests for select using (
  requester_id = auth.uid()
  or exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
);
drop policy if exists "change requests insert copied owner" on public.project_change_requests;
create policy "change requests insert copied owner" on public.project_change_requests for insert with check (
  requester_id = auth.uid()
  and exists (select 1 from public.projects where id = copied_project_id and owner_id = auth.uid())
  and exists (select 1 from public.projects where id = original_project_id and visibility = 'public')
);
drop policy if exists "change requests update original owner" on public.project_change_requests;
create policy "change requests update original owner" on public.project_change_requests for update using (
  exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
) with check (
  exists (select 1 from public.projects where id = original_project_id and owner_id = auth.uid())
);

drop policy if exists "files select members" on public.project_files;
create policy "files select members" on public.project_files for select using (public.can_access_project(project_id, auth.uid()));
drop policy if exists "files insert members" on public.project_files;
create policy "files insert members" on public.project_files for insert with check (user_id = auth.uid() and public.can_access_project(project_id, auth.uid()));

drop policy if exists "tasks select members" on public.tasks;
create policy "tasks select members" on public.tasks for select using (public.can_access_project(project_id, auth.uid()));
drop policy if exists "tasks insert members" on public.tasks;
create policy "tasks insert members" on public.tasks for insert with check (public.can_access_project(project_id, auth.uid()));
drop policy if exists "tasks update members" on public.tasks;
create policy "tasks update members" on public.tasks for update using (public.can_access_project(project_id, auth.uid())) with check (public.can_access_project(project_id, auth.uid()));
drop policy if exists "tasks delete members" on public.tasks;
create policy "tasks delete members" on public.tasks for delete using (public.can_access_project(project_id, auth.uid()));

drop policy if exists "comments select members" on public.comments;
create policy "comments select members" on public.comments for select using (public.can_access_project(project_id, auth.uid()));
drop policy if exists "comments insert members" on public.comments;
create policy "comments insert members" on public.comments for insert with check (user_id = auth.uid() and public.can_access_project(project_id, auth.uid()));

drop policy if exists "subjects own" on public.subjects;
create policy "subjects own" on public.subjects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "study files own" on public.study_files;
create policy "study files own" on public.study_files for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "flashcards own subject" on public.flashcards;
create policy "flashcards own subject" on public.flashcards for all using (
  exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);
drop policy if exists "weak topics own subject" on public.weak_topics;
create policy "weak topics own subject" on public.weak_topics for all using (
  exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects where id = subject_id and user_id = auth.uid())
);

drop policy if exists "tech news readable" on public.tech_news;
create policy "tech news readable" on public.tech_news for select using (auth.uid() is not null);
drop policy if exists "tech news insert own" on public.tech_news;
create policy "tech news insert own" on public.tech_news for insert with check (user_id = auth.uid());
drop policy if exists "tech news delete own" on public.tech_news;
create policy "tech news delete own" on public.tech_news for delete using (user_id = auth.uid());
drop policy if exists "ai usage own" on public.ai_usage;
create policy "ai usage own" on public.ai_usage for all using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "settings readable" on public.app_settings;
create policy "settings readable" on public.app_settings for select using (auth.uid() is not null);
drop policy if exists "settings owner update" on public.app_settings;
create policy "settings owner update" on public.app_settings for update using (public.is_owner(auth.uid())) with check (public.is_owner(auth.uid()));

drop policy if exists "rbi notes owner only" on public.rbi_notes;
create policy "rbi notes owner only" on public.rbi_notes for all using (public.is_owner(auth.uid())) with check (owner_id = auth.uid() and public.is_owner(auth.uid()));
drop policy if exists "rbi answers owner only" on public.rbi_answers;
create policy "rbi answers owner only" on public.rbi_answers for all using (public.is_owner(auth.uid())) with check (owner_id = auth.uid() and public.is_owner(auth.uid()));

-- Storage setup:
-- Create private buckets named project-files, study-files, and rbi-files.
-- The app uploads project files to: {user_id}/projects/{project_id}/filename.
-- Keep buckets private and serve downloads through signed URLs when you add download buttons.
drop policy if exists "project storage owner path" on storage.objects;
create policy "project storage owner path" on storage.objects for insert with check (
  bucket_id = 'project-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

drop policy if exists "project storage read own path" on storage.objects;
create policy "project storage read own path" on storage.objects for select using (
  bucket_id = 'project-files'
  and auth.uid()::text = split_part(name, '/', 1)
);

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

