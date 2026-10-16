-- Cole tudo isto no Supabase: SQL Editor > New query > Run.
-- Pode rodar mais de uma vez sem problema.

create table if not exists public.books (
  id uuid primary key,
  title text not null,
  author text default '',
  total_pages int default 0,
  current_page int default 0,
  status text default 'reading',          -- reading | finished | want
  favorite boolean default false,
  rating int,
  review text default '',
  finished_at timestamptz,
  cover_path text,
  pdf_path text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false,
  server_ts timestamptz default now()
);

create table if not exists public.sessions (
  id uuid primary key,
  book_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_sec int default 0,
  start_page int default 0,
  end_page int default 0,
  pages_read int default 0,
  mode text default 'free',
  updated_at timestamptz default now(),
  deleted boolean default false,
  server_ts timestamptz default now()
);

create table if not exists public.settings (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now(),
  server_ts timestamptz default now()
);

-- carimbo de hora do servidor (usado na sincronização entre aparelhos)
create or replace function public.folio_touch() returns trigger as $$
begin
  new.server_ts := now();
  return new;
end; $$ language plpgsql;

drop trigger if exists t_books on public.books;
create trigger t_books before insert or update on public.books
  for each row execute function public.folio_touch();
drop trigger if exists t_sessions on public.sessions;
create trigger t_sessions before insert or update on public.sessions
  for each row execute function public.folio_touch();
drop trigger if exists t_settings on public.settings;
create trigger t_settings before insert or update on public.settings
  for each row execute function public.folio_touch();

create index if not exists books_ts on public.books (server_ts);
create index if not exists sessions_ts on public.sessions (server_ts);
create index if not exists settings_ts on public.settings (server_ts);

-- acesso (sem login): quem tiver a chave anon do app consegue ler e gravar
alter table public.books enable row level security;
alter table public.sessions enable row level security;
alter table public.settings enable row level security;

drop policy if exists "folio_books" on public.books;
create policy "folio_books" on public.books for all to anon using (true) with check (true);
drop policy if exists "folio_sessions" on public.sessions;
create policy "folio_sessions" on public.sessions for all to anon using (true) with check (true);
drop policy if exists "folio_settings" on public.settings;
create policy "folio_settings" on public.settings for all to anon using (true) with check (true);

-- armazenamento de capas e PDFs (bucket privado)
insert into storage.buckets (id, name, public, file_size_limit)
values ('books', 'books', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "folio_files" on storage.objects;
create policy "folio_files" on storage.objects for all to anon
  using (bucket_id = 'books') with check (bucket_id = 'books');

-- ===== NOVO (versão 3): marcações + tempo real =====
create table if not exists public.highlights (
  id uuid primary key,
  book_id uuid,
  page int default 1,
  kind text default 'like',              -- like | doubt | note
  rects jsonb default '[]'::jsonb,
  text text default '',
  note text default '',
  resolved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted boolean default false,
  server_ts timestamptz default now()
);
drop trigger if exists t_highlights on public.highlights;
create trigger t_highlights before insert or update on public.highlights
  for each row execute function public.folio_touch();
create index if not exists highlights_ts on public.highlights (server_ts);
alter table public.highlights enable row level security;
drop policy if exists "folio_highlights" on public.highlights;
create policy "folio_highlights" on public.highlights for all to anon using (true) with check (true);

-- avisa os outros aparelhos na hora em que algo muda
do $$
declare t text;
begin
  foreach t in array array['books','sessions','settings','highlights'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
