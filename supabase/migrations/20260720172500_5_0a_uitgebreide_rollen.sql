alter type public.app_role
  add value if not exists 'planner';

alter type public.app_role
  add value if not exists 'controleur';

alter type public.app_role
  add value if not exists 'administratie';

alter type public.app_role
  add value if not exists 'management';

create or replace function public.heeft_rol(
  toegestane_rollen text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.huidige_gebruiker_rol()::text =
      any(toegestane_rollen),
    false
  );
$$;

create or replace function public.mag_planning_beheren()
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
      'planner'
    ]
  );
$$;

create or replace function public.mag_controles_uitvoeren()
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
      'controleur'
    ]
  );
$$;

create or replace function public.mag_administratie_beheren()
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
      'administratie'
    ]
  );
$$;

create or replace function public.mag_rapportages_beheren()
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
      'administratie',
      'management'
    ]
  );
$$;

create or replace function public.mag_managementinformatie_lezen()
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
      'administratie',
      'management',
      'lezen'
    ]
  );
$$;

create or replace function public.mag_wijzigen()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array[
      'admin',
      'medewerker'
    ]
  );
$$;

grant execute
on function public.heeft_rol(text[])
to authenticated;

grant execute
on function public.mag_planning_beheren()
to authenticated;

grant execute
on function public.mag_controles_uitvoeren()
to authenticated;

grant execute
on function public.mag_administratie_beheren()
to authenticated;

grant execute
on function public.mag_rapportages_beheren()
to authenticated;

grant execute
on function public.mag_managementinformatie_lezen()
to authenticated;
