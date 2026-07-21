drop policy if exists "Maandrapportages lezen"
  on public.maandrapportages;

drop policy if exists "Maandrapportages toevoegen"
  on public.maandrapportages;

drop policy if exists "Maandrapportages wijzigen"
  on public.maandrapportages;

drop policy if exists "Maandrapportages verwijderen"
  on public.maandrapportages;

revoke all
on table public.maandrapportages
from anon;

revoke all
on table public.maandrapportages
from authenticated;

grant select, insert, update
on table public.maandrapportages
to authenticated;

create policy "Maandrapportages authenticated lezen"
on public.maandrapportages
for select
to authenticated
using (true);

create policy "Maandrapportages bevoegd toevoegen"
on public.maandrapportages
for insert
to authenticated
with check (
  public.mag_rapportages_beheren()
);

create policy "Maandrapportages bevoegd wijzigen"
on public.maandrapportages
for update
to authenticated
using (
  public.mag_rapportages_beheren()
)
with check (
  public.mag_rapportages_beheren()
);
