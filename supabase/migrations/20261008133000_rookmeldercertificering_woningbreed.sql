-- Eén actieve rookmeldercertificering geldt voor alle rookmelders
-- binnen dezelfde woning. Oudere dubbele registraties blijven als
-- ingetrokken historie behouden.

alter table public.certificeringen
  disable trigger certificeringen_compliance_synchronisatie;

with gerangschikt as (
  select
    certificering.id,
    row_number() over (
      partition by certificering.woning_id
      order by
        certificering.keuringsdatum desc,
        certificering.geldig_tot desc,
        certificering.created_at desc,
        certificering.id desc
    ) as rang,
    first_value(certificering.keuringsdatum) over (
      partition by certificering.woning_id
      order by
        certificering.keuringsdatum desc,
        certificering.geldig_tot desc,
        certificering.created_at desc,
        certificering.id desc
    ) as vervangingsdatum
  from public.certificeringen certificering
  where certificering.type = 'rookmelder'
    and certificering.actief = true
)
update public.certificeringen certificering
set
  actief = false,
  ingetrokken_op = coalesce(
    certificering.ingetrokken_op,
    gerangschikt.vervangingsdatum
  ),
  reden_inhouding = coalesce(
    nullif(trim(certificering.reden_inhouding), ''),
    'Vervangen door de actuele woningbrede rookmeldercertificering.'
  )
from gerangschikt
where certificering.id = gerangschikt.id
  and gerangschikt.rang > 1;

update public.certificeringen
set object_id = null
where type = 'rookmelder'
  and actief = true
  and object_id is not null;

drop index if exists
  public.certificeringen_een_actieve_per_object_idx;

with gerangschikte_brandblussercertificeringen as (
  select
    certificering.id,
    row_number() over (
      partition by certificering.object_id
      order by
        certificering.keuringsdatum desc,
        certificering.geldig_tot desc,
        certificering.created_at desc,
        certificering.id desc
    ) as rang,
    first_value(certificering.keuringsdatum) over (
      partition by certificering.object_id
      order by
        certificering.keuringsdatum desc,
        certificering.geldig_tot desc,
        certificering.created_at desc,
        certificering.id desc
    ) as vervangingsdatum
  from public.certificeringen certificering
  where certificering.type = 'brandblusser'
    and certificering.actief = true
    and certificering.object_id is not null
)
update public.certificeringen certificering
set
  actief = false,
  ingetrokken_op = coalesce(
    certificering.ingetrokken_op,
    gerangschikt.vervangingsdatum
  ),
  reden_inhouding = coalesce(
    nullif(trim(certificering.reden_inhouding), ''),
    'Vervangen door de actuele keuring van deze brandblusser.'
  )
from gerangschikte_brandblussercertificeringen gerangschikt
where certificering.id = gerangschikt.id
  and gerangschikt.rang > 1;

create unique index if not exists
  certificeringen_een_actieve_brandblusser_per_object_idx
on public.certificeringen (object_id)
where actief = true
  and type = 'brandblusser'
  and object_id is not null;

create unique index if not exists
  certificeringen_een_actieve_per_object_idx
on public.certificeringen (
  woning_id,
  type,
  coalesce(installatie_omschrijving, '')
)
where actief = true
  and type not in ('rookmelder', 'brandblusser');

create unique index if not exists
  certificeringen_een_actieve_rookmelder_per_woning_idx
on public.certificeringen (woning_id)
where actief = true
  and type = 'rookmelder';

create or replace view public.object_compliance_overzicht
with (security_invoker = true)
as
select
  object.id as object_id,
  object.woning_id,
  object.ruimte_id,
  ruimte.naam as ruimte_naam,
  object.object_type,
  object.naam as object_naam,
  object.objectnummer,
  object.merk,
  object.model,
  object.serienummer,

  verplichting.id as verplichting_id,
  verplichting.naam as verplichting_naam,
  verplichting.omschrijving as verplichting_omschrijving,
  verplichting.verplichting_type,
  verplichting.certificering_type,
  verplichting.document_type,
  verplichting.waarschuwingsdagen,
  verplichting.verplicht,

  certificering.id as certificering_id,
  certificering.geldig_tot,
  certificering.actief as certificering_actief,
  certificering.compliance_status
    as certificering_status,

  document.id as document_id,
  document.status as document_status,
  document.laatste_versie_id,
  document.laatste_versie_created_at,

  case
    when verplichting.verplichting_type = 'certificering'
      and certificering.id is null
      then 'ontbreekt'

    when verplichting.verplichting_type = 'certificering'
      and certificering.compliance_status = 'verlopen'
      then 'verlopen'

    when verplichting.verplichting_type = 'certificering'
      and certificering.compliance_status = 'verloopt_binnenkort'
      then 'waarschuwing'

    when verplichting.verplichting_type = 'certificering'
      and certificering.compliance_status = 'ingetrokken'
      then 'ontbreekt'

    when verplichting.verplichting_type = 'certificering'
      and certificering.compliance_status = 'geldig'
      then 'compliant'

    when verplichting.verplichting_type = 'document'
      and document.id is null
      then 'ontbreekt'

    when verplichting.verplichting_type = 'document'
      and document.status = 'gearchiveerd'
      then 'ontbreekt'

    when verplichting.verplichting_type = 'document'
      and document.laatste_versie_id is null
      then 'onvolledig'

    when verplichting.verplichting_type = 'document'
      then 'compliant'

    else 'onbekend'
  end as compliance_status,

  case
    when verplichting.verplichting_type = 'certificering'
      then certificering.geldig_tot - current_date
    else null
  end as resterende_dagen

from public.woning_objecten object
join public.woning_ruimten ruimte
  on ruimte.id = object.ruimte_id
join public.objecttype_compliance_verplichtingen verplichting
  on verplichting.object_type = object.object_type
  and verplichting.actief = true
  and verplichting.verplicht = true

left join lateral (
  select overzicht.*
  from public.certificeringen_overzicht overzicht
  where overzicht.type = verplichting.certificering_type
    and (
      (
        verplichting.certificering_type = 'rookmelder'
        and overzicht.woning_id = object.woning_id
      )
      or
      (
        verplichting.certificering_type <> 'rookmelder'
        and overzicht.object_id = object.id
      )
    )
  order by
    overzicht.actief desc,
    overzicht.keuringsdatum desc,
    overzicht.geldig_tot desc,
    overzicht.id desc
  limit 1
) certificering
  on verplichting.verplichting_type = 'certificering'

left join lateral (
  select overzicht.*
  from public.documenten_overzicht overzicht
  where overzicht.object_id = object.id
    and overzicht.document_type = verplichting.document_type
  order by
    (overzicht.status = 'actief') desc,
    overzicht.updated_at desc,
    overzicht.id desc
  limit 1
) document
  on verplichting.verplichting_type = 'document'

where object.actief = true;

comment on index
  public.certificeringen_een_actieve_rookmelder_per_woning_idx
is
  'Borgt dat het aantal rookmelders geen extra actieve certificeringen vereist.';

comment on index
  public.certificeringen_een_actieve_brandblusser_per_object_idx
is
  'Staat per afzonderlijk woningobject, waaronder iedere brandblusser, één actieve certificering van hetzelfde type toe.';

alter table public.certificeringen
  enable trigger certificeringen_compliance_synchronisatie;

do $$
declare
  woning record;
begin
  for woning in
    select distinct certificering.woning_id
    from public.certificeringen certificering
    where certificering.type = 'rookmelder'
  loop
    perform public.synchroniseer_compliance_voor_woning(
      woning.woning_id
    );
  end loop;
end;
$$;
