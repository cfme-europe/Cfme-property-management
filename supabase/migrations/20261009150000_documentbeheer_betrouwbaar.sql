-- Documentuploads worden idempotent geregistreerd: dezelfde schermhandeling
-- kan nooit meerdere documenten of versies opleveren.

alter table public.documenten
  add column if not exists upload_sleutel uuid;

alter table public.documentversies
  add column if not exists upload_sleutel uuid;

create unique index if not exists documenten_upload_sleutel_uniek
  on public.documenten(upload_sleutel)
  where upload_sleutel is not null;

create unique index if not exists documentversies_upload_sleutel_uniek
  on public.documentversies(upload_sleutel)
  where upload_sleutel is not null;

create or replace function public.registreer_document_upload(
  p_woning_id bigint,
  p_object_id bigint,
  p_titel text,
  p_document_type text,
  p_omschrijving text,
  p_vertrouwelijkheid text,
  p_upload_sleutel uuid,
  p_bestandspad text,
  p_bestandsnaam text,
  p_mime_type text,
  p_bestandsgrootte bigint,
  p_versie_opmerking text,
  p_aangemaakt_door uuid
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_document_id bigint;
begin
  if not public.mag_administratie_beheren() then
    raise exception 'Onvoldoende rechten om documenten toe te voegen.';
  end if;

  if auth.uid() is null or p_aangemaakt_door is distinct from auth.uid() then
    raise exception 'Ongeldige gebruikerssessie.';
  end if;

  if p_upload_sleutel is null then
    raise exception 'Uploadsleutel ontbreekt.';
  end if;

  insert into public.documenten (
    woning_id,
    object_id,
    titel,
    document_type,
    omschrijving,
    vertrouwelijkheid,
    aangemaakt_door,
    upload_sleutel
  ) values (
    p_woning_id,
    p_object_id,
    btrim(p_titel),
    p_document_type,
    nullif(btrim(coalesce(p_omschrijving, '')), ''),
    p_vertrouwelijkheid,
    auth.uid(),
    p_upload_sleutel
  )
  on conflict (upload_sleutel)
    where upload_sleutel is not null
  do nothing
  returning id into v_document_id;

  if v_document_id is null then
    select id
      into v_document_id
    from public.documenten
    where upload_sleutel = p_upload_sleutel;

    if v_document_id is null then
      raise exception 'Bestaande documentupload kon niet worden gevonden.';
    end if;

    return v_document_id;
  end if;

  insert into public.documentversies (
    document_id,
    versienummer,
    bestandspad,
    bestandsnaam,
    mime_type,
    bestandsgrootte,
    versie_opmerking,
    geupload_door,
    upload_sleutel
  ) values (
    v_document_id,
    1,
    p_bestandspad,
    p_bestandsnaam,
    p_mime_type,
    p_bestandsgrootte,
    nullif(btrim(coalesce(p_versie_opmerking, '')), ''),
    auth.uid(),
    p_upload_sleutel
  );

  return v_document_id;
end;
$$;

create or replace function public.registreer_documentversie_upload(
  p_document_id bigint,
  p_woning_id bigint,
  p_upload_sleutel uuid,
  p_bestandspad text,
  p_bestandsnaam text,
  p_mime_type text,
  p_bestandsgrootte bigint,
  p_versie_opmerking text,
  p_geupload_door uuid
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_versie_id bigint;
  v_versienummer integer;
begin
  if not public.mag_administratie_beheren() then
    raise exception 'Onvoldoende rechten om een documentversie toe te voegen.';
  end if;

  if auth.uid() is null or p_geupload_door is distinct from auth.uid() then
    raise exception 'Ongeldige gebruikerssessie.';
  end if;

  if p_upload_sleutel is null then
    raise exception 'Uploadsleutel ontbreekt.';
  end if;

  select id
    into v_versie_id
  from public.documentversies
  where upload_sleutel = p_upload_sleutel;

  if v_versie_id is not null then
    return v_versie_id;
  end if;

  perform pg_advisory_xact_lock(p_document_id);

  if not exists (
    select 1
    from public.documenten
    where id = p_document_id
      and woning_id = p_woning_id
      and status = 'actief'
  ) then
    raise exception 'Actief document niet gevonden.';
  end if;

  select coalesce(max(versienummer), 0) + 1
    into v_versienummer
  from public.documentversies
  where document_id = p_document_id;

  insert into public.documentversies (
    document_id,
    versienummer,
    bestandspad,
    bestandsnaam,
    mime_type,
    bestandsgrootte,
    versie_opmerking,
    geupload_door,
    upload_sleutel
  ) values (
    p_document_id,
    v_versienummer,
    p_bestandspad,
    p_bestandsnaam,
    p_mime_type,
    p_bestandsgrootte,
    nullif(btrim(coalesce(p_versie_opmerking, '')), ''),
    auth.uid(),
    p_upload_sleutel
  )
  on conflict (upload_sleutel)
    where upload_sleutel is not null
  do nothing
  returning id into v_versie_id;

  if v_versie_id is null then
    select id
      into v_versie_id
    from public.documentversies
    where upload_sleutel = p_upload_sleutel;
  end if;

  return v_versie_id;
end;
$$;

create or replace function public.archiveer_document(
  p_document_id bigint,
  p_woning_id bigint,
  p_reden text
)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_document_id bigint;
begin
  if not public.mag_administratie_beheren() then
    raise exception 'Onvoldoende rechten om documenten te archiveren.';
  end if;

  update public.documenten
  set
    status = 'gearchiveerd',
    gearchiveerd_op = now(),
    archiefreden = nullif(btrim(coalesce(p_reden, '')), '')
  where id = p_document_id
    and woning_id = p_woning_id
  returning id into v_document_id;

  if v_document_id is null then
    raise exception 'Document niet gevonden.';
  end if;

  return v_document_id;
end;
$$;

revoke all on function public.registreer_document_upload(
  bigint, bigint, text, text, text, text, uuid, text, text, text, bigint, text, uuid
) from public, anon;

revoke all on function public.registreer_documentversie_upload(
  bigint, bigint, uuid, text, text, text, bigint, text, uuid
) from public, anon;

revoke all on function public.archiveer_document(bigint, bigint, text)
  from public, anon;

grant execute on function public.registreer_document_upload(
  bigint, bigint, text, text, text, text, uuid, text, text, text, bigint, text, uuid
) to authenticated;

grant execute on function public.registreer_documentversie_upload(
  bigint, bigint, uuid, text, text, text, bigint, text, uuid
) to authenticated;

grant execute on function public.archiveer_document(bigint, bigint, text)
  to authenticated;
