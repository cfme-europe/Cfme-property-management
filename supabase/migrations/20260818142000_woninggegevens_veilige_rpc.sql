begin;

create or replace function public.corrigeer_woninggegevens(
  p_woning_id bigint,
  p_adres text,
  p_postcode text,
  p_plaats text
)
returns public.woningen
language plpgsql
security definer
set search_path = public
as $$
declare
  v_woning public.woningen;
begin
  if not public.mag_wijzigen() then
    raise exception
      'Onvoldoende rechten om woninggegevens te wijzigen.';
  end if;

  if p_woning_id is null or p_woning_id <= 0 then
    raise exception 'Ongeldige woning.';
  end if;

  if nullif(trim(p_adres), '') is null
     or nullif(trim(p_postcode), '') is null
     or nullif(trim(p_plaats), '') is null then
    raise exception
      'Adres, postcode en plaats zijn verplicht.';
  end if;

  update public.woningen
  set
    adres = trim(p_adres),
    postcode = upper(trim(p_postcode)),
    plaats = trim(p_plaats)
  where id = p_woning_id
  returning * into v_woning;

  if v_woning.id is null then
    raise exception 'Woning niet gevonden.';
  end if;

  return v_woning;
end;
$$;

revoke all
on function public.corrigeer_woninggegevens(
  bigint,
  text,
  text,
  text
)
from public;

grant execute
on function public.corrigeer_woninggegevens(
  bigint,
  text,
  text,
  text
)
to authenticated;

commit;
