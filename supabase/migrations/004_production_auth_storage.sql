alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, title, company_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'client',
    coalesce(new.raw_user_meta_data->>'title', ''),
    nullif(new.raw_user_meta_data->>'company_id', '')::uuid
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    title = excluded.title;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('wemade-documents', 'wemade-documents', false)
on conflict (id) do nothing;

create policy "internal can upload documents" on storage.objects
  for insert with check (
    bucket_id = 'wemade-documents'
    and public.is_internal()
  );

create policy "internal can read documents" on storage.objects
  for select using (
    bucket_id = 'wemade-documents'
    and public.is_internal()
  );

create policy "clients can read visible project documents" on storage.objects
  for select using (
    bucket_id = 'wemade-documents'
    and exists (
      select 1
      from public.documents d
      join public.projects p on p.id = d.project_id
      where d.storage_path = storage.objects.name
        and d.client_visible = true
        and p.company_id = public.current_company_id()
    )
  );

create policy "internal can update documents" on storage.objects
  for update using (
    bucket_id = 'wemade-documents'
    and public.is_internal()
  );

create policy "internal can delete documents" on storage.objects
  for delete using (
    bucket_id = 'wemade-documents'
    and public.is_internal()
  );
