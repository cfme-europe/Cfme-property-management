create or replace function public.bereken_intelligence_trends(
  p_woning_id bigint,
  p_peildatum date default current_date
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_huidig_van date := p_peildatum - 89;
  v_huidig_tot date := p_peildatum;
  v_vorig_van date := p_peildatum - 179;
  v_vorig_tot date := p_peildatum - 90;

  v_huidig numeric;
  v_vorig numeric;
  v_afwijking numeric;
  v_richting text;
  v_ernst text;
  v_bron_aantal integer;
  v_aantal integer := 0;
  v_toegevoegd integer := 0;
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

  /*
   * Inspectiekwaliteit
   * Objectieve algemene toestand omgerekend naar:
   * goed = 5, aandacht_nodig = 3, slecht = 1.
   */
  select
    round(
      avg(
        case algemene_toestand
          when 'goed' then 5
          when 'aandacht_nodig' then 3
          when 'slecht' then 1
        end
      )::numeric,
      2
    ),
    count(*)::integer
  into
    v_huidig,
    v_bron_aantal
  from public.inspecties
  where woning_id = p_woning_id
    and inspectiedatum between
      v_huidig_van and v_huidig_tot;

  select
    round(
      avg(
        case algemene_toestand
          when 'goed' then 5
          when 'aandacht_nodig' then 3
          when 'slecht' then 1
        end
      )::numeric,
      2
    )
  into v_vorig
  from public.inspecties
  where woning_id = p_woning_id
    and inspectiedatum between
      v_vorig_van and v_vorig_tot;

  v_afwijking :=
    case
      when v_huidig is null
        or v_vorig is null
        or v_vorig = 0
      then null
      else round(
        ((v_huidig - v_vorig) / v_vorig) * 100,
        2
      )
    end;

  v_richting :=
    case
      when v_huidig is null or v_vorig is null
        then 'onvoldoende_data'
      when abs(coalesce(v_afwijking, 0)) < 10
        then 'stabiel'
      when v_huidig > v_vorig
        then 'stijgend'
      else 'dalend'
    end;

  v_ernst :=
    case
      when v_huidig is null then 'informatie'
      when v_huidig < 2 then 'kritiek'
      when v_huidig < 3 then 'hoog'
      when v_richting = 'dalend'
        and coalesce(v_afwijking, 0) <= -20
      then 'aandacht'
      else 'informatie'
    end;

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
  values (
    p_woning_id,
    'inspectiekwaliteit',
    v_huidig_van,
    v_huidig_tot,
    v_huidig,
    v_vorig,
    v_afwijking,
    v_richting,
    v_ernst,
    v_bron_aantal,
    'Ontwikkeling van de algemene woningtoestand.',
    jsonb_build_object(
      'referentieperiode_van', v_vorig_van,
      'referentieperiode_tot', v_vorig_tot,
      'schaal', '1-5',
      'bron', 'inspecties.algemene_toestand',
      'interpretatie', true
    ),
    now()
  )
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

  v_aantal := v_aantal + 1;

  /*
   * Overige trends worden via één gegevensset opgebouwd.
   */
  with trend_bronnen as (
    select
      'orde_netheid'::text as trend_type,
      (
        select round(avg(orde_netheid_score)::numeric, 2)
        from public.inspecties
        where woning_id = p_woning_id
          and inspectiedatum between
            v_huidig_van and v_huidig_tot
      ) as huidig,
      (
        select round(avg(orde_netheid_score)::numeric, 2)
        from public.inspecties
        where woning_id = p_woning_id
          and inspectiedatum between
            v_vorig_van and v_vorig_tot
      ) as vorig,
      (
        select count(*)::integer
        from public.inspecties
        where woning_id = p_woning_id
          and inspectiedatum between
            v_huidig_van and v_huidig_tot
      ) as bron_aantal,
      false as stijging_is_risico,
      'Gemiddelde score voor orde en netheid.'::text
        as toelichting,
      'inspecties.orde_netheid_score'::text as bron,
      '1-5'::text as eenheid

    union all

    select
      'schade',
      (
        select count(*)::numeric
        from public.inspecties
        where woning_id = p_woning_id
          and schade_aanwezig = true
          and inspectiedatum between
            v_huidig_van and v_huidig_tot
      ),
      (
        select count(*)::numeric
        from public.inspecties
        where woning_id = p_woning_id
          and schade_aanwezig = true
          and inspectiedatum between
            v_vorig_van and v_vorig_tot
      ),
      (
        select count(*)::integer
        from public.inspecties
        where woning_id = p_woning_id
          and inspectiedatum between
            v_huidig_van and v_huidig_tot
      ),
      true,
      'Aantal inspecties waarbij schade is vastgesteld.',
      'inspecties.schade_aanwezig',
      'aantal'

    union all

    select
      'meldingen',
      (
        select count(*)::numeric
        from public.meldingen
        where woning_id = p_woning_id
          and melddatum between
            v_huidig_van and v_huidig_tot
      ),
      (
        select count(*)::numeric
        from public.meldingen
        where woning_id = p_woning_id
          and melddatum between
            v_vorig_van and v_vorig_tot
      ),
      (
        select count(*)::integer
        from public.meldingen
        where woning_id = p_woning_id
          and melddatum between
            v_huidig_van and v_huidig_tot
      ),
      true,
      'Aantal nieuw geregistreerde meldingen.',
      'meldingen.melddatum',
      'aantal'

    union all

    select
      'taken',
      (
        select count(*)::numeric
        from public.taken
        where woning_id = p_woning_id
          and created_at::date between
            v_huidig_van and v_huidig_tot
      ),
      (
        select count(*)::numeric
        from public.taken
        where woning_id = p_woning_id
          and created_at::date between
            v_vorig_van and v_vorig_tot
      ),
      (
        select count(*)::integer
        from public.taken
        where woning_id = p_woning_id
          and created_at::date between
            v_huidig_van and v_huidig_tot
      ),
      true,
      'Aantal nieuw geregistreerde taken.',
      'taken.created_at',
      'aantal'

    union all

    select
      'controletijd',
      (
        select round(
          avg(
            extract(
              epoch from (afgerond_at - gestart_at)
            ) / 60
          )::numeric,
          2
        )
        from public.controlesessies
        where woning_id = p_woning_id
          and status = 'afgerond'
          and gestart_at is not null
          and afgerond_at is not null
          and afgerond_at::date between
            v_huidig_van and v_huidig_tot
      ),
      (
        select round(
          avg(
            extract(
              epoch from (afgerond_at - gestart_at)
            ) / 60
          )::numeric,
          2
        )
        from public.controlesessies
        where woning_id = p_woning_id
          and status = 'afgerond'
          and gestart_at is not null
          and afgerond_at is not null
          and afgerond_at::date between
            v_vorig_van and v_vorig_tot
      ),
      (
        select count(*)::integer
        from public.controlesessies
        where woning_id = p_woning_id
          and status = 'afgerond'
          and gestart_at is not null
          and afgerond_at is not null
          and afgerond_at::date between
            v_huidig_van and v_huidig_tot
      ),
      true,
      'Gemiddelde werkelijke controletijd.',
      'controlesessies.gestart_at/afgerond_at',
      'minuten'
  ),
  berekend as (
    select
      trend_type,
      huidig,
      vorig,
      case
        when huidig is null
          or vorig is null
          or vorig = 0
        then null
        else round(
          ((huidig - vorig) / vorig) * 100,
          2
        )
      end as afwijking,
      bron_aantal,
      stijging_is_risico,
      toelichting,
      bron,
      eenheid
    from trend_bronnen
  ),
  geclassificeerd as (
    select
      *,
      case
        when huidig is null or vorig is null
          then 'onvoldoende_data'
        when abs(coalesce(afwijking, 0)) < 10
          then 'stabiel'
        when huidig > vorig
          then 'stijgend'
        else 'dalend'
      end as richting,
      case
        when huidig is null then 'informatie'
        when stijging_is_risico
          and huidig > vorig
          and coalesce(afwijking, 0) >= 50
        then 'hoog'
        when stijging_is_risico
          and huidig > vorig
          and coalesce(afwijking, 0) >= 20
        then 'aandacht'
        when not stijging_is_risico
          and huidig < vorig
          and coalesce(afwijking, 0) <= -20
        then 'aandacht'
        else 'informatie'
      end as ernst
    from berekend
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
    v_huidig_van,
    v_huidig_tot,
    huidig,
    vorig,
    afwijking,
    richting,
    ernst,
    bron_aantal,
    toelichting,
    jsonb_build_object(
      'referentieperiode_van', v_vorig_van,
      'referentieperiode_tot', v_vorig_tot,
      'eenheid', eenheid,
      'bron', bron,
      'interpretatie', true
    ),
    now()
  from geclassificeerd
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

drop policy if exists "Intelligence trends lezen"
  on public.intelligence_trends;

create policy "Intelligence trends lezen"
on public.intelligence_trends
for select
to anon, authenticated
using (true);

grant select
on public.intelligence_trends
to anon, authenticated;

revoke all
on function public.bereken_intelligence_trends(
  bigint,
  date
)
from public;

grant execute
on function public.bereken_intelligence_trends(
  bigint,
  date
)
to authenticated;
