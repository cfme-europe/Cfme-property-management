-- CFME Control 8.1J
-- Beveiligd beheer van verhuurperiodes voor bevoegde medewerkers.

alter table public.verhuurperiodes
  enable row level security;

drop policy if exists
  "Verhuurperiodes authenticated lezen"
on public.verhuurperiodes;

drop policy if exists
  "Verhuurperiodes bevoegd toevoegen"
on public.verhuurperiodes;

drop policy if exists
  "Verhuurperiodes bevoegd wijzigen"
on public.verhuurperiodes;

create policy
  "Verhuurperiodes authenticated lezen"
on public.verhuurperiodes
for select
to authenticated
using (true);

create policy
  "Verhuurperiodes bevoegd toevoegen"
on public.verhuurperiodes
for insert
to authenticated
with check (
  public.mag_administratie_beheren()
);

create policy
  "Verhuurperiodes bevoegd wijzigen"
on public.verhuurperiodes
for update
to authenticated
using (
  public.mag_administratie_beheren()
)
with check (
  public.mag_administratie_beheren()
);

revoke all privileges
on public.verhuurperiodes
from anon;

revoke delete
on public.verhuurperiodes
from authenticated;

grant select, insert, update
on public.verhuurperiodes
to authenticated;

grant usage, select
on sequence public.verhuurperiodes_id_seq
to authenticated;
