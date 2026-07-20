create or replace function public.activeer_rapporttemplateversie(
  p_templateversie_id bigint
)
returns public.rapporttemplateversies
language plpgsql
security invoker
set search_path = public
as $$
declare
  doelversie public.rapporttemplateversies;
begin
  if p_templateversie_id is null
    or p_templateversie_id <= 0
  then
    raise exception
      'Ongeldige rapporttemplateversie.';
  end if;

  select *
  into doelversie
  from public.rapporttemplateversies
  where id = p_templateversie_id
  for update;

  if not found then
    raise exception
      'Rapporttemplateversie niet gevonden.';
  end if;

  if doelversie.status <> 'concept' then
    raise exception
      'Alleen een conceptversie kan worden geactiveerd.';
  end if;

  update public.rapporttemplateversies
  set status = 'vervallen'
  where template_id = doelversie.template_id
    and status = 'actief';

  update public.rapporttemplateversies
  set
    status = 'actief',
    geldig_vanaf = coalesce(
      geldig_vanaf,
      current_date
    )
  where id = doelversie.id
  returning *
  into doelversie;

  update public.rapporttemplates
  set
    status = 'actief',
    actief = true
  where id = doelversie.template_id;

  return doelversie;
end;
$$;

grant execute
on function public.activeer_rapporttemplateversie(bigint)
to authenticated;
