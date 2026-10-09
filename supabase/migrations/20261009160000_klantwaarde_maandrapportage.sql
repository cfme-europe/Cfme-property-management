-- Tweede externe maandrapportage: maximaal twee pagina's met aantoonbare CFME-meerwaarde.
-- De bestaande standaardtemplate blijft ongewijzigd en beschikbaar.

insert into public.rapporttemplates (
  code,
  naam,
  omschrijving,
  doelgroep,
  status,
  actief
)
values (
  'maandrapportage-klantwaarde',
  'Managementrapportage klant',
  'Compacte klantvariant van maximaal twee pagina''s met oplostijd, oplossingen en aantoonbare CFME-resultaten.',
  'extern',
  'concept',
  true
)
on conflict (code) do update
set
  naam = excluded.naam,
  omschrijving = excluded.omschrijving,
  doelgroep = excluded.doelgroep,
  actief = true;

insert into public.rapporttemplateversies (
  template_id,
  versienummer,
  status,
  geldig_vanaf,
  toelichting,
  configuratie
)
select
  template.id,
  1,
  'concept',
  current_date,
  'Tweepagina-klantvariant met nadruk op snelheid van oplossing en CFME-meerwaarde.',
  jsonb_build_object(
    'weergave', 'klantwaarde_2_paginas',
    'max_paginas', 2
  )
from public.rapporttemplates as template
where template.code = 'maandrapportage-klantwaarde'
on conflict (template_id, versienummer) do update
set
  toelichting = excluded.toelichting,
  configuratie = excluded.configuratie;

insert into public.rapporttemplateblokken (
  templateversie_id,
  rapportblok_id,
  volgorde,
  verplicht,
  zichtbaar,
  titel_override
)
select
  versie.id,
  blok.id,
  case blok.code
    when 'samenvatting' then 1
    when 'inspecties' then 2
    when 'meldingen' then 3
    when 'energieverbruik' then 4
    when 'opmerkingen' then 5
    else 100
  end,
  blok.code in ('samenvatting', 'inspecties', 'meldingen'),
  true,
  case blok.code
    when 'samenvatting' then 'CFME-meerwaarde in één oogopslag'
    when 'meldingen' then 'Probleem, actie en oplossing'
    else null
  end
from public.rapporttemplateversies as versie
join public.rapporttemplates as template
  on template.id = versie.template_id
join public.rapportblokken as blok
  on blok.code in (
    'samenvatting',
    'inspecties',
    'meldingen',
    'energieverbruik',
    'opmerkingen'
  )
where template.code = 'maandrapportage-klantwaarde'
  and versie.versienummer = 1
on conflict (templateversie_id, rapportblok_id) do update
set
  volgorde = excluded.volgorde,
  verplicht = excluded.verplicht,
  zichtbaar = excluded.zichtbaar,
  titel_override = excluded.titel_override;

update public.rapporttemplateversies as versie
set
  status = 'actief',
  geldig_vanaf = coalesce(versie.geldig_vanaf, current_date)
from public.rapporttemplates as template
where template.id = versie.template_id
  and template.code = 'maandrapportage-klantwaarde'
  and versie.versienummer = 1
  and versie.status <> 'actief';

update public.rapporttemplates
set
  status = 'actief',
  actief = true
where code = 'maandrapportage-klantwaarde';
