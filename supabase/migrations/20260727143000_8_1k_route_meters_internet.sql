-- CFME Control 8.1K
-- Meterstanden en internetvoorzieningen als minimale routehandelingen.

insert into public.controlepunt_definities (
  code,
  naam,
  omschrijving,
  categorie,
  standaard_ruimte_type,
  standaard_object_type,
  invoertype,
  actief,
  foto_verplicht_bij_afwijking,
  toelichting_verplicht_bij_afwijking,
  melding_maken_bij_afwijking,
  taak_maken_bij_afwijking,
  standaard_prioriteit
)
values
  (
    'METER_DAGSTROOM',
    'Dagstroomstand opnemen',
    'Vul de actuele cumulatieve dagstroomstand in.',
    'energie',
    null,
    'elektriciteitsmeter_dag',
    'getal',
    true,
    false,
    false,
    false,
    false,
    'normaal'
  ),
  (
    'METER_NACHTSTROOM',
    'Nachtstroomstand opnemen',
    'Vul de actuele cumulatieve nachtstroomstand in.',
    'energie',
    null,
    'elektriciteitsmeter_nacht',
    'getal',
    true,
    false,
    false,
    false,
    false,
    'normaal'
  ),
  (
    'METER_GAS',
    'Gasstand opnemen',
    'Vul de actuele cumulatieve gasstand in.',
    'energie',
    null,
    'gasmeter',
    'getal',
    true,
    false,
    false,
    false,
    false,
    'normaal'
  ),
  (
    'METER_WATER',
    'Waterstand opnemen',
    'Vul de actuele cumulatieve waterstand in.',
    'energie',
    null,
    'watermeter',
    'getal',
    true,
    false,
    false,
    false,
    false,
    'normaal'
  ),
  (
    'INTERNET_WERKING',
    'Werking internetvoorziening',
    'Controleer of de internetvoorziening normaal functioneert.',
    'installatie',
    null,
    'internetvoorziening',
    'beoordeling',
    true,
    false,
    true,
    true,
    true,
    'hoog'
  )
on conflict (code) do update
set
  naam = excluded.naam,
  omschrijving = excluded.omschrijving,
  categorie = excluded.categorie,
  standaard_object_type = excluded.standaard_object_type,
  invoertype = excluded.invoertype,
  actief = true,
  foto_verplicht_bij_afwijking =
    excluded.foto_verplicht_bij_afwijking,
  toelichting_verplicht_bij_afwijking =
    excluded.toelichting_verplicht_bij_afwijking,
  melding_maken_bij_afwijking =
    excluded.melding_maken_bij_afwijking,
  taak_maken_bij_afwijking =
    excluded.taak_maken_bij_afwijking,
  standaard_prioriteit =
    excluded.standaard_prioriteit;

drop policy if exists
  "Meterstanden bevoegd toevoegen"
on public.meterstanden;

drop policy if exists
  "Meterstanden bevoegd wijzigen"
on public.meterstanden;

create policy
  "Meterstanden bevoegd toevoegen"
on public.meterstanden
for insert
to authenticated
with check (
  public.mag_administratie_beheren()
  or public.mag_controles_uitvoeren()
);

create policy
  "Meterstanden bevoegd wijzigen"
on public.meterstanden
for update
to authenticated
using (
  public.mag_administratie_beheren()
  or public.mag_controles_uitvoeren()
)
with check (
  public.mag_administratie_beheren()
  or public.mag_controles_uitvoeren()
);

revoke all privileges
on public.meterstanden
from anon;

revoke delete
on public.meterstanden
from authenticated;

grant select, insert, update
on public.meterstanden
to authenticated;
