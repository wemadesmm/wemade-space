create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  brand_name text not null,
  logo_letter text not null,
  tagline text not null,
  hero_title text not null,
  hero_text text not null,
  primary_color text not null default '#3B39FF',
  secondary_color text not null default '#B8FF34',
  accent_color text not null default '#F57644',
  updated_at timestamptz not null default now()
);

create table public.site_modules (
  id text primary key,
  title text not null,
  description text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table public.site_pages (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  audience text not null default 'all',
  headline text not null,
  body text not null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
alter table public.site_modules enable row level security;
alter table public.site_pages enable row level security;

create policy "site settings readable for signed users" on public.site_settings
  for select using (auth.uid() is not null);

create policy "site modules readable for signed users" on public.site_modules
  for select using (auth.uid() is not null);

create policy "site pages readable by audience" on public.site_pages
  for select using (
    enabled = true
    and (
      audience = 'all'
      or public.is_internal()
      or (audience = 'client' and public.current_company_id() is not null)
    )
  );

create policy "internal can manage site settings" on public.site_settings
  for all using (public.is_internal()) with check (public.is_internal());

create policy "internal can manage site modules" on public.site_modules
  for all using (public.is_internal()) with check (public.is_internal());

create policy "internal can manage site pages" on public.site_pages
  for all using (public.is_internal()) with check (public.is_internal());

insert into public.site_settings (brand_name, logo_letter, tagline, hero_title, hero_text)
values (
  'Пространство Wemade',
  'W',
  'Команда и клиенты',
  'Пространство Wemade',
  'Единая рабочая система для проектов, задач, документов, согласований, знаний и клиентской коммуникации.'
);

insert into public.site_modules (id, title, description, enabled) values
  ('projects', 'Проекты', 'Статусы, дедлайны, риски и следующий шаг.', true),
  ('tasks', 'Задачи', 'Личные, проектные и клиентские задачи.', true),
  ('documents', 'Документы', 'Материалы, отчеты и согласования.', true),
  ('knowledge', 'База знаний', 'Процессы, культура и адаптация.', true),
  ('game', 'Мини-игра', 'Легкий внутренний перерыв.', true),
  ('shop', 'Магазин приколышей', 'Внутренние бонусы и приятности.', true)
on conflict (id) do nothing;

insert into public.site_pages (title, slug, audience, headline, body, enabled) values
  ('Главная', '/', 'all', 'Все рабочее пространство в одном месте', 'Команда видит операционную картину, клиенты видят прозрачный и спокойный личный кабинет.', true),
  ('Кабинет клиента', '/client', 'client', 'Клиент понимает, что происходит по проекту', 'Статусы, материалы, отчеты, календарь и запросы собраны в безопасном контуре.', true)
on conflict (slug) do nothing;
