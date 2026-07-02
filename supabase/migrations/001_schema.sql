create extension if not exists "pgcrypto";

create type app_role as enum ('owner', 'ops', 'pm', 'employee', 'newcomer', 'contractor', 'client');
create type item_status as enum ('active', 'review', 'risk', 'done', 'archived');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null,
  health text not null default 'good',
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references public.companies(id),
  email text,
  full_name text not null,
  role app_role not null default 'employee',
  title text not null default '',
  created_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  status item_status not null default 'active',
  owner_id uuid references public.profiles(id),
  deadline date not null,
  progress integer not null default 0 check (progress between 0 and 100),
  risk text not null default '',
  next_step text not null default '',
  budget_visible_to_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  assignee_id uuid references public.profiles(id),
  status item_status not null default 'active',
  priority text not null default 'normal',
  due date not null,
  internal_only boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  type text not null,
  status text not null default 'draft',
  client_visible boolean not null default false,
  storage_path text,
  updated_at timestamptz not null default now()
);

create table public.knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  body text not null,
  archived boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  visibility text not null default 'internal'
);

create table public.discussions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  last_message text not null default '',
  visibility text not null default 'internal',
  updated_at timestamptz not null default now()
);

create table public.change_log (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  action text not null,
  actor_id uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create or replace function public.current_profile()
returns public.profiles
language sql
security definer
stable
as $$
  select * from public.profiles where id = auth.uid()
$$;

create or replace function public.is_internal()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role in ('owner', 'ops', 'pm', 'employee', 'newcomer', 'contractor')
  )
$$;

create or replace function public.current_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

alter table public.companies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.documents enable row level security;
alter table public.knowledge_articles enable row level security;
alter table public.calendar_events enable row level security;
alter table public.discussions enable row level security;
alter table public.change_log enable row level security;

create policy "internal can read companies" on public.companies for select using (public.is_internal() or id = public.current_company_id());
create policy "internal can manage companies" on public.companies for all using (public.is_internal()) with check (public.is_internal());

create policy "profiles are visible by role" on public.profiles for select using (public.is_internal() or id = auth.uid());
create policy "profile owner can update self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "internal can manage profiles" on public.profiles for all using (public.is_internal()) with check (public.is_internal());

create policy "projects visible by contour" on public.projects for select using (public.is_internal() or company_id = public.current_company_id());
create policy "internal can manage projects" on public.projects for all using (public.is_internal()) with check (public.is_internal());

create policy "tasks visible by contour" on public.tasks for select using (
  public.is_internal()
  or (
    internal_only = false
    and project_id in (select id from public.projects where company_id = public.current_company_id())
  )
);
create policy "internal can manage tasks" on public.tasks for all using (public.is_internal()) with check (public.is_internal());

create policy "documents visible by contour" on public.documents for select using (
  public.is_internal()
  or (
    client_visible = true
    and project_id in (select id from public.projects where company_id = public.current_company_id())
  )
);
create policy "internal can manage documents" on public.documents for all using (public.is_internal()) with check (public.is_internal());

create policy "knowledge internal read" on public.knowledge_articles for select using (public.is_internal() and archived = false);
create policy "knowledge internal manage" on public.knowledge_articles for all using (public.is_internal()) with check (public.is_internal());

create policy "events visible by contour" on public.calendar_events for select using (
  public.is_internal()
  or (
    visibility in ('client', 'all')
    and (project_id is null or project_id in (select id from public.projects where company_id = public.current_company_id()))
  )
);
create policy "internal can manage events" on public.calendar_events for all using (public.is_internal()) with check (public.is_internal());

create policy "discussions visible by contour" on public.discussions for select using (
  public.is_internal()
  or (
    visibility = 'client'
    and project_id in (select id from public.projects where company_id = public.current_company_id())
  )
);
create policy "internal can manage discussions" on public.discussions for all using (public.is_internal()) with check (public.is_internal());

create policy "internal can read log" on public.change_log for select using (public.is_internal());
create policy "internal can write log" on public.change_log for insert with check (public.is_internal());
