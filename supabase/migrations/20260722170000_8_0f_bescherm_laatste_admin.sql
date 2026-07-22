create or replace function public.bescherm_laatste_actieve_admin()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if
    old.rol = 'admin'
    and old.actief = true
    and (
      new.rol <> 'admin'
      or new.actief = false
    )
    and (
      select count(*)
      from public.profiles
      where rol = 'admin'
        and actief = true
        and id <> old.id
    ) = 0
  then
    raise exception
      'De laatste actieve admin kan niet worden gedeactiveerd of van rol worden gewijzigd.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_bescherm_laatste_admin
on public.profiles;

create trigger profiles_bescherm_laatste_admin
before update of rol, actief
on public.profiles
for each row
execute function public.bescherm_laatste_actieve_admin();
