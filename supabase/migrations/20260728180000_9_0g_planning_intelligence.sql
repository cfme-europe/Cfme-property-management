-- CFME Control 9.0G
-- Planning Intelligence
-- Rayon -> woning -> controlefrequentie -> laatste controle
-- -> volgende controledatum -> achterstand -> werkvoorraad.

-- =========================================================
-- 1. GENORMALISEERDE CONTROLEHISTORIE
-- =========================================================
-- De bestaande controlesessies blijven de bron van waarheid.
-- JSON-normalisatie voorkomt duplicatie van het bestaande model
-- en ondersteunt de bestaande benamingen binnen de sessietabel.

create or replace view public.planning_controlehistorie
with (security_invoker = true)
as
select
  nullif(to_jsonb(sessie) ->> 'woning_id', '')::bigint
    as woning_id,

  coalesce(
    nullif(to_jsonb(sessie) ->> 'controleur_id', '')::uuid,
    nullif(to_jsonb(sessie) ->> 'uitgevoerd_door', '')::uuid,
    nullif(to_jsonb(sessie) ->> 'aangemaakt_door', '')::uuid
  ) as controleur_id,

  coalesce(
    nullif(
      to_jsonb(sessie) ->> 'afgerond_op',
      ''
    )::timestamptz,
    nullif(
      to_jsonb(sessie) ->> 'voltooid_op',
      ''
    )::timestamptz,
    nullif(
      to_jsonb(sessie) ->> 'eindtijd',
      ''
    )::timestamptz,
    nullif(
      to_jsonb(sessie) ->> 'gestart_op',
      ''
    )::timestamptz,
    nullif(
      to_jsonb(sessie) ->> 'starttijd',
      ''
    )::timestamptz,
    nullif(
      to_jsonb(sessie) ->> 'created_at',
      ''
    )::timestamptz
  ) as controlemoment,

  lower(
    coalesce(
      nullif(to_jsonb(sessie) ->> 'status', ''),
      'onbekend'
    )
  ) as status

from public.controlesessies sessie
where nullif(
  to_jsonb(sessie) ->> 'woning_id',
  ''
) is not null;


-- =========================================================
-- 2. PLANNING INTELLIGENCE PER WONING
-- =========================================================

create or replace view public.woning_planning_intelligence
with (security_invoker = true)
as
with laatste_controle as (
  select distinct on (historie.woning_id)
    historie.woning_id,
    historie.controleur_id,
    historie.controlemoment
  from public.planning_controlehistorie historie
  where historie.controlemoment is not null
    and historie.status not in (
      'concept',
      'geannuleerd',
      'annulering',
      'open'
    )
  order by
    historie.woning_id,
    historie.controlemoment desc
),
actieve_toewijzing as (
  select
    toewijzing.id as toewijzing_id,
    toewijzing.woning_id,
    toewijzing.rayon_id,
    rayon.naam as rayon_naam,
    rayon.code as rayon_code,

    coalesce(
      toewijzing.standaard_controleur_id,
      rayon.standaard_controleur_id
    ) as controleur_id,

    coalesce(
      toewijzing.controlefrequentie_dagen,
      rayon.standaard_controlefrequentie_dagen
    ) as controlefrequentie_dagen,

    toewijzing.geldig_vanaf

  from public.woning_rayon_toewijzingen toewijzing
  join public.rayons rayon
    on rayon.id = toewijzing.rayon_id
  where toewijzing.actief = true
    and toewijzing.geldig_tot is null
    and rayon.actief = true
)
select
  woning.id as woning_id,
  woning.adres,
  woning.postcode,
  woning.plaats,

  planning.toewijzing_id,
  planning.rayon_id,
  planning.rayon_naam,
  planning.rayon_code,

  planning.controleur_id,
  profiel.volledige_naam as controleur_naam,
  profiel.email as controleur_email,

  planning.controlefrequentie_dagen,
  planning.geldig_vanaf,

  laatste.controlemoment::date
    as laatste_controle_op,

  case
    when planning.toewijzing_id is null
      then null

    when laatste.controlemoment is null
      then planning.geldig_vanaf

    else
      laatste.controlemoment::date
      + planning.controlefrequentie_dagen
  end as volgende_controle_op,

  case
    when planning.toewijzing_id is null
      then null

    when laatste.controlemoment is null
      then planning.geldig_vanaf - current_date

    else
      (
        laatste.controlemoment::date
        + planning.controlefrequentie_dagen
      ) - current_date
  end as dagen_tot_controle,

  case
    when planning.toewijzing_id is null
      then 'niet_ingepland'

    when planning.controleur_id is null
      then 'geen_controleur'

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) < current_date
      then 'achterstallig'

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) = current_date
      then 'vandaag'

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) <= current_date + 7
      then 'binnen_7_dagen'

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) <= current_date + 14
      then 'binnen_14_dagen'

    else 'op_schema'
  end as planning_status,

  case
    when planning.toewijzing_id is null
      then 1

    when planning.controleur_id is null
      then 2

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) < current_date
      then 3

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) = current_date
      then 4

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) <= current_date + 7
      then 5

    when (
      case
        when laatste.controlemoment is null
          then planning.geldig_vanaf
        else
          laatste.controlemoment::date
          + planning.controlefrequentie_dagen
      end
    ) <= current_date + 14
      then 6

    else 7
  end as planning_prioriteit

from public.woningen woning
left join actieve_toewijzing planning
  on planning.woning_id = woning.id
left join laatste_controle laatste
  on laatste.woning_id = woning.id
left join public.profiles profiel
  on profiel.id = planning.controleur_id;


-- =========================================================
-- 3. RAYONBELASTING
-- =========================================================

create or replace view public.rayon_planning_samenvatting
with (security_invoker = true)
as
select
  rayon.id as rayon_id,
  rayon.naam as rayon_naam,
  rayon.code as rayon_code,
  rayon.standaard_controleur_id,

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
    where planning.planning_status = 'geen_controleur'
  )::integer as zonder_controleur,

  count(*) filter (
    where planning.planning_status in (
      'achterstallig',
      'vandaag',
      'binnen_7_dagen'
    )
  )::integer as werkvoorraad_7_dagen

from public.rayons rayon
left join public.woning_planning_intelligence planning
  on planning.rayon_id = rayon.id
where rayon.actief = true
group by
  rayon.id,
  rayon.naam,
  rayon.code,
  rayon.standaard_controleur_id;


-- =========================================================
-- 4. CONTROLEURBELASTING
-- =========================================================

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
  and profiel.rol in (
    'admin',
    'management',
    'planner',
    'controleur'
  )
group by
  profiel.id,
  profiel.volledige_naam,
  profiel.email;


-- =========================================================
-- 5. MANAGEMENTSAMENVATTING
-- =========================================================

create or replace view public.planning_intelligence_samenvatting
with (security_invoker = true)
as
select
  count(*)::integer as aantal_woningen,

  count(*) filter (
    where planning_status = 'niet_ingepland'
  )::integer as niet_ingepland,

  count(*) filter (
    where planning_status = 'geen_controleur'
  )::integer as zonder_controleur,

  count(*) filter (
    where planning_status = 'achterstallig'
  )::integer as achterstallig,

  count(*) filter (
    where planning_status = 'vandaag'
  )::integer as vandaag,

  count(*) filter (
    where planning_status = 'binnen_7_dagen'
  )::integer as binnen_7_dagen,

  count(*) filter (
    where planning_status = 'binnen_14_dagen'
  )::integer as binnen_14_dagen,

  count(*) filter (
    where planning_status = 'op_schema'
  )::integer as op_schema

from public.woning_planning_intelligence;


-- =========================================================
-- 6. INDEXEN
-- =========================================================

create index if not exists
  controlesessies_woning_planning_idx
on public.controlesessies(woning_id);

create index if not exists
  woning_rayon_actieve_planning_idx
on public.woning_rayon_toewijzingen(
  woning_id,
  actief,
  geldig_tot
);


-- =========================================================
-- 7. RECHTEN
-- =========================================================

grant select
on public.planning_controlehistorie
to authenticated;

grant select
on public.woning_planning_intelligence
to authenticated;

grant select
on public.rayon_planning_samenvatting
to authenticated;

grant select
on public.controleur_planning_samenvatting
to authenticated;

grant select
on public.planning_intelligence_samenvatting
to authenticated;
