drop policy if exists
  "Rapportblokken authenticated toevoegen"
on public.rapportblokken;

create policy "Rapportblokken authenticated toevoegen"
on public.rapportblokken
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapportblokken authenticated wijzigen"
on public.rapportblokken;

create policy "Rapportblokken authenticated wijzigen"
on public.rapportblokken
for update
to authenticated
using (
  public.mag_rapportages_beheren()
)
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplates authenticated toevoegen"
on public.rapporttemplates;

create policy "Rapporttemplates authenticated toevoegen"
on public.rapporttemplates
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplates authenticated wijzigen"
on public.rapporttemplates;

create policy "Rapporttemplates authenticated wijzigen"
on public.rapporttemplates
for update
to authenticated
using (
  public.mag_rapportages_beheren()
)
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplateversies authenticated toevoegen"
on public.rapporttemplateversies;

create policy "Rapporttemplateversies authenticated toevoegen"
on public.rapporttemplateversies
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplateversies authenticated wijzigen"
on public.rapporttemplateversies;

create policy "Rapporttemplateversies authenticated wijzigen"
on public.rapporttemplateversies
for update
to authenticated
using (
  public.mag_rapportages_beheren()
)
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplateblokken authenticated toevoegen"
on public.rapporttemplateblokken;

create policy "Rapporttemplateblokken authenticated toevoegen"
on public.rapporttemplateblokken
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapporttemplateblokken authenticated wijzigen"
on public.rapporttemplateblokken;

create policy "Rapporttemplateblokken authenticated wijzigen"
on public.rapporttemplateblokken
for update
to authenticated
using (
  public.mag_rapportages_beheren()
)
with check (
  public.mag_rapportages_beheren()
);

drop policy if exists
  "Rapportexports authenticated toevoegen"
on public.rapportexports;

create policy "Rapportexports authenticated toevoegen"
on public.rapportexports
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
  and gegenereerd_door = auth.uid()
);

drop policy if exists
  "Rapportexports authenticated wijzigen"
on public.rapportexports;

create policy "Rapportexports authenticated wijzigen"
on public.rapportexports
for update
to authenticated
using (
  public.mag_rapportages_beheren()
  and gegenereerd_door = auth.uid()
)
with check (
  public.mag_rapportages_beheren()
  and gegenereerd_door = auth.uid()
);
