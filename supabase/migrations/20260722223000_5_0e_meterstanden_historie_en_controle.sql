alter table public.meterstanden
enable row level security;

drop policy if exists "Meterstanden lezen"
on public.meterstanden;

drop policy if exists "Meterstanden toevoegen"
on public.meterstanden;

drop policy if exists "Meterstanden wijzigen"
on public.meterstanden;

drop policy if exists "Meterstanden verwijderen"
on public.meterstanden;

drop policy if exists "Meterstanden bevoegd toevoegen"
on public.meterstanden;

drop policy if exists "Meterstanden bevoegd wijzigen"
on public.meterstanden;

create policy "Meterstanden authenticated lezen"
on public.meterstanden
for select
to authenticated
using (true);

create policy "Meterstanden bevoegd toevoegen"
on public.meterstanden
for insert
to authenticated
with check (
  public.mag_administratie_beheren()
);

create policy "Meterstanden bevoegd wijzigen"
on public.meterstanden
for update
to authenticated
using (
  public.mag_administratie_beheren()
)
with check (
  public.mag_administratie_beheren()
);

revoke all
on public.meterstanden
from anon;

revoke delete
on public.meterstanden
from authenticated;

grant select, insert, update
on public.meterstanden
to authenticated;

grant usage, select
on sequence public.meterstanden_id_seq
to authenticated;

create or replace function public.controleer_oplopende_meterstanden()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_vorige numeric;
  v_volgende numeric;
begin
  if new.elektriciteit_kwh is not null then
    select m.elektriciteit_kwh
    into v_vorige
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum < new.opnamedatum
      and m.elektriciteit_kwh is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum desc
    limit 1;

    if v_vorige is not null
      and new.elektriciteit_kwh < v_vorige
    then
      raise exception
        'Elektriciteitsstand mag niet lager zijn dan de vorige stand (%).',
        v_vorige;
    end if;

    select m.elektriciteit_kwh
    into v_volgende
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum > new.opnamedatum
      and m.elektriciteit_kwh is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum asc
    limit 1;

    if v_volgende is not null
      and new.elektriciteit_kwh > v_volgende
    then
      raise exception
        'Elektriciteitsstand mag niet hoger zijn dan de volgende stand (%).',
        v_volgende;
    end if;
  end if;

  if new.gas_m3 is not null then
    select m.gas_m3
    into v_vorige
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum < new.opnamedatum
      and m.gas_m3 is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum desc
    limit 1;

    if v_vorige is not null
      and new.gas_m3 < v_vorige
    then
      raise exception
        'Gasstand mag niet lager zijn dan de vorige stand (%).',
        v_vorige;
    end if;

    select m.gas_m3
    into v_volgende
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum > new.opnamedatum
      and m.gas_m3 is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum asc
    limit 1;

    if v_volgende is not null
      and new.gas_m3 > v_volgende
    then
      raise exception
        'Gasstand mag niet hoger zijn dan de volgende stand (%).',
        v_volgende;
    end if;
  end if;

  if new.water_m3 is not null then
    select m.water_m3
    into v_vorige
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum < new.opnamedatum
      and m.water_m3 is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum desc
    limit 1;

    if v_vorige is not null
      and new.water_m3 < v_vorige
    then
      raise exception
        'Waterstand mag niet lager zijn dan de vorige stand (%).',
        v_vorige;
    end if;

    select m.water_m3
    into v_volgende
    from public.meterstanden m
    where m.woning_id = new.woning_id
      and m.opnamedatum > new.opnamedatum
      and m.water_m3 is not null
      and (
        tg_op = 'INSERT'
        or m.id <> new.id
      )
    order by m.opnamedatum asc
    limit 1;

    if v_volgende is not null
      and new.water_m3 > v_volgende
    then
      raise exception
        'Waterstand mag niet hoger zijn dan de volgende stand (%).',
        v_volgende;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists meterstanden_oplopend_controleren
on public.meterstanden;

create trigger meterstanden_oplopend_controleren
before insert or update
on public.meterstanden
for each row
execute function public.controleer_oplopende_meterstanden();
