-- 0.8A Gebruikers
-- Gebruikersprofielen blijven historisch bewaard.
-- Deactiveren vervangt fysieke verwijdering.

alter table public.profiles
  enable row level security;

drop policy if exists
  "Profiel verwijderen"
on public.profiles;

revoke delete
on public.profiles
from authenticated;

revoke all
on public.profiles
from anon;

grant select, insert, update
on public.profiles
to authenticated;
