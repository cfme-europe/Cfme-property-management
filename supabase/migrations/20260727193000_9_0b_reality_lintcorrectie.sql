begin;

create or replace function public.controleer_reality_engine()
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.ruimte_type = 'slaapkamer'
      and ruimte.kamer_id is null
  ) then
    raise exception
      'Reality Engine-controle mislukt: er bestaan slaapkamers zonder bewonerskamer.';
  end if;

  if exists (
    select ruimte.kamer_id
    from public.woning_ruimten ruimte
    where ruimte.kamer_id is not null
    group by ruimte.kamer_id
    having count(*) > 1
  ) then
    raise exception
      'Reality Engine-controle mislukt: een bewonerskamer is aan meerdere fysieke ruimtes gekoppeld.';
  end if;

  if exists (
    select 1
    from public.woning_ruimten ruimte
    join public.kamers kamer
      on kamer.id = ruimte.kamer_id
    where kamer.woning_id <> ruimte.woning_id
  ) then
    raise exception
      'Reality Engine-controle mislukt: een kamer is aan een ruimte van een andere woning gekoppeld.';
  end if;

  if exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.ruimte_type <> 'slaapkamer'
      and ruimte.kamer_id is not null
  ) then
    raise exception
      'Reality Engine-controle mislukt: een niet-slaapkamer heeft een bewonerskamerkoppeling.';
  end if;
end;
$$;

revoke all
on function public.controleer_reality_engine()
from public, anon;

grant execute
on function public.controleer_reality_engine()
to authenticated, service_role;

comment on function public.controleer_reality_engine()
is
  'Controleert de integriteit van slaapkamer- en bewonerskamerkoppelingen binnen de Reality Engine.';

create or replace function public.sla_woningroute_op(
  p_woning_id bigint,
  p_configuratie jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_verdieping jsonb;
  v_ruimte jsonb;
  v_object jsonb;
  v_controlecode text;
  v_verdieping_id bigint;
  v_ruimte_id bigint;
  v_object_id bigint;
  v_kamer_id bigint;
  v_definitie_id bigint;
  v_actieve_bewoners integer;
  v_behouden_verdiepingen bigint[] := '{}'::bigint[];
  v_behouden_ruimten bigint[] := '{}'::bigint[];
  v_behouden_objecten bigint[] := '{}'::bigint[];
  v_behouden_controlepunten bigint[] := '{}'::bigint[];
  v_ruimte_volgorde integer := 0;
  v_object_volgorde integer;
  v_controle_volgorde integer;
  v_capaciteit integer;
  v_resultaat jsonb;
begin
  if p_woning_id is null or p_woning_id <= 0 then
    raise exception 'Ongeldige woning.';
  end if;

  if not public.mag_wijzigen() then
    raise exception 'Onvoldoende rechten om de woningroute te wijzigen.';
  end if;

  if not exists (
    select 1
    from public.woningen woning
    where woning.id = p_woning_id
  ) then
    raise exception 'Woning niet gevonden.';
  end if;

  if jsonb_typeof(p_configuratie) <> 'object'
    or jsonb_typeof(p_configuratie -> 'ruimten') <> 'array'
  then
    raise exception 'Ongeldige woningconfiguratie.';
  end if;

  if jsonb_array_length(p_configuratie -> 'ruimten') = 0 then
    raise exception 'Kies minimaal één ruimte.';
  end if;

  for v_verdieping in
    select value
    from jsonb_array_elements(
      coalesce(p_configuratie -> 'verdiepingen', '[]'::jsonb)
    )
  loop
    if nullif(trim(v_verdieping ->> 'naam'), '') is null then
      raise exception 'Naam van de verdieping is verplicht.';
    end if;

    if (v_verdieping ->> 'niveau') is null
      or (v_verdieping ->> 'niveau') !~ '^-?[0-9]+$'
    then
      raise exception 'Niveau van de verdieping moet een geheel getal zijn.';
    end if;

    if nullif(v_verdieping ->> 'id', '') is not null then
      update public.woning_verdiepingen
      set
        naam = trim(v_verdieping ->> 'naam'),
        niveau = (v_verdieping ->> 'niveau')::integer,
        loopvolgorde = coalesce(
          nullif(v_verdieping ->> 'loopvolgorde', '')::integer,
          0
        ),
        actief = true,
        opmerkingen = nullif(trim(v_verdieping ->> 'opmerkingen'), '')
      where id = (v_verdieping ->> 'id')::bigint
        and woning_id = p_woning_id
      returning id into v_verdieping_id;

      if v_verdieping_id is null then
        raise exception 'Verdieping hoort niet bij deze woning.';
      end if;
    else
      select verdieping.id
      into v_verdieping_id
      from public.woning_verdiepingen verdieping
      where verdieping.woning_id = p_woning_id
        and lower(trim(verdieping.naam)) =
            lower(trim(v_verdieping ->> 'naam'))
      order by verdieping.actief desc, verdieping.id
      limit 1
      for update;

      if v_verdieping_id is null then
        insert into public.woning_verdiepingen (
          woning_id,
          naam,
          niveau,
          loopvolgorde,
          actief,
          opmerkingen
        )
        values (
          p_woning_id,
          trim(v_verdieping ->> 'naam'),
          (v_verdieping ->> 'niveau')::integer,
          coalesce(
            nullif(v_verdieping ->> 'loopvolgorde', '')::integer,
            0
          ),
          true,
          nullif(trim(v_verdieping ->> 'opmerkingen'), '')
        )
        returning id into v_verdieping_id;
      else
        update public.woning_verdiepingen
        set
          niveau = (v_verdieping ->> 'niveau')::integer,
          loopvolgorde = coalesce(
            nullif(v_verdieping ->> 'loopvolgorde', '')::integer,
            0
          ),
          actief = true
        where id = v_verdieping_id;
      end if;
    end if;

    v_behouden_verdiepingen :=
      array_append(v_behouden_verdiepingen, v_verdieping_id);
  end loop;

  for v_ruimte in
    select value
    from jsonb_array_elements(p_configuratie -> 'ruimten')
  loop
    v_ruimte_volgorde := v_ruimte_volgorde + 1;

    if nullif(trim(v_ruimte ->> 'naam'), '') is null then
      raise exception 'Naam van de ruimte is verplicht.';
    end if;

    if coalesce(v_ruimte ->> 'ruimte_type', '') not in (
      'toegangsdeur',
      'hal',
      'gang',
      'overloop',
      'trap',
      'woonkamer',
      'slaapkamer',
      'keuken',
      'badkamer',
      'toilet',
      'berging',
      'zolder',
      'kelder',
      'technische_ruimte',
      'buitenruimte',
      'overig'
    ) then
      raise exception 'Ongeldig ruimtetype.';
    end if;

    v_verdieping_id := null;

    if nullif(trim(v_ruimte ->> 'verdieping_naam'), '') is not null then
      select verdieping.id
      into v_verdieping_id
      from public.woning_verdiepingen verdieping
      where verdieping.woning_id = p_woning_id
        and lower(trim(verdieping.naam)) =
            lower(trim(v_ruimte ->> 'verdieping_naam'))
        and verdieping.actief
      order by verdieping.id
      limit 1;

      if v_verdieping_id is null then
        raise exception
          'De voorgestelde verdieping "%" bestaat niet.',
          trim(v_ruimte ->> 'verdieping_naam');
      end if;
    end if;

    v_ruimte_id := null;

    if nullif(v_ruimte ->> 'id', '') is not null then
      select ruimte.id, ruimte.kamer_id
      into v_ruimte_id, v_kamer_id
      from public.woning_ruimten ruimte
      where ruimte.id = (v_ruimte ->> 'id')::bigint
        and ruimte.woning_id = p_woning_id
      for update;

      if v_ruimte_id is null then
        raise exception 'Ruimte hoort niet bij deze woning.';
      end if;

      update public.woning_ruimten
      set
        verdieping_id = v_verdieping_id,
        naam = trim(v_ruimte ->> 'naam'),
        ruimte_type = v_ruimte ->> 'ruimte_type',
        loopvolgorde = v_ruimte_volgorde,
        actief = true,
        controle_verplicht = true,
        omschrijving = null,
        route_instructie =
          nullif(trim(v_ruimte ->> 'route_instructie'), ''),
        opmerkingen = case
          when coalesce((v_ruimte ->> 'buiten')::boolean, false)
          then 'Buitenruimte'
          else null
        end
      where id = v_ruimte_id;
    else
      insert into public.woning_ruimten (
        woning_id,
        verdieping_id,
        kamer_id,
        naam,
        ruimte_type,
        loopvolgorde,
        actief,
        controle_verplicht,
        omschrijving,
        route_instructie,
        opmerkingen
      )
      values (
        p_woning_id,
        v_verdieping_id,
        null,
        trim(v_ruimte ->> 'naam'),
        v_ruimte ->> 'ruimte_type',
        v_ruimte_volgorde,
        true,
        true,
        null,
        nullif(trim(v_ruimte ->> 'route_instructie'), ''),
        case
          when coalesce((v_ruimte ->> 'buiten')::boolean, false)
          then 'Buitenruimte'
          else null
        end
      )
      returning id, kamer_id
      into v_ruimte_id, v_kamer_id;
    end if;

    if v_ruimte ->> 'ruimte_type' = 'slaapkamer' then
      if (v_ruimte ->> 'capaciteit') is null
        or (v_ruimte ->> 'capaciteit') !~ '^[1-9][0-9]*$'
      then
        raise exception
          'Capaciteit van slaapkamer "%" moet minimaal 1 zijn.',
          trim(v_ruimte ->> 'naam');
      end if;

      v_capaciteit := (v_ruimte ->> 'capaciteit')::integer;

      select kamer_id
      into v_kamer_id
      from public.woning_ruimten
      where id = v_ruimte_id;

      if v_kamer_id is null then
        raise exception
          'Slaapkamer "%" heeft geen bewonerskamer gekregen.',
          trim(v_ruimte ->> 'naam');
      end if;

      select count(*)::integer
      into v_actieve_bewoners
      from public.bewoners bewoner
      where bewoner.kamer_id = v_kamer_id
        and bewoner.status = 'actief';

      if v_capaciteit < v_actieve_bewoners then
        raise exception
          'Capaciteit van slaapkamer "%" kan niet lager zijn dan de actuele bezetting van %.',
          trim(v_ruimte ->> 'naam'),
          v_actieve_bewoners;
      end if;

      update public.kamers
      set
        capaciteit = v_capaciteit,
        naam = trim(v_ruimte ->> 'naam'),
        verdieping = (
          select verdieping.naam
          from public.woning_verdiepingen verdieping
          where verdieping.id = v_verdieping_id
        ),
        actief = true
      where id = v_kamer_id
        and woning_id = p_woning_id;
    end if;

    v_behouden_ruimten :=
      array_append(v_behouden_ruimten, v_ruimte_id);

    v_controle_volgorde := 1;

    for v_controlecode in
      select jsonb_array_elements_text(
        coalesce(v_ruimte -> 'controles', '[]'::jsonb)
      )
    loop
      select definitie.id
      into v_definitie_id
      from public.controlepunt_definities definitie
      where definitie.code = v_controlecode
        and definitie.actief
      limit 1;

      if v_definitie_id is null then
        raise exception
          'Onbekende controlepuntdefinitie: %.',
          v_controlecode;
      end if;

      select punt.id
      into v_object_id
      from public.woning_controlepunten punt
      where punt.woning_id = p_woning_id
        and punt.ruimte_id = v_ruimte_id
        and punt.object_id is null
        and punt.definitie_id = v_definitie_id
      order by punt.id
      limit 1
      for update;

      if v_object_id is null then
        insert into public.woning_controlepunten (
          woning_id,
          ruimte_id,
          object_id,
          definitie_id,
          loopvolgorde,
          verplicht,
          actief
        )
        values (
          p_woning_id,
          v_ruimte_id,
          null,
          v_definitie_id,
          v_controle_volgorde,
          true,
          true
        )
        returning id into v_object_id;
      else
        update public.woning_controlepunten
        set
          loopvolgorde = v_controle_volgorde,
          verplicht = true,
          actief = true
        where id = v_object_id;
      end if;

      v_behouden_controlepunten :=
        array_append(v_behouden_controlepunten, v_object_id);

      v_controle_volgorde := v_controle_volgorde + 1;
    end loop;

    v_object_volgorde := 1;

    for v_object in
      select value
      from jsonb_array_elements(
        coalesce(v_ruimte -> 'objecten', '[]'::jsonb)
      )
    loop
      if nullif(trim(v_object ->> 'naam'), '') is null
        or nullif(trim(v_object ->> 'object_type'), '') is null
      then
        raise exception 'Naam en type van een object zijn verplicht.';
      end if;

      v_object_id := null;

      if nullif(v_object ->> 'id', '') is not null then
        select object.id
        into v_object_id
        from public.woning_objecten object
        where object.id = (v_object ->> 'id')::bigint
          and object.woning_id = p_woning_id
          and object.ruimte_id = v_ruimte_id
        for update;

        if v_object_id is null then
          raise exception 'Object hoort niet bij deze ruimte.';
        end if;
      else
        select object.id
        into v_object_id
        from public.woning_objecten object
        where object.woning_id = p_woning_id
          and object.ruimte_id = v_ruimte_id
          and lower(trim(object.naam)) =
              lower(trim(v_object ->> 'naam'))
        order by object.actief desc, object.id
        limit 1
        for update;
      end if;

      if v_object_id is null then
        insert into public.woning_objecten (
          woning_id,
          ruimte_id,
          object_type,
          naam,
          objectnummer,
          loopvolgorde,
          actief,
          controle_verplicht
        )
        values (
          p_woning_id,
          v_ruimte_id,
          trim(v_object ->> 'object_type'),
          trim(v_object ->> 'naam'),
          v_ruimte_volgorde::text || '-' || v_object_volgorde::text,
          v_object_volgorde,
          true,
          true
        )
        returning id into v_object_id;
      else
        update public.woning_objecten
        set
          object_type = trim(v_object ->> 'object_type'),
          naam = trim(v_object ->> 'naam'),
          objectnummer =
            v_ruimte_volgorde::text || '-' || v_object_volgorde::text,
          loopvolgorde = v_object_volgorde,
          actief = true,
          controle_verplicht = true
        where id = v_object_id;
      end if;

      v_behouden_objecten :=
        array_append(v_behouden_objecten, v_object_id);

      for v_definitie_id in
        select definitie.id
        from public.controlepunt_definities definitie
        where definitie.standaard_object_type =
              trim(v_object ->> 'object_type')
          and definitie.actief
        order by definitie.id
      loop
        select punt.id
        into v_kamer_id
        from public.woning_controlepunten punt
        where punt.woning_id = p_woning_id
          and punt.ruimte_id = v_ruimte_id
          and punt.object_id = v_object_id
          and punt.definitie_id = v_definitie_id
        order by punt.id
        limit 1
        for update;

        if v_kamer_id is null then
          insert into public.woning_controlepunten (
            woning_id,
            ruimte_id,
            object_id,
            definitie_id,
            loopvolgorde,
            verplicht,
            actief
          )
          values (
            p_woning_id,
            v_ruimte_id,
            v_object_id,
            v_definitie_id,
            v_controle_volgorde,
            true,
            true
          )
          returning id into v_kamer_id;
        else
          update public.woning_controlepunten
          set
            loopvolgorde = v_controle_volgorde,
            verplicht = true,
            actief = true
          where id = v_kamer_id;
        end if;

        v_behouden_controlepunten :=
          array_append(v_behouden_controlepunten, v_kamer_id);

        v_controle_volgorde := v_controle_volgorde + 1;
      end loop;

      v_object_volgorde := v_object_volgorde + 1;
    end loop;

    update public.woning_controlepunten
    set actief = false
    where woning_id = p_woning_id
      and ruimte_id = v_ruimte_id
      and not (
        id = any(coalesce(v_behouden_controlepunten, '{}'::bigint[]))
      );

    update public.woning_objecten
    set actief = false
    where woning_id = p_woning_id
      and ruimte_id = v_ruimte_id
      and not (
        id = any(coalesce(v_behouden_objecten, '{}'::bigint[]))
      );
  end loop;

  for v_ruimte_id, v_kamer_id in
    select ruimte.id, ruimte.kamer_id
    from public.woning_ruimten ruimte
    where ruimte.woning_id = p_woning_id
      and ruimte.actief
      and not (
        ruimte.id = any(coalesce(v_behouden_ruimten, '{}'::bigint[]))
      )
    for update
  loop
    if v_kamer_id is not null then
      select count(*)::integer
      into v_actieve_bewoners
      from public.bewoners bewoner
      where bewoner.kamer_id = v_kamer_id
        and bewoner.status = 'actief';

      if v_actieve_bewoners > 0 then
        raise exception
          'Een slaapkamer kan niet worden verwijderd omdat er nog actieve bewoners aan gekoppeld zijn.';
      end if;
    end if;

    update public.woning_ruimten
    set actief = false
    where id = v_ruimte_id;
  end loop;

  update public.woning_objecten object
  set actief = false
  where object.woning_id = p_woning_id
    and not (
      object.ruimte_id =
      any(coalesce(v_behouden_ruimten, '{}'::bigint[]))
    );

  update public.woning_controlepunten punt
  set actief = false
  where punt.woning_id = p_woning_id
    and not (
      punt.ruimte_id =
      any(coalesce(v_behouden_ruimten, '{}'::bigint[]))
    );

  update public.woning_verdiepingen verdieping
  set actief = false
  where verdieping.woning_id = p_woning_id
    and not (
      verdieping.id =
      any(coalesce(v_behouden_verdiepingen, '{}'::bigint[]))
    )
    and not exists (
      select 1
      from public.woning_ruimten ruimte
      where ruimte.verdieping_id = verdieping.id
        and ruimte.actief
    );

  perform public.controleer_reality_engine();

  select jsonb_build_object(
    'woning_id', p_woning_id,
    'verdiepingen', (
      select count(*)
      from public.woning_verdiepingen
      where woning_id = p_woning_id
        and actief
    ),
    'ruimten', (
      select count(*)
      from public.woning_ruimten
      where woning_id = p_woning_id
        and actief
    ),
    'slaapkamers', (
      select count(*)
      from public.woning_ruimten
      where woning_id = p_woning_id
        and actief
        and ruimte_type = 'slaapkamer'
    ),
    'objecten', (
      select count(*)
      from public.woning_objecten
      where woning_id = p_woning_id
        and actief
    ),
    'controlepunten', (
      select count(*)
      from public.woning_controlepunten
      where woning_id = p_woning_id
        and actief
    )
  )
  into v_resultaat;

  return v_resultaat;
end;
$$;

revoke all
on function public.sla_woningroute_op(bigint, jsonb)
from public, anon;

grant execute
on function public.sla_woningroute_op(bigint, jsonb)
to authenticated, service_role;

comment on function public.sla_woningroute_op(bigint, jsonb)
is
  'Reality Engine 9.0B: slaat de volledige fysieke woningconfiguratie transactioneel op vanuit één begeleide invoer.';

commit;
