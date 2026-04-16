-- ─────────────────────────────────────────────────────────────────
--  FLIPBOOK SETUP — Execute no SQL Editor do Supabase
--  https://supabase.com/dashboard → seu projeto → SQL Editor
-- ─────────────────────────────────────────────────────────────────

-- 1. Tabela de flipbooks
create table if not exists public.flipbooks (
  id            uuid primary key default gen_random_uuid(),
  title         text not null default 'Flipbook',
  pdf_path      text not null,
  cover_page    int  not null default 1,
  back_cover_page int not null default 1,
  total_pages   int  not null default 1,
  created_at    timestamptz not null default now()
);

-- 2. Acesso público de leitura (qualquer pessoa com o link pode visualizar)
alter table public.flipbooks enable row level security;

create policy "leitura publica"
  on public.flipbooks for select
  using (true);

create policy "insercao publica"
  on public.flipbooks for insert
  with check (true);

-- 3. Storage bucket (execute depois de criar o bucket manualmente
--    em Storage → New Bucket → nome: "flipbooks" → Public: SIM)
-- Depois rode:
insert into storage.buckets (id, name, public)
values ('flipbooks', 'flipbooks', true)
on conflict (id) do nothing;

-- Policy: qualquer pessoa pode fazer upload e leitura
create policy "upload publico"
  on storage.objects for insert
  with check (bucket_id = 'flipbooks');

create policy "leitura publica storage"
  on storage.objects for select
  using (bucket_id = 'flipbooks');
