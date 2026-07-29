-- CFME Control
-- Meldingen zijn bewijsrecords en mogen niet fysiek worden verwijderd.
-- Afsluiten gebeurt via status 'opgelost', oplosdatum en oplossing.

do $$
declare
  beleid record;
begin
  for beleid in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'meldingen'
      and cmd = 'DELETE'
  loop
    execute format(
      'drop policy if exists %I on public.meldingen',
      beleid.policyname
    );
  end loop;
end;
$$;

revoke delete
on public.meldingen
from public, anon, authenticated;
