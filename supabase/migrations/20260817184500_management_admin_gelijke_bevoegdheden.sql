begin;

create or replace function public.mag_gebruikers_beheren()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array['admin', 'management']
  );
$$;

revoke all
on function public.mag_gebruikers_beheren()
from public;

grant execute
on function public.mag_gebruikers_beheren()
to authenticated, service_role;

grant select, update
on table public.profiles
to authenticated;

drop policy if exists
  profiles_admin_management_select
on public.profiles;

create policy
  profiles_admin_management_select
on public.profiles
for select
to authenticated
using (
  public.mag_gebruikers_beheren()
);

drop policy if exists
  profiles_admin_management_update
on public.profiles;

create policy
  profiles_admin_management_update
on public.profiles
for update
to authenticated
using (
  public.mag_gebruikers_beheren()
)
with check (
  public.mag_gebruikers_beheren()
);

commit;
