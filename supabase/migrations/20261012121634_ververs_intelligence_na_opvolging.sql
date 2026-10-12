-- Houd afgeleide intelligence synchroon met de feitelijke taakstatus.
-- Brongegevens en bestaande afhandelhistorie blijven behouden.

create or replace function public.bewaar_afgehandeld_intelligence_werkpunt()
returns trigger
language plpgsql
as $$
begin
  if old.status in ('opgevolgd', 'genegeerd')
    and new.status = 'actief'
    and new.deduplicatie_sleutel = old.deduplicatie_sleutel
  then
    new.status = old.status;
    new.geactiveerd_at = old.geactiveerd_at;
    new.opgevolgd_at = old.opgevolgd_at;
    new.afgehandeld_at = old.afgehandeld_at;
    new.afgehandeld_door = old.afgehandeld_door;
    new.afgehandeld_door_naam = old.afgehandeld_door_naam;
    new.afhandelnotitie = old.afhandelnotitie;
  end if;

  return new;
end;
$$;

drop trigger if exists intelligence_werkpunten_afhandeling_bewaren
  on public.intelligence_werkpunten;

create trigger intelligence_werkpunten_afhandeling_bewaren
before update on public.intelligence_werkpunten
for each row
execute function public.bewaar_afgehandeld_intelligence_werkpunt();

revoke all
on function public.bewaar_afgehandeld_intelligence_werkpunt()
from public, anon, authenticated;

grant execute
on function public.bewaar_afgehandeld_intelligence_werkpunt()
to service_role;


create or replace function public.ververs_intelligence_na_taakwijziging()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_woning_id bigint;
begin
  if tg_op = 'DELETE' then
    v_woning_id := old.woning_id;
  else
    v_woning_id := new.woning_id;
  end if;

  perform public.genereer_intelligence_pakket(
    v_woning_id,
    null,
    current_date
  );

  if tg_op = 'UPDATE'
    and old.woning_id is distinct from new.woning_id
  then
    perform public.genereer_intelligence_pakket(
      old.woning_id,
      null,
      current_date
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

drop trigger if exists taken_intelligence_na_wijziging
  on public.taken;

create trigger taken_intelligence_na_wijziging
after insert or delete or update of status, deadline, woning_id
on public.taken
for each row
execute function public.ververs_intelligence_na_taakwijziging();

revoke all
on function public.ververs_intelligence_na_taakwijziging()
from public, anon, authenticated;

grant execute
on function public.ververs_intelligence_na_taakwijziging()
to service_role;


do $$
declare
  v_woning record;
begin
  for v_woning in
    with actuele_telling as (
      select
        woning.id as woning_id,
        count(taak.id) filter (
          where taak.status in ('open', 'in_behandeling')
        )::integer as taken_open,
        count(taak.id) filter (
          where taak.status in ('open', 'in_behandeling')
            and taak.deadline is not null
            and taak.deadline < current_date
        )::integer as taken_over_deadline
      from public.woningen woning
      left join public.taken taak
        on taak.woning_id = woning.id
      group by woning.id
    )
    select telling.woning_id
    from actuele_telling telling
    left join lateral (
      select
        snapshot.taken_open,
        snapshot.taken_over_deadline
      from public.woning_dna_snapshots snapshot
      where snapshot.woning_id = telling.woning_id
      order by snapshot.peildatum desc, snapshot.berekend_at desc
      limit 1
    ) laatste_snapshot on true
    where laatste_snapshot.taken_open is distinct from telling.taken_open
      or laatste_snapshot.taken_over_deadline
        is distinct from telling.taken_over_deadline
  loop
    perform public.genereer_intelligence_pakket(
      v_woning.woning_id,
      null,
      current_date
    );
  end loop;
end;
$$;

comment on function public.ververs_intelligence_na_taakwijziging()
is 'Vernieuwt Woning-DNA en controlebriefing na een feitelijke taakwijziging.';

comment on function public.bewaar_afgehandeld_intelligence_werkpunt()
is 'Voorkomt dat herberekening een reeds afgehandeld intelligence-werkpunt opnieuw activeert.';
