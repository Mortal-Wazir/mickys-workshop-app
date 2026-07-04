-- Run this if your database already exists and task delete is not allowed yet.
drop policy if exists "tasks delete members" on public.tasks;
create policy "tasks delete members" on public.tasks for delete using (public.can_access_project(project_id, auth.uid()));