-- Historische dubbele documentregistraties blijven als auditspoor bestaan,
-- maar worden gekoppeld aan de ene canonieke registratie en verdwijnen uit
-- de gewone actieve en gearchiveerde overzichten.

alter table public.documenten
  add column if not exists samengevoegd_met_document_id bigint
    references public.documenten(id)
    on update cascade
    on delete restrict;

alter table public.documenten
  drop constraint if exists documenten_niet_met_zichzelf_samenvoegen;

alter table public.documenten
  add constraint documenten_niet_met_zichzelf_samenvoegen
  check (
    samengevoegd_met_document_id is null
    or samengevoegd_met_document_id <> id
  );

create index if not exists documenten_samengevoegd_met_idx
  on public.documenten(samengevoegd_met_document_id)
  where samengevoegd_met_document_id is not null;

create or replace view public.documenten_overzicht
with (security_invoker = true)
as
select
  document.id,
  document.created_at,
  document.updated_at,
  document.woning_id,
  document.titel,
  document.document_type,
  document.omschrijving,
  document.status,
  document.vertrouwelijkheid,
  document.gearchiveerd_op,
  document.archiefreden,
  document.aangemaakt_door,
  document.gewijzigd_door,
  laatste.id as laatste_versie_id,
  laatste.versienummer as laatste_versienummer,
  laatste.created_at as laatste_versie_created_at,
  laatste.bestandspad as laatste_bestandspad,
  laatste.bestandsnaam as laatste_bestandsnaam,
  laatste.mime_type as laatste_mime_type,
  laatste.bestandsgrootte as laatste_bestandsgrootte,
  laatste.versie_opmerking as laatste_versie_opmerking,
  coalesce(versies.aantal, 0)::integer as aantal_versies,
  document.object_id,
  object.naam as object_naam,
  object.object_type,
  object.objectnummer,
  object.ruimte_id,
  ruimte.naam as ruimte_naam,
  document.samengevoegd_met_document_id
from public.documenten document
left join public.woning_objecten object
  on object.id = document.object_id
left join public.woning_ruimten ruimte
  on ruimte.id = object.ruimte_id
left join lateral (
  select versie.*
  from public.documentversies versie
  where versie.document_id = document.id
  order by versie.versienummer desc
  limit 1
) laatste on true
left join lateral (
  select count(*) as aantal
  from public.documentversies versie
  where versie.document_id = document.id
) versies on true;

do $$
declare
  v_aantal integer;
  v_actief integer;
  v_gearchiveerd integer;
  v_woningen integer;
  v_bestandsnamen integer;
  v_bestandsgroottes integer;
  v_mime_types integer;
  v_canoniek_document_id bigint;
begin
  select
    count(*)::integer,
    count(*) filter (where document.status = 'actief')::integer,
    count(*) filter (where document.status = 'gearchiveerd')::integer,
    count(distinct document.woning_id)::integer,
    count(distinct lower(versie.bestandsnaam))::integer,
    count(distinct versie.bestandsgrootte)::integer,
    count(distinct versie.mime_type)::integer,
    max(document.id) filter (where document.status = 'actief')
  into
    v_aantal,
    v_actief,
    v_gearchiveerd,
    v_woningen,
    v_bestandsnamen,
    v_bestandsgroottes,
    v_mime_types,
    v_canoniek_document_id
  from public.documenten document
  join lateral (
    select documentversie.*
    from public.documentversies documentversie
    where documentversie.document_id = document.id
    order by documentversie.versienummer desc
    limit 1
  ) versie on true
  where lower(btrim(document.titel)) = 'hovk'
    and lower(versie.bestandsnaam) = lower('HOVK Meerstraat 48.pdf')
    and document.created_at >= timestamptz '2026-09-15 09:38:45+00'
    and document.created_at < timestamptz '2026-09-15 09:40:00+00';

  if v_aantal <> 16
    or v_actief <> 13
    or v_gearchiveerd <> 3
    or v_woningen <> 1
    or v_bestandsnamen <> 1
    or v_bestandsgroottes <> 1
    or v_mime_types <> 1
    or v_canoniek_document_id is null then
    raise exception
      'Documentduplicaten niet samengevoegd: productiegegevens wijken af van het bewezen patroon.';
  end if;

  update public.documenten document
  set
    status = 'gearchiveerd',
    gearchiveerd_op = coalesce(document.gearchiveerd_op, now()),
    archiefreden = concat_ws(
      ' ',
      nullif(btrim(coalesce(document.archiefreden, '')), ''),
      format(
        'Dubbele uploadregistratie samengevoegd met document %s; registratie en versie zijn behouden.',
        v_canoniek_document_id
      )
    ),
    samengevoegd_met_document_id = v_canoniek_document_id
  where document.id <> v_canoniek_document_id
    and document.id in (
      select kandidaat.id
      from public.documenten kandidaat
      join lateral (
        select documentversie.*
        from public.documentversies documentversie
        where documentversie.document_id = kandidaat.id
        order by documentversie.versienummer desc
        limit 1
      ) versie on true
      where lower(btrim(kandidaat.titel)) = 'hovk'
        and lower(versie.bestandsnaam) = lower('HOVK Meerstraat 48.pdf')
        and kandidaat.created_at >= timestamptz '2026-09-15 09:38:45+00'
        and kandidaat.created_at < timestamptz '2026-09-15 09:40:00+00'
    );
end;
$$;
