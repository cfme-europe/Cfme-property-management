begin;

create unique index if not exists
meldingen_energy_intelligence_referentie_uniek_idx
on public.meldingen (extern_referentienummer)
where extern_referentienummer like
  'energy_intelligence:%';

create unique index if not exists
taken_energy_intelligence_referentie_uniek_idx
on public.taken (externe_referentie)
where externe_referentie like
  'energy_intelligence:%';

create or replace function
public.verwerk_energy_intelligence_opvolging()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_referentie text;
  v_deduplicatie text;
  v_prioriteit text;
  v_titel text;
  v_omschrijving text;
  v_categorie_melding text;
  v_categorie_taak text;
  v_inspectie_id bigint;
  v_melding_id bigint;
  v_verklaring text;
begin
  v_referentie :=
    'energy_intelligence:' || new.id::text;

  v_deduplicatie :=
    'energy_intelligence:meterstand:' ||
    new.id::text;

  select sessie.inspectie_id
  into v_inspectie_id
  from public.controlesessies sessie
  where sessie.id = new.controlesessie_id;

  v_verklaring := case new.verklaring_code
    when 'meer_bewoners_of_bezoekers'
      then 'Meer bewoners of bezoekers'
    when 'koude_periode'
      then 'Koude periode'
    when 'extra_verwarming'
      then 'Extra verwarming gebruikt'
    when 'lekkage_vermoed'
      then 'Lekkage vermoed'
    when 'installatie_defect'
      then 'Installatie of apparatuur defect'
    when 'meterstand_verkeerd'
      then 'Meterstand mogelijk verkeerd'
    when 'ander_gebruik'
      then 'Ander verklaarbaar gebruik'
    when 'geen_verklaring'
      then 'Geen verklaring vastgesteld'
    when 'overig'
      then 'Overige verklaring'
    else null
  end;

  if new.analyse_status in (
    'verhoogd',
    'kritiek',
    'onwaarschijnlijk'
  ) and new.opvolging_nodig then
    v_prioriteit := case new.analyse_status
      when 'onwaarschijnlijk' then 'hoog'
      when 'kritiek' then 'hoog'
      else 'normaal'
    end;

    v_titel := case new.analyse_status
      when 'onwaarschijnlijk'
        then 'Meterstand controleren'
      when 'kritiek'
        then 'Kritieke energieafwijking'
      else 'Verhoogd energieverbruik'
    end;

    v_omschrijving :=
      coalesce(
        nullif(
          new.analyse_resultaat
            ->> 'samenvatting',
          ''
        ),
        'De meteropname wijkt af van het normale patroon.'
      );

    if v_verklaring is not null then
      v_omschrijving :=
        v_omschrijving ||
        E'\n\nVerklaring controleur: ' ||
        v_verklaring;
    end if;

    if nullif(
      trim(
        coalesce(
          new.verklaring_toelichting,
          ''
        )
      ),
      ''
    ) is not null then
      v_omschrijving :=
        v_omschrijving ||
        E'\nToelichting: ' ||
        trim(new.verklaring_toelichting);
    end if;

    insert into public.intelligence_werkpunten (
      woning_id,
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
      new.woning_id,
      new.controlesessie_id,
      'meterstand',
      new.id,
      'administratie',
      v_prioriteit,
      'actief',
      v_titel,
      v_omschrijving,
      case new.analyse_status
        when 'onwaarschijnlijk' then 0.95
        when 'kritiek' then 0.85
        else 0.70
      end,
      v_deduplicatie,
      true,
      jsonb_build_object(
        'meterstand_id', new.id,
        'opnamedatum', new.opnamedatum,
        'analyse_status',
          new.analyse_status,
        'analyse_resultaat',
          new.analyse_resultaat,
        'verklaring_code',
          new.verklaring_code,
        'verklaring_toelichting',
          new.verklaring_toelichting,
        'opvolging_nodig',
          new.opvolging_nodig
      ),
      now()
    )
    on conflict (deduplicatie_sleutel)
    do update set
      controlesessie_id =
        excluded.controlesessie_id,
      prioriteit = excluded.prioriteit,
      status = 'actief',
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      waarschijnlijkheid =
        excluded.waarschijnlijkheid,
      details = excluded.details,
      geactiveerd_at =
        coalesce(
          public.intelligence_werkpunten
            .geactiveerd_at,
          excluded.geactiveerd_at
        ),
      opgevolgd_at = null;

    if new.analyse_status in (
      'kritiek',
      'onwaarschijnlijk'
    ) then
      v_categorie_melding :=
        case
          when new.verklaring_code =
            'lekkage_vermoed'
            then 'installatie'
          when new.verklaring_code =
            'installatie_defect'
            then 'installatie'
          else 'overig'
        end;

      v_categorie_taak :=
        case
          when new.verklaring_code in (
            'lekkage_vermoed',
            'installatie_defect'
          )
            then 'installatie'
          else 'administratie'
        end;

      insert into public.meldingen (
        woning_id,
        inspectie_id,
        titel,
        omschrijving,
        categorie,
        prioriteit,
        status,
        melddatum,
        factuur_naar,
        extern_referentienummer,
        opmerkingen
      )
      values (
        new.woning_id,
        v_inspectie_id,
        v_titel,
        v_omschrijving,
        v_categorie_melding,
        v_prioriteit,
        'open',
        current_date,
        'nog_te_bepalen',
        v_referentie,
        'Automatisch aangemaakt door Energy Intelligence.'
      )
      on conflict (extern_referentienummer)
      where extern_referentienummer like
        'energy_intelligence:%'
      do update set
        inspectie_id =
          excluded.inspectie_id,
        titel = excluded.titel,
        omschrijving =
          excluded.omschrijving,
        categorie =
          excluded.categorie,
        prioriteit =
          excluded.prioriteit,
        opmerkingen =
          excluded.opmerkingen
      returning id into v_melding_id;

      if v_melding_id is null then
        select melding.id
        into v_melding_id
        from public.meldingen melding
        where melding.extern_referentienummer =
          v_referentie;
      end if;

      insert into public.taken (
        woning_id,
        inspectie_id,
        melding_id,
        titel,
        omschrijving,
        categorie,
        prioriteit,
        status,
        startdatum,
        deadline,
        externe_referentie,
        opmerkingen
      )
      values (
        new.woning_id,
        v_inspectie_id,
        v_melding_id,
        case new.analyse_status
          when 'onwaarschijnlijk'
            then 'Controleer ingevoerde meterstand'
          else 'Onderzoek kritieke energieafwijking'
        end,
        v_omschrijving,
        v_categorie_taak,
        v_prioriteit,
        'open',
        current_date,
        current_date +
          case new.analyse_status
            when 'onwaarschijnlijk' then 1
            else 3
          end,
        v_referentie,
        'Automatisch aangemaakt door Energy Intelligence.'
      )
      on conflict (externe_referentie)
      where externe_referentie like
        'energy_intelligence:%'
      do update set
        inspectie_id =
          excluded.inspectie_id,
        melding_id =
          excluded.melding_id,
        titel = excluded.titel,
        omschrijving =
          excluded.omschrijving,
        categorie =
          excluded.categorie,
        prioriteit =
          excluded.prioriteit,
        deadline =
          excluded.deadline,
        opmerkingen =
          excluded.opmerkingen;
    end if;
  else
    update public.intelligence_werkpunten
    set
      status = 'vervallen',
      opgevolgd_at = now()
    where deduplicatie_sleutel =
      v_deduplicatie
      and status in ('concept', 'actief');

    update public.meldingen
    set
      status = 'opgelost',
      oplosdatum = current_date,
      oplossing =
        'Energieanalyse geeft geen actieve afwijking meer.'
    where extern_referentienummer =
      v_referentie
      and status <> 'opgelost';

    update public.taken
    set
      status = 'afgerond',
      afgerond_op = current_date,
      opmerkingen =
        concat_ws(
          E'\n',
          nullif(opmerkingen, ''),
          'Automatisch afgerond: energieanalyse geeft geen actieve afwijking meer.'
        )
    where externe_referentie =
      v_referentie
      and status not in (
        'afgerond',
        'geannuleerd'
      );
  end if;

  return new;
end;
$$;

revoke all
on function
  public.verwerk_energy_intelligence_opvolging()
from public, anon, authenticated;

grant execute
on function
  public.verwerk_energy_intelligence_opvolging()
to service_role;

drop trigger if exists
meterstanden_energy_intelligence_opvolging
on public.meterstanden;

create trigger
meterstanden_energy_intelligence_opvolging
after insert or update of
  analyse_status,
  analyse_resultaat,
  verklaring_code,
  verklaring_toelichting,
  opvolging_nodig
on public.meterstanden
for each row
execute function
  public.verwerk_energy_intelligence_opvolging();

update public.meterstanden
set
  analyse_status = analyse_status,
  geanalyseerd_at =
    coalesce(geanalyseerd_at, updated_at)
where analyse_status in (
    'verhoogd',
    'kritiek',
    'onwaarschijnlijk'
  )
  and opvolging_nodig = true;

comment on function
  public.verwerk_energy_intelligence_opvolging()
is
  'Maakt gededupliceerde interne werkpunten en bij kritieke of onwaarschijnlijke energieafwijkingen automatisch een melding en taak.';

commit;
