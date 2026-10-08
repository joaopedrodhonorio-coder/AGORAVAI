-- Execute este arquivo no SQL Editor do projeto Supabase.
-- A publicacao fica limitada ao e-mail do administrador deste site.

create table if not exists public.trabalhos (
    id uuid primary key default gen_random_uuid(),
    numero integer not null,
    titulo text not null default 'Projeto',
    resumo text not null,
    foto_path text,
    video_path text,
    foto_paths text[] not null default array[]::text[],
    video_paths text[] not null default array[]::text[],
    created_at timestamptz not null default now()
);

alter table public.trabalhos add column if not exists titulo text not null default 'Projeto';
alter table public.trabalhos add column if not exists foto_paths text[] not null default array[]::text[];
alter table public.trabalhos add column if not exists video_paths text[] not null default array[]::text[];

update public.trabalhos
set foto_paths = array[foto_path]
where foto_path is not null and cardinality(foto_paths) = 0;

update public.trabalhos
set video_paths = array[video_path]
where video_path is not null and cardinality(video_paths) = 0;

update public.trabalhos
set titulo = left(resumo, 80)
where titulo = 'Projeto' and resumo is not null and resumo <> '';

do $$
begin
    if not exists (select 1 from public.trabalhos) then
        insert into public.trabalhos (numero, titulo, resumo)
        values
            (1, 'Nosso primeiro site', 'Aqui vamos contar como foi criar nosso primeiro projeto e quais foram as dificuldades encontradas.'),
            (2, 'Em construção...', 'Um novo projeto será adicionado aqui conforme nossa jornada avançar.');
    end if;
end;
$$;

alter table public.trabalhos enable row level security;
grant select on public.trabalhos to anon, authenticated;
grant insert, update, delete on public.trabalhos to authenticated;

drop policy if exists "Todos podem ver trabalhos" on public.trabalhos;
create policy "Todos podem ver trabalhos"
    on public.trabalhos for select
    to anon, authenticated
    using (true);

drop policy if exists "Administrador pode publicar trabalhos" on public.trabalhos;
create policy "Administrador pode publicar trabalhos"
    on public.trabalhos for insert
    to authenticated
    with check (lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com');

drop policy if exists "Administrador pode editar trabalhos" on public.trabalhos;
create policy "Administrador pode editar trabalhos"
    on public.trabalhos for update
    to authenticated
    using (lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com')
    with check (lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com');

drop policy if exists "Administrador pode remover trabalhos" on public.trabalhos;
create policy "Administrador pode remover trabalhos"
    on public.trabalhos for delete
    to authenticated
    using (lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'trabalhos',
    'trabalhos',
    true,
    52428800,
    array['image/*', 'video/*']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Todos podem ver midias de trabalhos" on storage.objects;
create policy "Todos podem ver midias de trabalhos"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'trabalhos');

drop policy if exists "Administrador pode enviar midias" on storage.objects;
create policy "Administrador pode enviar midias"
    on storage.objects for insert
    to authenticated
    with check (
        bucket_id = 'trabalhos'
        and lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com'
    );

drop policy if exists "Administrador pode remover midias" on storage.objects;
create policy "Administrador pode remover midias"
    on storage.objects for delete
    to authenticated
    using (
        bucket_id = 'trabalhos'
        and lower((auth.jwt() ->> 'email')) = 'gabrielsoaresunia@gmail.com'
    );
