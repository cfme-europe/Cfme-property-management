begin;

create or replace function public.sla_ruimte_akkoord_op(
  p_controlesessie_id bigint,
  p_ruimte_id bigint,
  p_controlepunt_ids bigint[]
)
returns table (
  controle_resultaat_id bigint,
  woning_controlepunt_id bigint
)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_woning_id bigint;
  v_inspectie_id bigint;
  v_controleur_id uuid;
  v_punt record;
begin
  if p_controlesessie_id is null
    or p_controlesessie_id <= 0
  then
    raise exception 'Ongeldige controlesessie.';
  end if;

  if p_ruimte_id is null
    or p_ruimte_id <= 0
  then
    raise exception 'Ongeldige ruimte.';
  end if;

  if p_controlepunt_ids is null
    or cardinality(p_controlepunt_ids) = 0
  then
    raise exception
      'Er zijn geen controlepunten geselecteerd voor ruimteakkoord.';
  end if;

  if not public.mag_controles_uitvoeren() then
    raise exception
      'Onvoldoende rechten om controles uit te voeren.';
  end if;

  select
    sessie.woning_id,
    sessie.inspectie_id,
    sessie.controleur_id
  into
    v_woning_id,
    v_inspectie_id,
    v_controleur_id
  from public.controlesessies sessie
  where sessie.id = p_controlesessie_id
    and sessie.status = 'bezig'
  for update;

  if v_woning_id is null then
    raise exception
      'De controlesessie bestaat niet of is niet actief.';
  end if;

  if v_controleur_id is not null
    and v_controleur_id <> auth.uid()
  then
    raise exception
      'Deze controle is niet aan de huidige gebruiker toegewezen.';
  end if;

  if not exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.id = p_ruimte_id
      and ruimte.woning_id = v_woning_id
      and ruimte.actief
  ) then
    raise exception
      'De ruimte hoort niet bij deze actieve woningroute.';
  end if;

  if exists (
    select 1
    from unnest(p_controlepunt_ids) gekozen(id)
    left join public.woning_controlepunten punt
      on punt.id = gekozen.id
      and punt.woning_id = v_woning_id
      and punt.ruimte_id = p_ruimte_id
      and punt.actief
    where punt.id is null
  ) then
    raise exception
      'Minimaal één controlepunt hoort niet bij deze actieve ruimte.';
  end if;

  for v_punt in
    select
      punt.id,
      punt.object_id,
      ruimte.naam as ruimte_naam,
      object.naam as object_naam,
      coalesce(
        punt.naam_override,
        definitie.naam
      ) as controlepunt_naam
    from public.woning_controlepunten punt
    join public.woning_ruimten ruimte
      on ruimte.id = punt.ruimte_id
    join public.controlepunt_definities definitie
      on definitie.id = punt.definitie_id
    left join public.woning_objecten object
      on object.id = punt.object_id
    where punt.id = any(p_controlepunt_ids)
      and punt.woning_id = v_woning_id
      and punt.ruimte_id = p_ruimte_id
      and punt.actief
    order by
      coalesce(object.loopvolgorde, 0),
      punt.loopvolgorde,
      punt.id
  loop
    insert into public.controle_resultaten (
      controlesessie_id,
      inspectie_id,
      woning_id,
      ruimte_id,
      object_id,
      woning_controlepunt_id,
      resultaat,
      numerieke_waarde,
      tekstwaarde,
      datumwaarde,
      ruimte_naam_snapshot,
      object_naam_snapshot,
      controlepunt_naam_snapshot,
      beoordeeld_at,
      beoordeeld_door,
      opmerkingen
    )
    values (
      p_controlesessie_id,
      v_inspectie_id,
      v_woning_id,
      p_ruimte_id,
      v_punt.object_id,
      v_punt.id,
      'goed',
      null,
      null,
      null,
      v_punt.ruimte_naam,
      v_punt.object_naam,
      v_punt.controlepunt_naam,
      now(),
      auth.uid(),
      'Gezamenlijk akkoord via ruimtecontrole.'
    )
    on conflict (
      controlesessie_id,
      woning_controlepunt_id
    )
    do update set
      resultaat = 'goed',
      numerieke_waarde = null,
      tekstwaarde = null,
      datumwaarde = null,
      ruimte_naam_snapshot =
        excluded.ruimte_naam_snapshot,
      object_naam_snapshot =
        excluded.object_naam_snapshot,
      controlepunt_naam_snapshot =
        excluded.controlepunt_naam_snapshot,
      beoordeeld_at = now(),
      beoordeeld_door = auth.uid(),
      opmerkingen =
        'Gezamenlijk akkoord via ruimtecontrole.'
    returning
      id,
      woning_controlepunt_id
    into
      controle_resultaat_id,
      woning_controlepunt_id;

    update public.controle_afwijkingen
    set
      status = 'niet_relevant',
      opvolging_nodig = false,
      melding_maken = false,
      taak_maken = false
    where controle_resultaat_id =
      sla_ruimte_akkoord_op.controle_resultaat_id
      and status in ('open', 'in_opvolging');

    return next;
  end loop;
end;
$$;

revoke all
on function public.sla_ruimte_akkoord_op(
  bigint,
  bigint,
  bigint[]
)
from public, anon;

grant execute
on function public.sla_ruimte_akkoord_op(
  bigint,
  bigint,
  bigint[]
)
to authenticated, service_role;

comment on function public.sla_ruimte_akkoord_op(
  bigint,
  bigint,
  bigint[]
)
is
  'Inspection Engine 9.0C: slaat geselecteerde normale controlepunten van één ruimte gezamenlijk en transactioneel als goed op.';

commit;
