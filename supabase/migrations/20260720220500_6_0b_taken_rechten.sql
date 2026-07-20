alter table public.taken
enable row level security;

drop policy if exists
  "Taken lezen"
on public.taken;

drop policy if exists
  "Taken toevoegen"
on public.taken;

drop policy if exists
  "Taken wijzigen"
on public.taken;

drop policy if exists
  "Taken verwijderen"
on public.taken;

create policy "Taken authenticated lezen"
on public.taken
for select
to authenticated
using (true);

create policy "Taken bevoegd toevoegen"
on public.taken
for insert
to authenticated
with check (
  public.mag_planning_beheren()
  or public.mag_administratie_beheren()
);

create policy "Taken bevoegd wijzigen"
on public.taken
for update
to authenticated
using (
  public.mag_planning_beheren()
  or public.mag_administratie_beheren()
)
with check (
  public.mag_planning_beheren()
  or public.mag_administratie_beheren()
);

revoke all
on public.taken
from anon;

grant select, insert, update
on public.taken
to authenticated;

grant usage, select
on sequence public.taken_id_seq
to authenticated;
