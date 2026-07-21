-- 0.8B Rollen en rechten
-- Vervang onbeperkte authenticated schrijfpolicies door domeinspecifieke rollen.

create or replace function public.mag_bewoners_beheren()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array['admin', 'medewerker', 'administratie']
  );
$$;

create or replace function public.mag_meldingen_beheren()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array['admin', 'medewerker', 'controleur', 'administratie']
  );
$$;

create or replace function public.mag_workflow_schrijven()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array[
      'admin',
      'medewerker',
      'planner',
      'controleur',
      'administratie'
    ]
  );
$$;

grant execute
on function public.mag_bewoners_beheren()
to authenticated;

grant execute
on function public.mag_meldingen_beheren()
to authenticated;

grant execute
on function public.mag_workflow_schrijven()
to authenticated;

-- Bedrijven
drop policy if exists
  "bedrijven toevoegen ontwikkeling"
on public.bedrijven;

drop policy if exists
  "bedrijven wijzigen ontwikkeling"
on public.bedrijven;

create policy "Bedrijven bevoegd toevoegen"
on public.bedrijven
for insert
to authenticated
with check (public.mag_wijzigen());

create policy "Bedrijven bevoegd wijzigen"
on public.bedrijven
for update
to authenticated
using (public.mag_wijzigen())
with check (public.mag_wijzigen());

-- Woningen
drop policy if exists
  "woningen toevoegen"
on public.woningen;

create policy "Woningen bevoegd toevoegen"
on public.woningen
for insert
to authenticated
with check (public.mag_wijzigen());

-- Bewoners
drop policy if exists "Bewoners toevoegen" on public.bewoners;
drop policy if exists "Bewoners wijzigen" on public.bewoners;

create policy "Bewoners bevoegd toevoegen"
on public.bewoners
for insert
to authenticated
with check (public.mag_bewoners_beheren());

create policy "Bewoners bevoegd wijzigen"
on public.bewoners
for update
to authenticated
using (public.mag_bewoners_beheren())
with check (public.mag_bewoners_beheren());

-- Huurders
drop policy if exists "Huurders toevoegen" on public.huurders;
drop policy if exists "Huurders wijzigen" on public.huurders;

create policy "Huurders bevoegd toevoegen"
on public.huurders
for insert
to authenticated
with check (public.mag_bewoners_beheren());

create policy "Huurders bevoegd wijzigen"
on public.huurders
for update
to authenticated
using (public.mag_bewoners_beheren())
with check (public.mag_bewoners_beheren());

-- Kamers
drop policy if exists "Kamers toevoegen" on public.kamers;
drop policy if exists "Kamers wijzigen" on public.kamers;

create policy "Kamers bevoegd toevoegen"
on public.kamers
for insert
to authenticated
with check (public.mag_bewoners_beheren());

create policy "Kamers bevoegd wijzigen"
on public.kamers
for update
to authenticated
using (public.mag_bewoners_beheren())
with check (public.mag_bewoners_beheren());

-- Inspecties
drop policy if exists "Inspecties toevoegen" on public.inspecties;
drop policy if exists "Inspecties wijzigen" on public.inspecties;

create policy "Inspecties bevoegd toevoegen"
on public.inspecties
for insert
to authenticated
with check (public.mag_controles_uitvoeren());

create policy "Inspecties bevoegd wijzigen"
on public.inspecties
for update
to authenticated
using (public.mag_controles_uitvoeren())
with check (public.mag_controles_uitvoeren());

-- Meldingen
drop policy if exists "Meldingen toevoegen" on public.meldingen;
drop policy if exists "Meldingen wijzigen" on public.meldingen;

create policy "Meldingen bevoegd toevoegen"
on public.meldingen
for insert
to authenticated
with check (public.mag_meldingen_beheren());

create policy "Meldingen bevoegd wijzigen"
on public.meldingen
for update
to authenticated
using (public.mag_meldingen_beheren())
with check (public.mag_meldingen_beheren());

-- Meterstanden
drop policy if exists "Meterstanden toevoegen" on public.meterstanden;
drop policy if exists "Meterstanden wijzigen" on public.meterstanden;

create policy "Meterstanden bevoegd toevoegen"
on public.meterstanden
for insert
to authenticated
with check (public.mag_administratie_beheren());

create policy "Meterstanden bevoegd wijzigen"
on public.meterstanden
for update
to authenticated
using (public.mag_administratie_beheren())
with check (public.mag_administratie_beheren());

-- Controlebriefings
drop policy if exists
  "Controlebriefings toevoegen"
on public.controlebriefings;

drop policy if exists
  "Controlebriefings wijzigen"
on public.controlebriefings;

create policy "Controlebriefings bevoegd toevoegen"
on public.controlebriefings
for insert
to authenticated
with check (public.mag_controles_uitvoeren());

create policy "Controlebriefings bevoegd wijzigen"
on public.controlebriefings
for update
to authenticated
using (public.mag_controles_uitvoeren())
with check (public.mag_controles_uitvoeren());

-- Interne intelligence-werkpunten
drop policy if exists
  "Intelligence werkpunten wijzigen"
on public.intelligence_werkpunten;

create policy "Intelligence werkpunten bevoegd wijzigen"
on public.intelligence_werkpunten
for update
to authenticated
using (public.mag_wijzigen())
with check (
  public.mag_wijzigen()
  and intern = true
);

-- Workflow
drop policy if exists
  "Workflow acties toevoegen"
on public.workflow_acties;

drop policy if exists
  "Workflow acties wijzigen"
on public.workflow_acties;

create policy "Workflow acties bevoegd toevoegen"
on public.workflow_acties
for insert
to authenticated
with check (public.mag_workflow_schrijven());

create policy "Workflow acties bevoegd wijzigen"
on public.workflow_acties
for update
to authenticated
using (public.mag_workflow_schrijven())
with check (public.mag_workflow_schrijven());

drop policy if exists
  "Workflow gebeurtenissen toevoegen"
on public.workflow_gebeurtenissen;

drop policy if exists
  "Workflow gebeurtenissen wijzigen"
on public.workflow_gebeurtenissen;

create policy "Workflow gebeurtenissen bevoegd toevoegen"
on public.workflow_gebeurtenissen
for insert
to authenticated
with check (public.mag_workflow_schrijven());

create policy "Workflow gebeurtenissen bevoegd wijzigen"
on public.workflow_gebeurtenissen
for update
to authenticated
using (public.mag_workflow_schrijven())
with check (public.mag_workflow_schrijven());
