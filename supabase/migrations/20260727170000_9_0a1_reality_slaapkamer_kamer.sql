begin;

create or replace function public.synchroniseer_slaapkamer_kamer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_verdieping text;
  v_kamer_id bigint;
  v_actieve_bewoners integer;
begin
  if new.verdieping_id is not null then
    select verdieping.naam
    into v_verdieping
    from public.woning_verdiepingen verdieping
    where verdieping.id = new.verdieping_id
      and verdieping.woning_id = new.woning_id;

    if v_verdieping is null then
      raise exception
        'De verdieping hoort niet bij deze woning.';
    end if;
  else
    v_verdieping := null;
  end if;

  if new.ruimte_type = 'slaapkamer' then
    if new.kamer_id is not null then
      select kamer.id
      into v_kamer_id
      from public.kamers kamer
      where kamer.id = new.kamer_id
        and kamer.woning_id = new.woning_id
      for update;

      if v_kamer_id is null then
        raise exception
          'De gekoppelde bewonerskamer hoort niet bij deze woning.';
      end if;
    else
      select kamer.id
      into v_kamer_id
      from public.kamers kamer
      where kamer.woning_id = new.woning_id
        and lower(trim(kamer.naam)) = lower(trim(new.naam))
      order by kamer.actief desc, kamer.id
      limit 1
      for update;

      if v_kamer_id is null then
        insert into public.kamers (
          woning_id,
          naam,
          verdieping,
          capaciteit,
          actief,
          opmerkingen
        )
        values (
          new.woning_id,
          trim(new.naam),
          v_verdieping,
          1,
          new.actief,
          'Automatisch beheerd vanuit de fysieke woningroute.'
        )
        returning id into v_kamer_id;
      end if;

      new.kamer_id := v_kamer_id;
    end if;

    if new.actief = false then
      select count(*)::integer
      into v_actieve_bewoners
      from public.bewoners bewoner
      where bewoner.kamer_id = v_kamer_id
        and bewoner.status = 'actief';

      if v_actieve_bewoners > 0 then
        raise exception
          'Deze slaapkamer kan niet worden gedeactiveerd omdat er nog actieve bewoners aan gekoppeld zijn.';
      end if;
    end if;

    update public.kamers
    set
      naam = trim(new.naam),
      verdieping = v_verdieping,
      actief = new.actief,
      opmerkingen = case
        when opmerkingen is null
          or opmerkingen = ''
          or opmerkingen = 'Automatisch beheerd vanuit de fysieke woningroute.'
        then 'Automatisch beheerd vanuit de fysieke woningroute.'
        else opmerkingen
      end
    where id = v_kamer_id;

    new.kamer_id := v_kamer_id;
  elsif new.kamer_id is not null then
    select count(*)::integer
    into v_actieve_bewoners
    from public.bewoners bewoner
    where bewoner.kamer_id = new.kamer_id
      and bewoner.status = 'actief';

    if v_actieve_bewoners > 0 then
      raise exception
        'Deze ruimte kan niet worden gewijzigd omdat de gekoppelde kamer nog actieve bewoners heeft.';
    end if;

    update public.kamers
    set actief = false
    where id = new.kamer_id
      and woning_id = new.woning_id;

    new.kamer_id := null;
  end if;

  if tg_op = 'UPDATE'
    and old.kamer_id is not null
    and old.kamer_id is distinct from new.kamer_id
  then
    select count(*)::integer
    into v_actieve_bewoners
    from public.bewoners bewoner
    where bewoner.kamer_id = old.kamer_id
      and bewoner.status = 'actief';

    if v_actieve_bewoners > 0 then
      raise exception
        'De bestaande bewonerskamer kan niet worden ontkoppeld omdat er nog actieve bewoners zijn.';
    end if;

    update public.kamers
    set actief = false
    where id = old.kamer_id
      and woning_id = old.woning_id;
  end if;

  return new;
end;
$$;

revoke all
on function public.synchroniseer_slaapkamer_kamer()
from public;

grant execute
on function public.synchroniseer_slaapkamer_kamer()
to authenticated, service_role;

drop trigger if exists
a_woning_ruimten_slaapkamer_kamer_sync
on public.woning_ruimten;

with dubbele_koppelingen as (
  select
    ruimte.id,
    row_number() over (
      partition by ruimte.kamer_id
      order by ruimte.actief desc, ruimte.id
    ) as volgnummer
  from public.woning_ruimten ruimte
  where ruimte.kamer_id is not null
)
update public.woning_ruimten ruimte
set kamer_id = null
from dubbele_koppelingen dubbel
where dubbel.id = ruimte.id
  and dubbel.volgnummer > 1;

create unique index if not exists
woning_ruimten_kamer_uniek_idx
on public.woning_ruimten (kamer_id)
where kamer_id is not null;

create trigger
a_woning_ruimten_slaapkamer_kamer_sync
before insert or update of
  woning_id,
  verdieping_id,
  kamer_id,
  naam,
  ruimte_type,
  actief
on public.woning_ruimten
for each row
execute function public.synchroniseer_slaapkamer_kamer();

update public.woning_ruimten
set
  naam = naam,
  updated_at = updated_at
where ruimte_type = 'slaapkamer';

do $$
begin
  if exists (
    select 1
    from public.woning_ruimten ruimte
    where ruimte.ruimte_type = 'slaapkamer'
      and ruimte.kamer_id is null
  ) then
    raise exception
      'Niet alle slaapkamers konden automatisch aan een bewonerskamer worden gekoppeld.';
  end if;

  if exists (
    select ruimte.kamer_id
    from public.woning_ruimten ruimte
    where ruimte.kamer_id is not null
    group by ruimte.kamer_id
    having count(*) > 1
  ) then
    raise exception
      'Een bewonerskamer is nog aan meerdere fysieke ruimtes gekoppeld.';
  end if;
end;
$$;

comment on function public.synchroniseer_slaapkamer_kamer()
is
  'Reality Engine: synchroniseert een fysieke slaapkamer automatisch met precies één bewonerskamer en voorkomt dubbele invoer.';

comment on index public.woning_ruimten_kamer_uniek_idx
is
  'Garandeert dat een bewonerskamer aan maximaal één fysieke woningruimte is gekoppeld.';

commit;