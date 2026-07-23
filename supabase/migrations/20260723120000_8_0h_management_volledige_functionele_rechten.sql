-- Management krijgt alle functionele rechten van medewerker, planner,
-- controleur en administratie. Exclusieve adminrechten blijven ongewijzigd.

create or replace function public.mag_planning_beheren()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array['admin', 'medewerker', 'planner', 'management']
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
    array['admin', 'medewerker', 'controleur', 'management']
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
    array['admin', 'medewerker', 'administratie', 'management']
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
    array['admin', 'medewerker', 'management']
  );
$$;

create or replace function public.mag_bewoners_beheren()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.heeft_rol(
    array['admin', 'medewerker', 'administratie', 'management']
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
    array['admin', 'medewerker', 'controleur', 'administratie', 'management']
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
    array['admin', 'medewerker', 'planner', 'controleur', 'administratie', 'management']
  );
$$;
