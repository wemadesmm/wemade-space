# Как сделать Пространство Wemade настоящим рабочим сайтом

## 1. Supabase

1. Создайте проект в Supabase.
2. Откройте SQL Editor.
3. Выполните миграции по порядку:
   - `supabase/migrations/001_schema.sql`
   - `supabase/migrations/002_demo_seed.sql`
   - `supabase/migrations/003_site_builder.sql`
   - `supabase/migrations/004_production_auth_storage.sql`
4. В Supabase Auth включите Email/Password.
5. В Storage проверьте bucket `wemade-documents`.

## 2. Первый владелец

1. Откройте сайт.
2. Зарегистрируйте первый аккаунт.
3. В Supabase SQL Editor назначьте ему внутреннюю роль:

```sql
update public.profiles
set role = 'owner', title = 'Владелец пространства'
where email = 'YOUR_EMAIL@example.com';
```

После этого этот пользователь увидит внутренний контур, конструктор и управление рабочими данными.

## 3. Переменные окружения

Создайте `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_USE_MOCK_API=false
```

Локальный демо-режим включается так:

```bash
NEXT_PUBLIC_USE_MOCK_API=true
```

## 4. Локальный запуск

```bash
pnpm install
pnpm build
pnpm start
```

Адрес: `http://127.0.0.1:3000`.

## 5. Деплой на Vercel

1. Загрузите проект в GitHub.
2. Создайте проект на Vercel.
3. Добавьте переменные окружения:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_USE_MOCK_API=false`
4. Запустите deploy.
5. Подключите домен, например `space.wemadespace.ru`.

## 6. Как добавлять людей

- Клиент может зарегистрироваться сам, но без привязки к компании он не увидит проекты.
- Владелец или админ должен назначить клиенту `company_id`.
- Внутренним сотрудникам нужно вручную назначить роль `ops`, `pm`, `employee`, `newcomer` или `contractor`.

Пример:

```sql
update public.profiles
set role = 'client',
    company_id = 'COMPANY_UUID'
where email = 'client@example.com';
```

```sql
update public.profiles
set role = 'pm',
    title = 'Руководитель проектов'
where email = 'pm@example.com';
```

## Что уже готово

- Авторизация через Supabase Auth.
- Общая база данных вместо `localStorage` в production-режиме.
- RLS-политики для внутреннего и клиентского контуров.
- Конструктор сайта хранится в Supabase.
- CRUD проектов, задач, документов и базы знаний пишет в Supabase.
- Приватный bucket документов с политиками доступа.
