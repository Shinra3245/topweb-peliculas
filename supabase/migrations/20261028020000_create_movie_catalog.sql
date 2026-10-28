create table public.movies (
  id integer primary key check (id > 0),
  title text not null check (length(title) > 0),
  original_title text not null,
  release_date date,
  poster_url text,
  backdrop_url text,
  overview text not null default '',
  runtime integer check (runtime is null or runtime >= 0),
  vote_average numeric check (vote_average between 0 and 10),
  original_language text,
  source_url text unique not null,
  imported_at timestamptz not null default now()
);
create table public.genres (id integer primary key, name text not null);
create table public.movie_genres (
  movie_id integer references public.movies(id) on delete cascade,
  genre_id integer references public.genres(id),
  primary key (movie_id, genre_id)
);
create index movie_title_idx on public.movies(title);
create index movie_genre_idx on public.movie_genres(genre_id);
alter table public.movies enable row level security;
alter table public.genres enable row level security;
alter table public.movie_genres enable row level security;
revoke all on public.movies, public.genres, public.movie_genres from anon, authenticated;
grant select on public.movies, public.genres, public.movie_genres to authenticated;
grant all on public.movies, public.genres, public.movie_genres to service_role;
create policy "Lectura de peliculas con sesion" on public.movies for select to authenticated using (true);
create policy "Lectura de generos con sesion" on public.genres for select to authenticated using (true);
create policy "Lectura de relaciones con sesion" on public.movie_genres for select to authenticated using (true);

-- Cada carga actualiza películas, géneros y relaciones dentro de una transacción.
create function public.import_movie_catalog(payload jsonb) returns integer
language plpgsql security invoker set search_path = public
as $$
declare item jsonb; genre jsonb; total integer := 0;
begin
  if jsonb_typeof(payload) is distinct from 'array' or jsonb_array_length(payload) = 0 then
    raise exception 'La carga debe contener peliculas';
  end if;
  for item in select value from jsonb_array_elements(payload) loop
    insert into public.movies(id,title,original_title,release_date,poster_url,backdrop_url,overview,runtime,vote_average,original_language,source_url,imported_at)
    values ((item->>'id')::integer,item->>'title',item->>'original_title',nullif(item->>'release_date','')::date,item->>'poster_url',item->>'backdrop_url',coalesce(item->>'overview',''),(item->>'runtime')::integer,(item->>'vote_average')::numeric,item->>'original_language',item->>'source_url',now())
    on conflict (id) do update set title=excluded.title,original_title=excluded.original_title,release_date=excluded.release_date,poster_url=excluded.poster_url,backdrop_url=excluded.backdrop_url,overview=excluded.overview,runtime=excluded.runtime,vote_average=excluded.vote_average,original_language=excluded.original_language,source_url=excluded.source_url,imported_at=excluded.imported_at;
    delete from public.movie_genres where movie_id=(item->>'id')::integer;
    for genre in select value from jsonb_array_elements(item->'genres') loop
      insert into public.genres(id,name) values ((genre->>'id')::integer,genre->>'name')
      on conflict (id) do update set name=excluded.name;
      insert into public.movie_genres(movie_id,genre_id) values ((item->>'id')::integer,(genre->>'id')::integer)
      on conflict do nothing;
    end loop;
    total := total+1;
  end loop;
  return total;
end;
$$;
revoke all on function public.import_movie_catalog(jsonb) from public, anon, authenticated;
grant execute on function public.import_movie_catalog(jsonb) to service_role;
