-- Zichtbaar logisch dossiernummer voor woningen.
-- Interne primaire sleutels blijven ongewijzigd.

create sequence if not exists public.woningen_dossiernummer_seq
  as bigint
  start with 1
  increment by 1
  minvalue 1;

alter table public.woningen
  add column if not exists dossiernummer text;

with genummerd as (
  select
    id,
    row_number() over (
      order by created_at, id
    ) as volgnummer
  from public.woningen
)
update public.woningen woning
set dossiernummer =
  'W-' || lpad(genummerd.volgnummer::text, 4, '0')
from genummerd
where woning.id = genummerd.id
  and woning.dossiernummer is null;

do $$
declare
  hoogste_nummer bigint;
begin
  select coalesce(
    max(
      substring(dossiernummer from 3)::bigint
    ),
    0
  )
  into hoogste_nummer
  from public.woningen
  where dossiernummer ~ '^W-[0-9]{4,}$';

  perform setval(
    'public.woningen_dossiernummer_seq',
    greatest(hoogste_nummer, 1),
    hoogste_nummer > 0
  );
end;
$$;

create or replace function public.vul_woning_dossiernummer()
returns trigger
language plpgsql
as $$
begin
  if new.dossiernummer is null
    or btrim(new.dossiernummer) = ''
  then
    new.dossiernummer :=
      'W-' ||
      lpad(
        nextval(
          'public.woningen_dossiernummer_seq'
        )::text,
        4,
        '0'
      );
  end if;

  return new;
end;
$$;

drop trigger if exists woningen_vul_dossiernummer
  on public.woningen;

create trigger woningen_vul_dossiernummer
before insert on public.woningen
for each row
execute function public.vul_woning_dossiernummer();

alter table public.woningen
  alter column dossiernummer set not null;

create unique index if not exists
  woningen_dossiernummer_uniek_idx
on public.woningen(dossiernummer);

alter table public.woningen
  drop constraint if exists
    woningen_dossiernummer_formaat;

alter table public.woningen
  add constraint woningen_dossiernummer_formaat
  check (dossiernummer ~ '^W-[0-9]{4,}$');
