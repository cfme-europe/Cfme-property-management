drop policy if exists
  "Controlesessies toevoegen"
on public.controlesessies;

create policy "Controlesessies toevoegen"
on public.controlesessies
for insert
to authenticated
with check (
  public.mag_controles_uitvoeren()
);

drop policy if exists
  "Controlesessies wijzigen"
on public.controlesessies;

create policy "Controlesessies wijzigen"
on public.controlesessies
for update
to authenticated
using (
  public.mag_controles_uitvoeren()
)
with check (
  public.mag_controles_uitvoeren()
);

drop policy if exists
  "Rayons beheren"
on public.rayons;

create policy "Rayons beheren"
on public.rayons
for all
to authenticated
using (
  public.mag_planning_beheren()
)
with check (
  public.mag_planning_beheren()
);

drop policy if exists
  "Woningrayons beheren"
on public.woning_rayon_toewijzingen;

create policy "Woningrayons beheren"
on public.woning_rayon_toewijzingen
for all
to authenticated
using (
  public.mag_planning_beheren()
)
with check (
  public.mag_planning_beheren()
);
