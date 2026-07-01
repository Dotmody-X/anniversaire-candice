-- Mur des souvenirs — schéma appliqué au projet Supabase (org Truber, ref pjehsndnhrypnqcqyasn)
-- Table et bucket volontairement préfixés "candice" : isolés du reste du projet.

create table if not exists public.candice_souvenirs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 60),
  message text check (message is null or char_length(message) <= 1000),
  photo_path text check (photo_path is null or photo_path like 'photos/%'),
  check (message is not null or photo_path is not null)
);

alter table public.candice_souvenirs enable row level security;

drop policy if exists "candice_public_read" on public.candice_souvenirs;
create policy "candice_public_read"
  on public.candice_souvenirs for select
  to anon using (true);

drop policy if exists "candice_public_insert" on public.candice_souvenirs;
create policy "candice_public_insert"
  on public.candice_souvenirs for insert
  to anon with check (true);

-- Bucket public (lecture directe), limité aux images, 6 Mo max
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candice-souvenirs', 'candice-souvenirs', true, 6291456,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "candice_souvenirs_upload" on storage.objects;
create policy "candice_souvenirs_upload"
  on storage.objects for insert
  to anon
  with check (bucket_id = 'candice-souvenirs' and name like 'photos/%');
