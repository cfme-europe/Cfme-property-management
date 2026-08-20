begin;

update public.woning_objecten
set objectnummer =
  format('ARCH-%s-%s', id, objectnummer)
where actief = false
  and objectnummer is not null
  and objectnummer !~ '^ARCH-[0-9]+-';


create or replace function public.archiveer_woning_objectnummer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.actief is true
       and new.actief is false
       and new.objectnummer is not null
       and new.objectnummer !~ '^ARCH-[0-9]+-' then
      new.objectnummer :=
        format(
          'ARCH-%s-%s',
          old.id,
          new.objectnummer
        );
    end if;
  end if;

  if new.actief is true
     and new.objectnummer is not null then
    update public.woning_objecten
    set objectnummer =
      format(
        'ARCH-%s-%s',
        id,
        objectnummer
      )
    where woning_id = new.woning_id
      and id is distinct from new.id
      and actief = false
      and objectnummer = new.objectnummer
      and objectnummer !~ '^ARCH-[0-9]+-';
  end if;

  return new;
end;
$$;

revoke all
on function public.archiveer_woning_objectnummer()
from public;

drop trigger if exists
  woning_objecten_archiveer_objectnummer
on public.woning_objecten;

create trigger woning_objecten_archiveer_objectnummer
before insert or update of objectnummer, actief
on public.woning_objecten
for each row
execute function public.archiveer_woning_objectnummer();


do $$
begin
  if exists (
    select 1
    from public.woning_objecten
    where actief = false
      and objectnummer is not null
      and objectnummer !~ '^ARCH-[0-9]+-'
  ) then
    raise exception
      'Niet alle inactieve objectnummers zijn gearchiveerd.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname =
      'woning_objecten_archiveer_objectnummer'
      and tgisinternal = false
  ) then
    raise exception
      'Objectnummer-archieftrigger ontbreekt.';
  end if;

  if not exists (
    select 1
    from pg_constraint c
    join pg_class t
      on t.oid = c.conrelid
    join pg_namespace n
      on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'woning_objecten'
      and c.conname =
        'woning_objecten_objectnummer_uniek'
      and c.condeferrable = true
      and c.condeferred = true
  ) then
    raise exception
      'Objectnummerconstraint is niet deferred.';
  end if;
end;
$$;

commit;
