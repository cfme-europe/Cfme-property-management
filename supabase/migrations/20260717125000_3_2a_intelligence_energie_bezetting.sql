alter table public.intelligence_trends
  drop constraint if exists intelligence_trends_trend_type_check;

alter table public.intelligence_trends
  add constraint intelligence_trends_trend_type_check
  check (
    trend_type in (
      'inspectiekwaliteit',
      'orde_netheid',
      'schade',
      'meldingen',
      'taken',
      'controletijd',
      'energie_elektriciteit',
      'energie_gas',
      'energie_water',
      'bezetting'
    )
  );

create or replace function public.bereken_energie_bezetting_trends(
  p_woning_id bigint,
  p_peildatum date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_aantal integer := 0;
  v_toegevoegd integer := 0;
begin
  if not exists (
    select 1
    from public.woningen
    where id = p_woning_id
  ) then
    raise exception 'Woning % niet gevonden.', p_woning_id;
  end if;

  with opeenvolgende_metingen as (
    select
      m.woning_id,
      lag(m.opnamedatum) over (
        partition by m.woning_id
        order by m.opnamedatum
      ) as vorige_datum,
      m.opnamedatum as huidige_datum,

      lag(m.elektriciteit_kwh) over (
        partition by m.woning_id
        order by m.opnamedatum
      ) as vorige_elektriciteit,
      m.elektriciteit_kwh as huidige_elektriciteit,

      lag(m.gas_m3) over (
        partition by m.woning_id
        order by m.opnamedatum
      ) as vorige_gas,
      m.gas_m3 as huidige_gas,

      lag(m.water_m3) over (
        partition by m.woning_id
        order by m.opnamedatum
      ) as vorige_water,
      m.water_m3 as huidige_water,

      lag(m.bewoners_aantal) over (
        partition by m.woning_id
        order by m.opnamedatum
      ) as vorige_bewoners,
      m.bewoners_aantal as huidige_bewoners
    from public.meterstanden m
    where m.woning_id = p_woning_id
      and m.opnamedatum <= p_peildatum
  ),
  verbruiksperiodes as (
    select
      woning_id,
      vorige_datum,
      huidige_datum,
      greatest(
        huidige_datum - vorige_datum,
        0
      )::numeric / 7 as aantal_weken,
      (
        coalesce(vorige_bewoners, 0) +
        coalesce(huidige_bewoners, 0)
      )::numeric / 2 as gemiddelde_bewoners,

      case
        when vorige_elektriciteit is null
          or huidige_elektriciteit is null
          or huidige_elektriciteit < vorige_elektriciteit
        then null
        else huidige_elektriciteit - vorige_elektriciteit
      end as elektriciteit_totaal,

      case
        when vorige_gas is null
          or huidige_gas is null
          or huidige_gas < vorige_gas
        then null
        else huidige_gas - vorige_gas
      end as gas_totaal,

      case
        when vorige_water is null
          or huidige_water is null
          or huidige_water < vorige_water
        then null
        else huidige_water - vorige_water
      end as water_totaal
    from opeenvolgende_metingen
    where vorige_datum is not null
      and huidige_datum > vorige_datum
  ),
  genormaliseerd as (
    select
      *,
      case
        when aantal_weken <= 0
          or gemiddelde_bewoners <= 0
          or elektriciteit_totaal is null
        then null
        else elektriciteit_totaal
          / aantal_weken
          / gemiddelde_bewoners
      end as elektriciteit_per_bewoner_per_week,

      case
        when aantal_weken <= 0
          or gemiddelde_bewoners <= 0
          or gas_totaal is null
        then null
        else gas_totaal
          / aantal_weken
          / gemiddelde_bewoners
      end as gas_per_bewoner_per_week,

      case
        when aantal_weken <= 0
          or gemiddelde_bewoners <= 0
          or water_totaal is null
        then null
        else water_totaal
          / aantal_weken
          / gemiddelde_bewoners
      end as water_per_bewoner_per_week
    from verbruiksperiodes
  ),
  laatste_periodes as (
    select *
    from genormaliseerd
    order by huidige_datum desc
    limit 7
  ),
  samengevat as (
    select
      max(huidige_datum) as periode_tot,
      min(vorige_datum) as periode_van,

      (
        array_agg(
          elektriciteit_per_bewoner_per_week
          order by huidige_datum desc
        )
      )[1] as laatste_elektriciteit,
      avg(elektriciteit_per_bewoner_per_week)
        filter (
          where huidige_datum < (
            select max(huidige_datum)
            from laatste_periodes
          )
        ) as referentie_elektriciteit,
      count(elektriciteit_per_bewoner_per_week)::integer
        as bron_elektriciteit,

      (
        array_agg(
          gas_per_bewoner_per_week
          order by huidige_datum desc
        )
      )[1] as laatste_gas,
      avg(gas_per_bewoner_per_week)
        filter (
          where huidige_datum < (
            select max(huidige_datum)
            from laatste_periodes
          )
        ) as referentie_gas,
      count(gas_per_bewoner_per_week)::integer
        as bron_gas,

      (
        array_agg(
          water_per_bewoner_per_week
          order by huidige_datum desc
        )
      )[1] as laatste_water,
      avg(water_per_bewoner_per_week)
        filter (
          where huidige_datum < (
            select max(huidige_datum)
            from laatste_periodes
          )
        ) as referentie_water,
      count(water_per_bewoner_per_week)::integer
        as bron_water
    from laatste_periodes
  ),
  energie_trends as (
    select
      'energie_elektriciteit'::text as trend_type,
      periode_van,
      periode_tot,
      laatste_elektriciteit as meetwaarde,
      referentie_elektriciteit as referentiewaarde,
      bron_elektriciteit as bron_aantal,
      'kWh per bewoner per week'::text as eenheid
    from samengevat

    union all

    select
      'energie_gas',
      periode_van,
      periode_tot,
      laatste_gas,
      referentie_gas,
      bron_gas,
      'm3 per bewoner per week'
    from samengevat

    union all

    select
      'energie_water',
      periode_van,
      periode_tot,
      laatste_water,
      referentie_water,
      bron_water,
      'm3 per bewoner per week'
    from samengevat
  ),
  energie_geclassificeerd as (
    select
      *,
      case
        when meetwaarde is null
          or referentiewaarde is null
          or referentiewaarde = 0
        then null
        else round(
          (
            (meetwaarde - referentiewaarde)
            / referentiewaarde
          ) * 100,
          2
        )
      end as afwijking_percentage
    from energie_trends
  )
  insert into public.intelligence_trends (
    woning_id,
    trend_type,
    periode_van,
    periode_tot,
    meetwaarde,
    referentiewaarde,
    afwijking_percentage,
    richting,
    ernst,
    bron_aantal,
    toelichting,
    details,
    berekend_at
  )
  select
    p_woning_id,
    trend_type,
    coalesce(periode_van, p_peildatum),
    coalesce(periode_tot, p_peildatum),
    meetwaarde,
    referentiewaarde,
    afwijking_percentage,
    case
      when meetwaarde is null
        or referentiewaarde is null
      then 'onvoldoende_data'
      when abs(coalesce(afwijking_percentage, 0)) < 10
      then 'stabiel'
      when meetwaarde > referentiewaarde
      then 'stijgend'
      else 'dalend'
    end,
    case
      when meetwaarde is null
        or referentiewaarde is null
      then 'informatie'
      when coalesce(afwijking_percentage, 0) >= 50
      then 'hoog'
      when coalesce(afwijking_percentage, 0) >= 20
      then 'aandacht'
      else 'informatie'
    end,
    bron_aantal,
    'Ontwikkeling van het energieverbruik per bewoner per week.',
    jsonb_build_object(
      'eenheid', eenheid,
      'bron', 'meterstanden',
      'interpretatie', true
    ),
    now()
  from energie_geclassificeerd
  on conflict (
    woning_id,
    trend_type,
    periode_van,
    periode_tot
  )
  do update set
    meetwaarde = excluded.meetwaarde,
    referentiewaarde = excluded.referentiewaarde,
    afwijking_percentage =
      excluded.afwijking_percentage,
    richting = excluded.richting,
    ernst = excluded.ernst,
    bron_aantal = excluded.bron_aantal,
    toelichting = excluded.toelichting,
    details = excluded.details,
    berekend_at = now();

  get diagnostics v_aantal = row_count;

  insert into public.intelligence_trends (
    woning_id,
    trend_type,
    periode_van,
    periode_tot,
    meetwaarde,
    referentiewaarde,
    afwijking_percentage,
    richting,
    ernst,
    bron_aantal,
    toelichting,
    details,
    berekend_at
  )
  select
    p_woning_id,
    'bezetting',
    coalesce(min(opnamedatum), p_peildatum),
    coalesce(max(opnamedatum), p_peildatum),
    (
      array_agg(
        bewoners_aantal::numeric
        order by opnamedatum desc
      )
    )[1],
    avg(bewoners_aantal::numeric)
      filter (
        where opnamedatum < (
          select max(opnamedatum)
          from public.meterstanden
          where woning_id = p_woning_id
            and opnamedatum <= p_peildatum
        )
      ),
    case
      when avg(bewoners_aantal::numeric)
        filter (
          where opnamedatum < (
            select max(opnamedatum)
            from public.meterstanden
            where woning_id = p_woning_id
              and opnamedatum <= p_peildatum
          )
        ) is null
        or avg(bewoners_aantal::numeric)
          filter (
            where opnamedatum < (
              select max(opnamedatum)
              from public.meterstanden
              where woning_id = p_woning_id
                and opnamedatum <= p_peildatum
            )
          ) = 0
      then null
      else round(
        (
          (
            (
              array_agg(
                bewoners_aantal::numeric
                order by opnamedatum desc
              )
            )[1]
            -
            avg(bewoners_aantal::numeric)
              filter (
                where opnamedatum < (
                  select max(opnamedatum)
                  from public.meterstanden
                  where woning_id = p_woning_id
                    and opnamedatum <= p_peildatum
                )
              )
          )
          /
          avg(bewoners_aantal::numeric)
            filter (
              where opnamedatum < (
                select max(opnamedatum)
                from public.meterstanden
                where woning_id = p_woning_id
                  and opnamedatum <= p_peildatum
              )
            )
        ) * 100,
        2
      )
    end,
    case
      when count(*) < 2 then 'onvoldoende_data'
      when abs(
        coalesce(
          (
            (
              (
                array_agg(
                  bewoners_aantal::numeric
                  order by opnamedatum desc
                )
              )[1]
              -
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                )
            )
            /
            nullif(
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                ),
              0
            )
          ) * 100,
          0
        )
      ) < 10
      then 'stabiel'
      when (
        array_agg(
          bewoners_aantal::numeric
          order by opnamedatum desc
        )
      )[1]
      >
      avg(bewoners_aantal::numeric)
        filter (
          where opnamedatum < (
            select max(opnamedatum)
            from public.meterstanden
            where woning_id = p_woning_id
              and opnamedatum <= p_peildatum
          )
        )
      then 'stijgend'
      else 'dalend'
    end,
    case
      when count(*) < 2 then 'informatie'
      when abs(
        coalesce(
          (
            (
              (
                array_agg(
                  bewoners_aantal::numeric
                  order by opnamedatum desc
                )
              )[1]
              -
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                )
            )
            /
            nullif(
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                ),
              0
            )
          ) * 100,
          0
        )
      ) >= 50
      then 'hoog'
      when abs(
        coalesce(
          (
            (
              (
                array_agg(
                  bewoners_aantal::numeric
                  order by opnamedatum desc
                )
              )[1]
              -
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                )
            )
            /
            nullif(
              avg(bewoners_aantal::numeric)
                filter (
                  where opnamedatum < (
                    select max(opnamedatum)
                    from public.meterstanden
                    where woning_id = p_woning_id
                      and opnamedatum <= p_peildatum
                  )
                ),
              0
            )
          ) * 100,
          0
        )
      ) >= 20
      then 'aandacht'
      else 'informatie'
    end,
    count(*)::integer,
    'Ontwikkeling van het geregistreerde bewonersaantal.',
    jsonb_build_object(
      'eenheid', 'bewoners',
      'bron', 'meterstanden.bewoners_aantal',
      'interpretatie', true
    ),
    now()
  from public.meterstanden
  where woning_id = p_woning_id
    and opnamedatum <= p_peildatum
  on conflict (
    woning_id,
    trend_type,
    periode_van,
    periode_tot
  )
  do update set
    meetwaarde = excluded.meetwaarde,
    referentiewaarde = excluded.referentiewaarde,
    afwijking_percentage =
      excluded.afwijking_percentage,
    richting = excluded.richting,
    ernst = excluded.ernst,
    bron_aantal = excluded.bron_aantal,
    toelichting = excluded.toelichting,
    details = excluded.details,
    berekend_at = now();

  get diagnostics v_toegevoegd = row_count;
  v_aantal := v_aantal + v_toegevoegd;

  return v_aantal;
end;
$$;

revoke all
on function public.bereken_energie_bezetting_trends(
  bigint,
  date
)
from public;

grant execute
on function public.bereken_energie_bezetting_trends(
  bigint,
  date
)
to authenticated;
