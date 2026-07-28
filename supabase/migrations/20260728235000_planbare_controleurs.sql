-- CFME Control
-- Alleen expliciete controleurs zijn nieuw planbaar.
-- Bestaande actieve toewijzingen aan andere rollen blijven zichtbaar,
-- zodat operationele historie en bestaande planning niet verdwijnen.

create or replace view public.controleur_planning_samenvatting
with (security_invoker = true)
as
select
  profiel.id as controleur_id,
  profiel.volledige_naam as controleur_naam,
  profiel.email as controleur_email,

  count(planning.woning_id)::integer
    as aantal_woningen,

  count(*) filter (
    where planning.planning_status = 'achterstallig'
  )::integer as achterstallig,

  count(*) filter (
    where planning.planning_status = 'vandaag'
  )::integer as vandaag,

  count(*) filter (
    where planning.planning_status = 'binnen_7_dagen'
  )::integer as binnen_7_dagen,

  count(*) filter (
    where planning.planning_status = 'binnen_14_dagen'
  )::integer as binnen_14_dagen,

  count(*) filter (
    where planning.planning_status in (
      'achterstallig',
      'vandaag',
      'binnen_7_dagen'
    )
  )::integer as werkvoorraad_7_dagen

from public.profiles profiel
left join public.woning_planning_intelligence planning
  on planning.controleur_id = profiel.id

where profiel.actief = true
  and (
    profiel.rol = 'controleur'

    or exists (
      select 1
      from public.woning_rayon_toewijzingen toewijzing
      where toewijzing.actief = true
        and toewijzing.geldig_tot is null
        and toewijzing.standaard_controleur_id = profiel.id
    )

    or exists (
      select 1
      from public.rayons rayon
      where rayon.actief = true
        and rayon.standaard_controleur_id = profiel.id
    )
  )

group by
  profiel.id,
  profiel.volledige_naam,
  profiel.email;

grant select
on public.controleur_planning_samenvatting
to authenticated;
