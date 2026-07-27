begin;

create or replace function public.geef_kamerbeschikbaarheid(
  p_woning_id bigint,
  p_verhuurperiode_id bigint
)
returns table (
  kamer_id bigint,
  woning_id bigint,
  naam text,
  verdieping text,
  capaciteit integer,
  actuele_bezetting bigint,
  vrije_plaatsen bigint,
  actief boolean,
  beschikbaar boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select
    kamer.id as kamer_id,
    kamer.woning_id,
    kamer.naam,
    kamer.verdieping,
    kamer.capaciteit,
    count(bewoner.id) filter (
      where bewoner.status = 'actief'
        and bewoner.uitcheckdatum is null
        and bewoner.verhuurperiode_id = p_verhuurperiode_id
    ) as actuele_bezetting,
    greatest(
      kamer.capaciteit::bigint -
      count(bewoner.id) filter (
        where bewoner.status = 'actief'
          and bewoner.uitcheckdatum is null
          and bewoner.verhuurperiode_id = p_verhuurperiode_id
      ),
      0
    ) as vrije_plaatsen,
    kamer.actief,
    (
      kamer.actief
      and count(bewoner.id) filter (
        where bewoner.status = 'actief'
          and bewoner.uitcheckdatum is null
          and bewoner.verhuurperiode_id = p_verhuurperiode_id
      ) < kamer.capaciteit
    ) as beschikbaar
  from public.kamers kamer
  left join public.bewoners bewoner
    on bewoner.kamer_id = kamer.id
  where kamer.woning_id = p_woning_id
  group by
    kamer.id,
    kamer.woning_id,
    kamer.naam,
    kamer.verdieping,
    kamer.capaciteit,
    kamer.actief
  order by
    kamer.actief desc,
    kamer.verdieping nulls last,
    kamer.naam,
    kamer.id;
$$;

revoke all
on function public.geef_kamerbeschikbaarheid(bigint, bigint)
from public, anon;

grant execute
on function public.geef_kamerbeschikbaarheid(bigint, bigint)
to authenticated, service_role;

create or replace function public.verhuis_bewoner_atomair(
  p_bewoner_id bigint,
  p_verhuurperiode_id bigint,
  p_nieuwe_kamer_id bigint
)
returns public.bewoners
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_bewoner public.bewoners%rowtype;
  v_nieuwe_kamer public.kamers%rowtype;
  v_huidige_woning_id bigint;
  v_nieuwe_bezetting integer;
begin
  if not public.mag_bewoners_beheren() then
    raise exception
      'Onvoldoende rechten om bewoners te verhuizen.';
  end if;

  if p_bewoner_id is null or p_bewoner_id <= 0 then
    raise exception 'Ongeldige bewoner.';
  end if;

  if p_verhuurperiode_id is null
    or p_verhuurperiode_id <= 0
  then
    raise exception 'Ongeldige verhuurperiode.';
  end if;

  if p_nieuwe_kamer_id is null
    or p_nieuwe_kamer_id <= 0
  then
    raise exception 'Ongeldige nieuwe kamer.';
  end if;

  select bewoner.*
  into v_bewoner
  from public.bewoners bewoner
  where bewoner.id = p_bewoner_id
    and bewoner.verhuurperiode_id = p_verhuurperiode_id
  for update;

  if v_bewoner.id is null then
    raise exception
      'Bewoner niet gevonden binnen deze verhuurperiode.';
  end if;

  if v_bewoner.status <> 'actief'
    or v_bewoner.uitcheckdatum is not null
  then
    raise exception
      'Alleen een actieve bewoner kan worden verhuisd.';
  end if;

  if v_bewoner.kamer_id is null then
    raise exception
      'De huidige kamer van de bewoner is niet vastgesteld.';
  end if;

  if v_bewoner.kamer_id = p_nieuwe_kamer_id then
    raise exception
      'De bewoner verblijft al in deze kamer.';
  end if;

  select periode.woning_id
  into v_huidige_woning_id
  from public.verhuurperiodes periode
  where periode.id = p_verhuurperiode_id
    and periode.status = 'actief';

  if v_huidige_woning_id is null then
    raise exception
      'De verhuurperiode is niet actief.';
  end if;

  select kamer.*
  into v_nieuwe_kamer
  from public.kamers kamer
  where kamer.id = p_nieuwe_kamer_id
    and kamer.woning_id = v_huidige_woning_id
    and kamer.actief
  for update;

  if v_nieuwe_kamer.id is null then
    raise exception
      'De geselecteerde kamer hoort niet bij deze woning of is niet actief.';
  end if;

  select count(*)::integer
  into v_nieuwe_bezetting
  from public.bewoners bewoner
  where bewoner.verhuurperiode_id = p_verhuurperiode_id
    and bewoner.kamer_id = p_nieuwe_kamer_id
    and bewoner.status = 'actief'
    and bewoner.uitcheckdatum is null
    and bewoner.id <> p_bewoner_id;

  if v_nieuwe_bezetting >= v_nieuwe_kamer.capaciteit then
    raise exception
      'De geselecteerde kamer heeft geen vrije plaats.';
  end if;

  update public.bewoners
  set kamer_id = p_nieuwe_kamer_id
  where id = p_bewoner_id
  returning *
  into v_bewoner;

  return v_bewoner;
end;
$$;

revoke all
on function public.verhuis_bewoner_atomair(bigint, bigint, bigint)
from public, anon;

grant execute
on function public.verhuis_bewoner_atomair(bigint, bigint, bigint)
to authenticated, service_role;

comment on function public.geef_kamerbeschikbaarheid(bigint, bigint)
is
  'Occupancy Intelligence 9.0D: geeft per kamer capaciteit, actuele bezetting, vrije plaatsen en beschikbaarheid.';

comment on function public.verhuis_bewoner_atomair(bigint, bigint, bigint)
is
  'Occupancy Intelligence 9.0D: verhuist een actieve bewoner transactioneel naar een beschikbare kamer binnen dezelfde woning.';

commit;
