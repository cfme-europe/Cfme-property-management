create unique index if not exists
  taken_workflow_referentie_idx
on public.taken(externe_referentie)
where externe_referentie like 'workflow:%';

create unique index if not exists
  workflow_acties_gebeurtenis_actie_idx
on public.workflow_acties(
  gebeurtenis_id,
  actie_type
);

create or replace function public.verwerk_workflow_gebeurtenis(
  p_gebeurtenis_id bigint
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_gebeurtenis public.workflow_gebeurtenissen%rowtype;
  v_taak_id bigint;
  v_titel text;
  v_omschrijving text;
  v_categorie text;
  v_startdatum date;
  v_deadline date;
  v_actie_type text := 'taak_aanmaken';
  v_referentie text;
begin
  select *
  into v_gebeurtenis
  from public.workflow_gebeurtenissen
  where id = p_gebeurtenis_id
  for update;

  if not found then
    raise exception
      'Workflowgebeurtenis % niet gevonden.',
      p_gebeurtenis_id;
  end if;

  if v_gebeurtenis.status in (
    'verwerkt',
    'genegeerd'
  ) then
    return v_gebeurtenis.id;
  end if;

  update public.workflow_gebeurtenissen
  set
    status = 'verwerken',
    foutmelding = null
  where id = v_gebeurtenis.id;

  case v_gebeurtenis.gebeurtenis_type
    when 'inspectie.schade_vastgesteld' then
      v_titel := 'Schade uit inspectie opvolgen';
      v_omschrijving :=
        coalesce(
          v_gebeurtenis.payload
            ->> 'schade_omschrijving',
          'Tijdens een inspectie is schade vastgesteld.'
        );
      v_categorie := 'schade';
      v_startdatum :=
        nullif(
          v_gebeurtenis.payload
            ->> 'inspectiedatum',
          ''
        )::date;
      v_deadline :=
        v_startdatum + 7;

    when 'melding.aangemaakt' then
      v_titel :=
        coalesce(
          nullif(
            v_gebeurtenis.payload
              ->> 'titel',
            ''
          ),
          'Nieuwe melding opvolgen'
        );

      v_omschrijving :=
        nullif(
          v_gebeurtenis.payload
            ->> 'omschrijving',
          ''
        );

      v_categorie :=
        case
          when (
            v_gebeurtenis.payload
              ->> 'categorie'
          ) in (
            'schade',
            'onderhoud',
            'veiligheid',
            'schoonmaak',
            'installatie',
            'overig'
          )
          then
            v_gebeurtenis.payload
              ->> 'categorie'
          else 'overig'
        end;

      v_startdatum :=
        nullif(
          v_gebeurtenis.payload
            ->> 'melddatum',
          ''
        )::date;

      v_deadline :=
        case v_gebeurtenis.prioriteit
          when 'spoed' then v_startdatum
          when 'hoog' then v_startdatum + 2
          when 'normaal' then v_startdatum + 7
          else v_startdatum + 14
        end;

    when 'verhuurperiode.gestart' then
      v_titel := 'Begininspectie uitvoeren';
      v_omschrijving :=
        'Voer de verplichte begininspectie voor de nieuwe verhuurperiode uit.';
      v_categorie := 'inspectie';
      v_startdatum :=
        nullif(
          v_gebeurtenis.payload
            ->> 'startdatum',
          ''
        )::date;
      v_deadline := v_startdatum;

    when 'verhuurperiode.beeindigd' then
      v_titel := 'Eindinspectie uitvoeren';
      v_omschrijving :=
        'Voer de verplichte eindinspectie en oplevercontrole uit.';
      v_categorie := 'inspectie';
      v_startdatum :=
        nullif(
          v_gebeurtenis.payload
            ->> 'werkelijke_einddatum',
          ''
        )::date;
      v_deadline :=
        coalesce(
          nullif(
            v_gebeurtenis.payload
              ->> 'opleverdatum',
            ''
          )::date,
          v_startdatum
        );

    else
      insert into public.workflow_acties (
        gebeurtenis_id,
        actie_type,
        status,
        resultaat,
        uitgevoerd_at
      )
      values (
        v_gebeurtenis.id,
        'geen_handler',
        'overgeslagen',
        jsonb_build_object(
          'reden',
          'Geen workflowhandler beschikbaar.'
        ),
        null
      )
      on conflict (
        gebeurtenis_id,
        actie_type
      )
      do nothing;

      update public.workflow_gebeurtenissen
      set
        status = 'genegeerd',
        foutmelding = null
      where id = v_gebeurtenis.id;

      return v_gebeurtenis.id;
  end case;

  v_referentie :=
    format(
      'workflow:%s:taak',
      v_gebeurtenis.id
    );

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
    v_gebeurtenis.woning_id,
    case
      when v_gebeurtenis.bron_type = 'inspectie'
      then v_gebeurtenis.bron_id
      else null
    end,
    case
      when v_gebeurtenis.bron_type = 'melding'
      then v_gebeurtenis.bron_id
      else null
    end,
    v_titel,
    v_omschrijving,
    v_categorie,
    v_gebeurtenis.prioriteit,
    'open',
    v_startdatum,
    v_deadline,
    v_referentie,
    format(
      'Automatisch aangemaakt door workflowgebeurtenis %s.',
      v_gebeurtenis.id
    )
  )
  on conflict (externe_referentie)
  where externe_referentie like 'workflow:%'
  do update
  set updated_at = now()
  returning id into v_taak_id;

  insert into public.workflow_acties (
    gebeurtenis_id,
    taak_id,
    actie_type,
    status,
    resultaat,
    uitgevoerd_at,
    foutmelding
  )
  values (
    v_gebeurtenis.id,
    v_taak_id,
    v_actie_type,
    'uitgevoerd',
    jsonb_build_object(
      'taak_id',
      v_taak_id,
      'externe_referentie',
      v_referentie
    ),
    now(),
    null
  )
  on conflict (
    gebeurtenis_id,
    actie_type
  )
  do update
  set
    taak_id = excluded.taak_id,
    status = 'uitgevoerd',
    resultaat = excluded.resultaat,
    uitgevoerd_at = now(),
    foutmelding = null;

  update public.workflow_gebeurtenissen
  set
    status = 'verwerkt',
    foutmelding = null
  where id = v_gebeurtenis.id;

  return v_gebeurtenis.id;

exception
  when others then
    update public.workflow_gebeurtenissen
    set
      status = 'mislukt',
      foutmelding = sqlerrm
    where id = p_gebeurtenis_id;

    raise;
end;
$$;

grant execute
on function public.verwerk_workflow_gebeurtenis(bigint)
to authenticated;
