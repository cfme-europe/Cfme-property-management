-- 0.8B Rollen en rechten
-- Verwijder anon uit bestaande RLS-policies.
-- Verwijder fysieke DELETE-policies uit de applicatielaag.

do $$
declare
  beleid record;
begin
  for beleid in
    select
      schemaname,
      tablename,
      policyname,
      cmd
    from pg_policies
    where schemaname = 'public'
      and 'anon' = any(roles)
  loop
    if beleid.cmd = 'DELETE' then
      execute format(
        'drop policy if exists %I on %I.%I',
        beleid.policyname,
        beleid.schemaname,
        beleid.tablename
      );
    else
      execute format(
        'alter policy %I on %I.%I to authenticated',
        beleid.policyname,
        beleid.schemaname,
        beleid.tablename
      );
    end if;
  end loop;
end
$$;

-- Ook uitsluitend authenticated DELETE-policies verwijderen.
do $$
declare
  beleid record;
begin
  for beleid in
    select
      schemaname,
      tablename,
      policyname
    from pg_policies
    where schemaname = 'public'
      and cmd = 'DELETE'
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      beleid.policyname,
      beleid.schemaname,
      beleid.tablename
    );
  end loop;
end
$$;
