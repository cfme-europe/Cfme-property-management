-- CFME Control 8.1D
-- Automatische opvolging van controleafwijkingen.

alter table public.controle_afwijkingen
  add column if not exists verantwoordelijke text,
  add column if not exists deadline date,
  add column if not exists hercontrole_nodig boolean not null default false,
  add column if not exists hercontrole_voor date,
  add column if not exists herstelbewijs_verplicht boolean not null default false,
  add column if not exists herstelbewijs_omschrijving text,
  add column if not exists opgelost_door uuid
    references public.profiles(id)
    on update cascade
    on delete set null,
  add column if not exists opvolging_aangemaakt_at timestamptz;

alter table public.controle_afwijkingen
  drop constraint if exists controle_afwijkingen_hercontrole_consistent;

alter table public.controle_afwijkingen
  add constraint controle_afwijkingen_hercontrole_consistent
  check (
    hercontrole_nodig = false
    or hercontrole_voor is not null
  );

create unique index if not exists
  meldingen_controle_afwijking_referentie_uniek_idx
on public.meldingen(extern_referentienummer)
where extern_referentienummer like 'controle_afwijking:%';

create unique index if not exists
  taken_controle_afwijking_referentie_uniek_idx
on public.taken(externe_referentie)
where externe_referentie like 'controle_afwijking:%';

create or replace function public.verwerk_controle_afwijking_opvolging()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resultaat public.controle_resultaten%rowtype;
  v_melding_id bigint;
  v_taak_id bigint;
  v_hercontrole_taak_id bigint;
  v_titel text;
  v_categorie text;
  v_deadline date;
  v_factuur_naar text;
  v_melding_referentie text;
  v_taak_referentie text;
  v_hercontrole_referentie text;
  v_gebeurtenis_id bigint;
begin
  -- De functie werkt na het aanmaken van melding en taak
  -- dezelfde afwijking bij met de gegenereerde koppelingen.
  -- Voorkom dat die interne update de opvolgingsketen opnieuw uitvoert.
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  select *
  into v_resultaat
  from public.controle_resultaten
  where id = new.controle_resultaat_id;

  if not found then
    raise exception
      'Controleresultaat % niet gevonden.',
      new.controle_resultaat_id;
  end if;

  v_titel :=
    format(
      '%s%s – %s',
      v_resultaat.ruimte_naam_snapshot,
      case
        when v_resultaat.object_naam_snapshot is not null
        then ' / ' || v_resultaat.object_naam_snapshot
        else ''
      end,
      v_resultaat.controlepunt_naam_snapshot
    );

  v_categorie :=
    case new.gebrek_type
      when 'vervuiling' then 'schoonmaak'
      when 'beschadiging' then 'schade'
      when 'veiligheidsrisico' then 'veiligheid'
      when 'lekkage' then 'onderhoud'
      when 'schimmel' then 'onderhoud'
      when 'defect' then 'onderhoud'
      when 'keuring_verlopen' then 'installatie'
      else 'overig'
    end;

  v_deadline :=
    coalesce(
      new.deadline,
      current_date +
        case new.urgentie
          when 'spoed' then 0
          when 'hoog' then 2
          when 'normaal' then 7
          else 14
        end
    );

  v_factuur_naar :=
    coalesce(new.factuur_naar, 'nog_te_bepalen');

  v_melding_referentie :=
    format('controle_afwijking:%s:melding', new.id);

  v_taak_referentie :=
    format('controle_afwijking:%s:taak', new.id);

  v_hercontrole_referentie :=
    format('controle_afwijking:%s:hercontrole', new.id);

  if new.status in ('opgelost', 'niet_relevant') then
    if new.melding_id is not null then
      update public.meldingen
      set
        status = 'opgelost',
        oplosdatum = coalesce(oplosdatum, current_date),
        oplossing = coalesce(
          nullif(trim(new.oplossing), ''),
          case
            when new.status = 'niet_relevant'
            then 'Afwijking als niet relevant afgesloten.'
            else 'Afwijking opgelost.'
          end
        )
      where id = new.melding_id;
    end if;

    if new.taak_id is not null then
      update public.taken
      set
        status =
          case
            when new.status = 'niet_relevant'
            then 'geannuleerd'
            else 'afgerond'
          end,
        afgerond_op =
          case
            when new.status = 'opgelost'
            then coalesce(afgerond_op, current_date)
            else null
          end
      where id = new.taak_id;
    end if;

    if
      new.status = 'opgelost'
      and new.hercontrole_nodig
      and new.hercontrole_voor is not null
    then
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
        toegewezen_aan,
        externe_referentie,
        opmerkingen
      )
      values (
        new.woning_id,
        new.inspectie_id,
        new.melding_id,
        'Hercontrole – ' || v_titel,
        'Controleer of het vastgelegde herstel aantoonbaar en volledig is uitgevoerd.',
        'inspectie',
        new.urgentie,
        'open',
        current_date,
        new.hercontrole_voor,
        new.verantwoordelijke,
        v_hercontrole_referentie,
        format(
          'Automatische hercontrole voor controleafwijking %s.',
          new.id
        )
      )
      on conflict (externe_referentie)
      where externe_referentie like 'controle_afwijking:%'
      do update
      set
        deadline = excluded.deadline,
        toegewezen_aan = excluded.toegewezen_aan,
        status = 'open',
        updated_at = now()
      returning id into v_hercontrole_taak_id;
    end if;

    return new;
  end if;

  if new.opvolging_nodig and new.melding_maken then
    insert into public.meldingen (
      woning_id,
      inspectie_id,
      titel,
      omschrijving,
      categorie,
      prioriteit,
      status,
      melddatum,
      verantwoordelijke,
      factuur_naar,
      extern_referentienummer,
      opmerkingen
    )
    values (
      new.woning_id,
      new.inspectie_id,
      v_titel,
      new.toelichting,
      v_categorie,
      new.urgentie,
      'open',
      current_date,
      new.verantwoordelijke,
      v_factuur_naar,
      v_melding_referentie,
      format(
        'Automatisch aangemaakt vanuit controleafwijking %s.',
        new.id
      )
    )
    on conflict (extern_referentienummer)
    where extern_referentienummer like 'controle_afwijking:%'
    do update
    set
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      categorie = excluded.categorie,
      prioriteit = excluded.prioriteit,
      verantwoordelijke = excluded.verantwoordelijke,
      factuur_naar = excluded.factuur_naar,
      updated_at = now()
    returning id into v_melding_id;
  else
    v_melding_id := new.melding_id;
  end if;

  if new.opvolging_nodig and new.taak_maken then
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
      toegewezen_aan,
      externe_referentie,
      opmerkingen
    )
    values (
      new.woning_id,
      new.inspectie_id,
      v_melding_id,
      'Opvolgen – ' || v_titel,
      new.toelichting,
      case
        when v_categorie in (
          'schade',
          'onderhoud',
          'veiligheid',
          'schoonmaak',
          'installatie'
        )
        then v_categorie
        else 'overig'
      end,
      new.urgentie,
      'open',
      current_date,
      v_deadline,
      new.verantwoordelijke,
      v_taak_referentie,
      format(
        'Automatisch aangemaakt vanuit controleafwijking %s.',
        new.id
      )
    )
    on conflict (externe_referentie)
    where externe_referentie like 'controle_afwijking:%'
    do update
    set
      melding_id = excluded.melding_id,
      titel = excluded.titel,
      omschrijving = excluded.omschrijving,
      categorie = excluded.categorie,
      prioriteit = excluded.prioriteit,
      deadline = excluded.deadline,
      toegewezen_aan = excluded.toegewezen_aan,
      updated_at = now()
    returning id into v_taak_id;
  else
    v_taak_id := new.taak_id;
  end if;

  update public.controle_afwijkingen
  set
    melding_id = v_melding_id,
    taak_id = v_taak_id,
    deadline = v_deadline,
    factuur_naar = v_factuur_naar,
    opvolging_aangemaakt_at =
      coalesce(opvolging_aangemaakt_at, now())
  where id = new.id;

  insert into public.workflow_gebeurtenissen (
    woning_id,
    controlesessie_id,
    gebeurtenis_type,
    bron_type,
    bron_id,
    status,
    prioriteit,
    deduplicatie_sleutel,
    payload
  )
  values (
    new.woning_id,
    new.controlesessie_id,
    'controle.afwijking',
    'controle_afwijking',
    new.id,
    'verwerkt',
    new.urgentie,
    format('controle_afwijking:%s:opvolging', new.id),
    jsonb_build_object(
      'controle_afwijking_id', new.id,
      'melding_id', v_melding_id,
      'taak_id', v_taak_id,
      'deadline', v_deadline,
      'factuur_naar', v_factuur_naar
    )
  )
  on conflict (deduplicatie_sleutel)
  do update
  set
    status = 'verwerkt',
    prioriteit = excluded.prioriteit,
    payload = excluded.payload,
    verwerkt_at = now(),
    foutmelding = null
  returning id into v_gebeurtenis_id;

  insert into public.workflow_acties (
    gebeurtenis_id,
    taak_id,
    actie_type,
    status,
    resultaat,
    uitgevoerd_at
  )
  values (
    v_gebeurtenis_id,
    v_taak_id,
    'controle_afwijking_opvolging',
    'uitgevoerd',
    jsonb_build_object(
      'melding_id', v_melding_id,
      'taak_id', v_taak_id
    ),
    now()
  )
  on conflict (gebeurtenis_id, actie_type)
  do update
  set
    taak_id = excluded.taak_id,
    status = 'uitgevoerd',
    resultaat = excluded.resultaat,
    uitgevoerd_at = now(),
    foutmelding = null;

  return new;
end;
$$;

revoke all on function
  public.verwerk_controle_afwijking_opvolging()
from public, anon, authenticated;

grant execute on function
  public.verwerk_controle_afwijking_opvolging()
to service_role;

drop trigger if exists
  controle_afwijkingen_automatische_opvolging
on public.controle_afwijkingen;

create trigger controle_afwijkingen_automatische_opvolging
after insert or update of
  gebrek_type,
  toelichting,
  urgentie,
  opvolging_nodig,
  melding_maken,
  taak_maken,
  status,
  oplossing,
  opgelost_at,
  verantwoordelijke,
  hercontrole_nodig,
  hercontrole_voor
on public.controle_afwijkingen
for each row
execute function public.verwerk_controle_afwijking_opvolging();

-- Verwerk ook reeds bestaande open afwijkingen idempotent.
update public.controle_afwijkingen
set opvolging_nodig = opvolging_nodig
where status in ('open', 'in_opvolging');
