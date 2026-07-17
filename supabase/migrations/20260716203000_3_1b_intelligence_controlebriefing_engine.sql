create or replace function public.genereer_controlebriefing(
  p_woning_id bigint,
  p_controlesessie_id bigint default null,
  p_peildatum date default current_date
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_snapshot public.woning_dna_snapshots%rowtype;
  v_briefing_id bigint;
  v_samenvatting text;
  v_advies text;
  v_bronnen jsonb;
  v_kenmerken jsonb;
  v_prioriteit text;
  v_punt text;
  v_trend record;
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

  select *
  into v_snapshot
  from public.woning_dna_snapshots
  where woning_id = p_woning_id
    and peildatum <= p_peildatum
  order by peildatum desc, berekend_at desc
  limit 1;

  if v_snapshot.id is null then
    v_samenvatting :=
      'Er is nog onvoldoende historische informatie beschikbaar '
      || 'voor een volledige controlebriefing.';

    v_advies :=
      'Voer de controle feitelijk uit en registreer inspecties, '
      || 'meldingen, taken en controletijd volledig.';

    v_prioriteit := 'normaal';
  else
    v_samenvatting := format(
      'Woning-DNA risiconiveau %s met score %s. '
      || '%s open meldingen, waarvan %s met hoge prioriteit of spoed. '
      || '%s open taken, waarvan %s over de deadline.',
      v_snapshot.risiconiveau,
      v_snapshot.risicoscore,
      v_snapshot.meldingen_open,
      v_snapshot.meldingen_hoog_spoed,
      v_snapshot.taken_open,
      v_snapshot.taken_over_deadline
    );

    v_advies :=
      case v_snapshot.risiconiveau
        when 'kritiek' then
          'Behandel de controle als urgente risicocontrole. '
          || 'Controleer eerst veiligheid, schade en achterstallige opvolging.'
        when 'hoog' then
          'Begin met de bekende aandachtspunten en controleer '
          || 'of open meldingen en taken aantoonbaar worden opgevolgd.'
        when 'middel' then
          'Controleer de bekende afwijkingen gericht en leg '
          || 'veranderingen ten opzichte van eerdere controles vast.'
        else
          'Voer de reguliere controle uit en bevestig of '
          || 'de stabiele situatie ongewijzigd is.'
      end;

    v_prioriteit :=
      case v_snapshot.risiconiveau
        when 'kritiek' then 'spoed'
        when 'hoog' then 'hoog'
        when 'middel' then 'normaal'
        else 'laag'
      end;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'type', 'trend',
        'id', trend.id,
        'trend_type', trend.trend_type,
        'ernst', trend.ernst
      )
      order by trend.ernst desc, trend.trend_type
    ),
    '[]'::jsonb
  )
  into v_bronnen
  from (
    select distinct on (trend_type)
      id,
      trend_type,
      ernst,
      periode_tot
    from public.intelligence_trends
    where woning_id = p_woning_id
      and periode_tot <= p_peildatum
    order by trend_type, periode_tot desc, berekend_at desc
  ) trend;

  if v_snapshot.id is not null then
    v_bronnen :=
      jsonb_build_array(
        jsonb_build_object(
          'type', 'woning_dna_snapshot',
          'id', v_snapshot.id,
          'peildatum', v_snapshot.peildatum
        )
      ) || v_bronnen;
  end if;

  v_kenmerken := jsonb_build_object(
    'intern', true,
    'interpretatie', true,
    'gegenereerd_door', 'controlebriefing_engine',
    'snapshot_beschikbaar', v_snapshot.id is not null
  );

  update public.controlebriefings
  set
    status = 'vervangen',
    updated_at = now()
  where woning_id = p_woning_id
    and status = 'actief'
    and (
      controlesessie_id is distinct from p_controlesessie_id
      or peildatum is distinct from p_peildatum
    );

  select id
  into v_briefing_id
  from public.controlebriefings
  where woning_id = p_woning_id
    and controlesessie_id is not distinct from p_controlesessie_id
    and peildatum = p_peildatum
  limit 1;

  if v_briefing_id is null then
    insert into public.controlebriefings (
      woning_id,
      controlesessie_id,
      peildatum,
      geldig_tot,
      status,
      risicoscore,
      risiconiveau,
      samenvatting,
      advies,
      bronnen,
      kenmerken,
      gegenereerd_at
    )
    values (
      p_woning_id,
      p_controlesessie_id,
      p_peildatum,
      p_peildatum + 30,
      'actief',
      coalesce(v_snapshot.risicoscore, 0),
      coalesce(v_snapshot.risiconiveau, 'laag'),
      v_samenvatting,
      v_advies,
      v_bronnen,
      v_kenmerken,
      now()
    )
    returning id into v_briefing_id;
  else
    update public.controlebriefings
    set
      geldig_tot = p_peildatum + 30,
      status = 'actief',
      risicoscore = coalesce(v_snapshot.risicoscore, 0),
      risiconiveau = coalesce(v_snapshot.risiconiveau, 'laag'),
      samenvatting = v_samenvatting,
      advies = v_advies,
      bronnen = v_bronnen,
      kenmerken = v_kenmerken,
      gegenereerd_at = now(),
      updated_at = now()
    where id = v_briefing_id;
  end if;

  update public.intelligence_werkpunten
  set
    status = 'vervallen',
    updated_at = now()
  where woning_id = p_woning_id
    and controlebriefing_id is not null
    and status in ('concept', 'actief');

  if v_snapshot.id is not null then
    for v_punt in
      select jsonb_array_elements_text(
        to_jsonb(v_snapshot.aandachtspunten)
      )
    loop
      insert into public.intelligence_werkpunten (
        woning_id,
        controlebriefing_id,
        controlesessie_id,
        bron_type,
        bron_id,
        categorie,
        prioriteit,
        status,
        titel,
        omschrijving,
        waarschijnlijkheid,
        deduplicatie_sleutel,
        intern,
        details,
        geactiveerd_at
      )
      values (
        p_woning_id,
        v_briefing_id,
        p_controlesessie_id,
        'woning_dna_snapshot',
        v_snapshot.id,
        'overig',
        v_prioriteit,
        'actief',
        v_punt,
        'Intern aandachtspunt uit het actuele Woning-DNA. '
        || 'Controleer dit tijdens de eerstvolgende controle.',
        null,
        format(
          'controlebriefing:%s:dna:%s',
          v_briefing_id,
          md5(v_punt)
        ),
        true,
        jsonb_build_object(
          'interpretatie', true,
          'snapshot_id', v_snapshot.id
        ),
        now()
      )
      on conflict (deduplicatie_sleutel)
      do update set
        controlebriefing_id = excluded.controlebriefing_id,
        controlesessie_id = excluded.controlesessie_id,
        prioriteit = excluded.prioriteit,
        status = 'actief',
        titel = excluded.titel,
        omschrijving = excluded.omschrijving,
        details = excluded.details,
        geactiveerd_at = now(),
        opgevolgd_at = null,
        updated_at = now();
    end loop;
  end if;

  for v_trend in
    select distinct on (trend_type)
      id,
      trend_type,
      richting,
      ernst,
      meetwaarde,
      referentiewaarde,
      afwijking_percentage,
      toelichting
    from public.intelligence_trends
    where woning_id = p_woning_id
      and periode_tot <= p_peildatum
      and ernst in ('aandacht', 'hoog', 'kritiek')
    order by trend_type, periode_tot desc, berekend_at desc
  loop
    insert into public.intelligence_werkpunten (
      woning_id,
      controlebriefing_id,
      controlesessie_id,
      bron_type,
      bron_id,
      categorie,
      prioriteit,
      status,
      titel,
      omschrijving,
      waarschijnlijkheid,
      deduplicatie_sleutel,
      intern,
      details,
      geactiveerd_at
    )
    values (
      p_woning_id,
      v_briefing_id,
      p_controlesessie_id,
      'intelligence_trend',
      v_trend.id,
      case v_trend.trend_type
        when 'inspectiekwaliteit' then 'inspectie'
        when 'schade' then 'schade'
        when 'meldingen' then 'meldingen'
        when 'taken' then 'taken'
        when 'controletijd' then 'controletijd'
        when 'orde_netheid' then 'orde_netheid'
        else 'overig'
      end,
      case v_trend.ernst
        when 'kritiek' then 'spoed'
        when 'hoog' then 'hoog'
        else 'normaal'
      end,
      'actief',
      format(
        'Trend controleren: %s',
        replace(v_trend.trend_type, '_', ' ')
      ),
      coalesce(
        v_trend.toelichting,
        'Controleer de vastgestelde trend tijdens de controle.'
      ),
      null,
      format(
        'controlebriefing:%s:trend:%s',
        v_briefing_id,
        v_trend.id
      ),
      true,
      jsonb_build_object(
        'interpretatie', true,
        'richting', v_trend.richting,
        'ernst', v_trend.ernst,
        'meetwaarde', v_trend.meetwaarde,
        'referentiewaarde', v_trend.referentiewaarde,
        'afwijking_percentage', v_trend.afwijking_percentage
      ),
      now()
    )
    on conflict (deduplicatie_sleutel)
    do update set
      controlebriefing_id = excluded.controlebriefing_id,
      controlesessie_id = excluded.controlesessie_id,
      categorie = excluded.categorie,
      prioriteit = excluded.prioriteit,
      status = 'actief',
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      details = excluded.details,
      geactiveerd_at = now(),
      opgevolgd_at = null,
      updated_at = now();
  end loop;

  return v_briefing_id;
end;
$$;

revoke all
on function public.genereer_controlebriefing(
  bigint,
  bigint,
  date
)
from public;

grant execute
on function public.genereer_controlebriefing(
  bigint,
  bigint,
  date
)
to authenticated;
