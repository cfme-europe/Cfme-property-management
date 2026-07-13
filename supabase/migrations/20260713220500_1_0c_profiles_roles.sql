do $$
begin
  if not exists (
    select 1
    from pg_type
    where typname = 'app_role'
  ) then
    create type public.app_role as enum (
      'admin',
      'medewerker',
      'lezen'
    );
  end if;
end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text,
  volledige_naam text,
  rol public.app_role not null default 'medewerker',
  actief boolean not null default true
);

create index if not exists profiles_rol_idx
  on public.profiles(rol);

create index if not exists profiles_actief_idx
  on public.profiles(actief);

create or replace function public.set_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at
  on public.profiles;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_profiles_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    volledige_naam,
    rol,
    actief
  )
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'volledige_naam',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1)
    ),
    case
      when new.raw_user_meta_data ->> 'rol'
        in ('admin', 'medewerker', 'lezen')
      then (
        new.raw_user_meta_data ->> 'rol'
      )::public.app_role
      else 'medewerker'::public.app_role
    end,
    true
  )
  on conflict (id) do update
  set
    email = excluded.email,
    volledige_naam = coalesce(
      public.profiles.volledige_naam,
      excluded.volledige_naam
    );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created
  on auth.users;

create trigger on_auth_user_created
after insert or update of email, raw_user_meta_data
on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (
  id,
  email,
  volledige_naam,
  rol,
  actief
)
select
  gebruiker.id,
  gebruiker.email,
  coalesce(
    gebruiker.raw_user_meta_data ->> 'volledige_naam',
    gebruiker.raw_user_meta_data ->> 'name',
    split_part(
      coalesce(gebruiker.email, ''),
      '@',
      1
    )
  ),
  case
    when gebruiker.raw_user_meta_data ->> 'rol'
      in ('admin', 'medewerker', 'lezen')
    then (
      gebruiker.raw_user_meta_data ->> 'rol'
    )::public.app_role
    else 'medewerker'::public.app_role
  end,
  true
from auth.users gebruiker
on conflict (id) do update
set email = excluded.email;

create or replace function public.huidige_gebruiker_rol()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select profiel.rol
  from public.profiles profiel
  where profiel.id = auth.uid()
    and profiel.actief = true;
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.huidige_gebruiker_rol() = 'admin',
    false
  );
$$;

create or replace function public.mag_wijzigen()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.huidige_gebruiker_rol()
      in ('admin', 'medewerker'),
    false
  );
$$;

alter table public.profiles
enable row level security;

drop policy if exists
  "Profiel lezen"
on public.profiles;

create policy "Profiel lezen"
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
);

drop policy if exists
  "Profiel wijzigen"
on public.profiles;

create policy "Profiel wijzigen"
on public.profiles
for update
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
)
with check (
  (
    id = auth.uid()
    and rol = (
      select bestaand.rol
      from public.profiles bestaand
      where bestaand.id = auth.uid()
    )
    and actief = (
      select bestaand.actief
      from public.profiles bestaand
      where bestaand.id = auth.uid()
    )
  )
  or public.is_admin()
);

drop policy if exists
  "Profiel toevoegen"
on public.profiles;

create policy "Profiel toevoegen"
on public.profiles
for insert
to authenticated
with check (
  public.is_admin()
);

drop policy if exists
  "Profiel verwijderen"
on public.profiles;

create policy "Profiel verwijderen"
on public.profiles
for delete
to authenticated
using (
  public.is_admin()
);

grant select, insert, update, delete
on public.profiles
to authenticated;

grant execute
on function public.huidige_gebruiker_rol()
to authenticated;

grant execute
on function public.is_admin()
to authenticated;

grant execute
on function public.mag_wijzigen()
to authenticated;
