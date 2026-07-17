create or replace function public.genereer_intelligence_pakket(
  p_woning_id bigint,
  p_controlesessie_id bigint default null,
  p_peildatum date default current_date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operationele_trends integer;
  v_energie_bezetting_trends integer;
  v_snapshot_id bigint;
  v_briefing_id bigint;
begin
  if not exists (
    select 1
    from public.woningen
    where id = p_woning_id
  ) then
    raise exception
      'Woning % niet gevonden.',
      p_woning_id;
  end if;

  if p_controlesessie_id is not null
    and not exists (
      select 1
      from public.controlesessies
      where id = p_controlesessie_id
        and woning_id = p_woning_id
    )
  then
    raise exception
      'Controlesessie % hoort niet bij woning %.',
      p_controlesessie_id,
      p_woning_id;
  end if;

  v_operationele_trends :=
    public.bereken_intelligence_trends(
      p_woning_id,
      p_peildatum
    );

  v_energie_bezetting_trends :=
    public.bereken_energie_bezetting_trends(
      p_woning_id,
      p_peildatum
    );

  v_snapshot_id :=
    public.bereken_woning_dna(
      p_woning_id,
      p_peildatum
    );

  update public.woning_dna_snapshots snapshot
  set
    kenmerken =
      coalesce(snapshot.kenmerken, '{}'::jsonb)
      || jsonb_build_object(
        'feitelijke_bronnen',
        jsonb_build_array(
          'inspecties',
          'meldingen',
          'taken',
          'controlesessies',
          'meterstanden',
          'energieverbruik',
          'bezetting'
        ),
        'energie_bezetting_signalen',
        (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', trend.id,
                'trend_type', trend.trend_type,
                'richting', trend.richting,
                'ernst', trend.ernst,
                'meetwaarde', trend.meetwaarde,
                'referentiewaarde',
                  trend.referentiewaarde,
                'afwijking_percentage',
                  trend.afwijking_percentage,
                'bron_aantal', trend.bron_aantal,
                'details', trend.details
              )
              order by trend.trend_type
            ),
            '[]'::jsonb
          )
          from (
            select distinct on (trend_type)
              id,
              trend_type,
              richting,
              ernst,
              meetwaarde,
              referentiewaarde,
              afwijking_percentage,
              bron_aantal,
              details,
              periode_tot,
              berekend_at
            from public.intelligence_trends
            where woning_id = p_woning_id
              and periode_tot <= p_peildatum
              and trend_type in (
                'energie_elektriciteit',
                'energie_gas',
                'energie_water',
                'bezetting'
              )
            order by
              trend_type,
              periode_tot desc,
              berekend_at desc
          ) trend
        )
      ),
    sterke_punten =
      coalesce(snapshot.sterke_punten, '[]'::jsonb)
      ||
      case
        when exists (
          select 1
          from (
            select distinct on (trend_type)
              trend_type,
              richting,
              ernst,
              meetwaarde,
              periode_tot,
              berekend_at
            from public.intelligence_trends
            where woning_id = p_woning_id
              and periode_tot <= p_peildatum
              and trend_type in (
                'energie_elektriciteit',
                'energie_gas',
                'energie_water',
                'bezetting'
              )
            order by
              trend_type,
              periode_tot desc,
              berekend_at desc
          ) trend
          where trend.ernst = 'informatie'
            and trend.richting = 'stabiel'
            and trend.meetwaarde is not null
        )
        then jsonb_build_array(
          'Energieverbruik en bezetting tonen een stabiel beeld.'
        )
        else '[]'::jsonb
      end,
    aandachtspunten =
      coalesce(snapshot.aandachtspunten, '[]'::jsonb)
      ||
      coalesce(
        (
          select jsonb_agg(
            case trend.trend_type
              when 'energie_elektriciteit' then
                format(
                  'Elektriciteitsverbruik wijkt %s%% af van eerdere perioden.',
                  coalesce(
                    trend.afwijking_percentage::text,
                    'onbekend'
                  )
                )
              when 'energie_gas' then
                format(
                  'Gasverbruik wijkt %s%% af van eerdere perioden.',
                  coalesce(
                    trend.afwijking_percentage::text,
                    'onbekend'
                  )
                )
              when 'energie_water' then
                format(
                  'Waterverbruik wijkt %s%% af van eerdere perioden.',
                  coalesce(
                    trend.afwijking_percentage::text,
                    'onbekend'
                  )
                )
              when 'bezetting' then
                format(
                  'De geregistreerde bezetting wijkt %s%% af van eerdere perioden.',
                  coalesce(
                    trend.afwijking_percentage::text,
                    'onbekend'
                  )
                )
            end
            order by trend.trend_type
          )
          from (
            select distinct on (trend_type)
              trend_type,
              ernst,
              afwijking_percentage,
              periode_tot,
              berekend_at
            from public.intelligence_trends
            where woning_id = p_woning_id
              and periode_tot <= p_peildatum
              and trend_type in (
                'energie_elektriciteit',
                'energie_gas',
                'energie_water',
                'bezetting'
              )
            order by
              trend_type,
              periode_tot desc,
              berekend_at desc
          ) trend
          where trend.ernst in (
            'aandacht',
            'hoog',
            'kritiek'
          )
        ),
        '[]'::jsonb
      )
  where snapshot.id = v_snapshot_id;

  v_briefing_id :=
    public.genereer_controlebriefing(
      p_woning_id,
      p_controlesessie_id,
      p_peildatum
    );

  update public.controlebriefings briefing
  set
    samenvatting =
      briefing.samenvatting
      ||
      case
        when exists (
          select 1
          from public.intelligence_trends trend
          where trend.woning_id = p_woning_id
            and trend.periode_tot <= p_peildatum
            and trend.trend_type in (
              'energie_elektriciteit',
              'energie_gas',
              'energie_water',
              'bezetting'
            )
            and trend.meetwaarde is not null
        )
        then
          ' Energie- en bezettingssignalen zijn meegenomen.'
        else
          ' Voor energie en bezetting zijn nog onvoldoende gegevens beschikbaar.'
      end,
    advies =
      coalesce(briefing.advies, '')
      ||
      case
        when exists (
          select 1
          from (
            select distinct on (trend_type)
              trend_type,
              ernst,
              periode_tot,
              berekend_at
            from public.intelligence_trends
            where woning_id = p_woning_id
              and periode_tot <= p_peildatum
              and trend_type in (
                'energie_elektriciteit',
                'energie_gas',
                'energie_water',
                'bezetting'
              )
            order by
              trend_type,
              periode_tot desc,
              berekend_at desc
          ) trend
          where trend.ernst in (
            'aandacht',
            'hoog',
            'kritiek'
          )
        )
        then
          ' Controleer afwijkende meterstanden, verbruik en bewonersbezetting gericht.'
        else
          ''
      end,
    kenmerken =
      coalesce(briefing.kenmerken, '{}'::jsonb)
      || jsonb_build_object(
        'energie_bezetting_meegenomen',
        true,
        'intelligence_pakket',
        true
      ),
    updated_at = now()
  where briefing.id = v_briefing_id;

  return jsonb_build_object(
    'woning_id', p_woning_id,
    'peildatum', p_peildatum,
    'operationele_trends',
      coalesce(v_operationele_trends, 0),
    'energie_bezetting_trends',
      coalesce(v_energie_bezetting_trends, 0),
    'snapshot_id', v_snapshot_id,
    'controlebriefing_id', v_briefing_id
  );
end;
$$;

revoke all
on function public.genereer_intelligence_pakket(
  bigint,
  bigint,
  date
)
from public;

grant execute
on function public.genereer_intelligence_pakket(
  bigint,
  bigint,
  date
)
to authenticated;
