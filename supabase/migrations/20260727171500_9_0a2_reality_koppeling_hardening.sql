begin;

revoke all
on function public.synchroniseer_slaapkamer_kamer()
from public, anon;

grant execute
on function public.synchroniseer_slaapkamer_kamer()
to authenticated, service_role;

do $$
begin
  if exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.ruimte_type = 'slaapkamer'
      and ruimte.kamer_id is null
  ) then
    raise exception
      'Reality Engine-controle mislukt: er bestaan slaapkamers zonder bewonerskamer.';
  end if;

  if exists (
    select ruimte.kamer_id
    from public.woning_ruimten ruimte
    where ruimte.kamer_id is not null
    group by ruimte.kamer_id
    having count(*) > 1
  ) then
    raise exception
      'Reality Engine-controle mislukt: een bewonerskamer is aan meerdere fysieke ruimtes gekoppeld.';
  end if;

  if exists (
    select 1
    from public.woning_ruimten ruimte
    join public.kamers kamer
      on kamer.id = ruimte.kamer_id
    where kamer.woning_id <> ruimte.woning_id
  ) then
    raise exception
      'Reality Engine-controle mislukt: een kamer is aan een ruimte van een andere woning gekoppeld.';
  end if;

  if exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.ruimte_type <> 'slaapkamer'
      and ruimte.kamer_id is not null
  ) then
    raise exception
      'Reality Engine-controle mislukt: een niet-slaapkamer heeft nog een bewonerskamerkoppeling.';
  end if;
end;
$$;

comment on function public.synchroniseer_slaapkamer_kamer()
is
  'Reality Engine: uitsluitend bevoegde gebruikers synchroniseren een fysieke slaapkamer met precies één bewonerskamer.';

commit;