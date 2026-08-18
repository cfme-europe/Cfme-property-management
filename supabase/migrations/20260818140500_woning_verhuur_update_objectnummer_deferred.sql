begin;

-- Woningbasisgegevens corrigeren.
grant update (adres, postcode, plaats)
on table public.woningen
to authenticated;

drop policy if exists "Woningen bevoegd wijzigen"
on public.woningen;

create policy "Woningen bevoegd wijzigen"
on public.woningen
for update
to authenticated
using (public.mag_wijzigen())
with check (public.mag_wijzigen());


-- Actieve verhuurperiode corrigeren zonder nieuw record.
grant update (
  bedrijf_id,
  startdatum,
  geplande_einddatum,
  maandhuur,
  borg,
  facturatie_dag,
  referentie,
  opmerkingen
)
on table public.verhuurperiodes
to authenticated;

drop policy if exists "Verhuurperiodes bevoegd wijzigen"
on public.verhuurperiodes;

create policy "Verhuurperiodes bevoegd wijzigen"
on public.verhuurperiodes
for update
to authenticated
using (
  public.mag_wijzigen()
  and status = 'actief'
)
with check (
  public.mag_wijzigen()
  and status = 'actief'
);


-- Objectnummers blijven per woning uniek.
-- Tijdens transactionele route-hernummering mag tijdelijk
-- een nummer dubbel bestaan; eindtoestand moet uniek zijn.
alter table public.woning_objecten
drop constraint if exists
  woning_objecten_objectnummer_uniek;

alter table public.woning_objecten
add constraint woning_objecten_objectnummer_uniek
unique (woning_id, objectnummer)
deferrable initially deferred;


-- Migratie mag alleen slagen als alle drie beveiligingen bestaan.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'woningen'
      and policyname = 'Woningen bevoegd wijzigen'
      and cmd = 'UPDATE'
  ) then
    raise exception
      'UPDATE-policy woningen ontbreekt.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'verhuurperiodes'
      and policyname =
        'Verhuurperiodes bevoegd wijzigen'
      and cmd = 'UPDATE'
  ) then
    raise exception
      'UPDATE-policy verhuurperiodes ontbreekt.';
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
