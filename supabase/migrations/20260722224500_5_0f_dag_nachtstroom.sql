alter table public.meterstanden
add column if not exists dagstroom_kwh numeric(14, 3);

alter table public.meterstanden
add column if not exists nachtstroom_kwh numeric(14, 3);

alter table public.meterstanden
drop constraint if exists meterstanden_dagstroom_niet_negatief;

alter table public.meterstanden
add constraint meterstanden_dagstroom_niet_negatief
check (
  dagstroom_kwh is null
  or dagstroom_kwh >= 0
);

alter table public.meterstanden
drop constraint if exists meterstanden_nachtstroom_niet_negatief;

alter table public.meterstanden
add constraint meterstanden_nachtstroom_niet_negatief
check (
  nachtstroom_kwh is null
  or nachtstroom_kwh >= 0
);

create or replace function public.controleer_oplopende_meterstanden()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_vorige numeric;
  v_volgende numeric;
  v_kolom text;
  v_waarde numeric;
begin
  new.elektriciteit_kwh :=
    case
      when new.dagstroom_kwh is null
        and new.nachtstroom_kwh is null
      then null
      else
        coalesce(new.dagstroom_kwh, 0)
        + coalesce(new.nachtstroom_kwh, 0)
    end;

  foreach v_kolom in array
    array[
      'dagstroom_kwh',
      'nachtstroom_kwh',
      'gas_m3',
      'water_m3'
    ]
  loop
    execute format(
      'select ($1).%I',
      v_kolom
    )
    into v_waarde
    using new;

    if v_waarde is null then
      continue;
    end if;

    execute format(
      'select %I
       from public.meterstanden
       where woning_id = $1
         and opnamedatum < $2
         and %I is not null
         and ($3 = ''INSERT'' or id <> $4)
       order by opnamedatum desc
       limit 1',
      v_kolom,
      v_kolom
    )
    into v_vorige
    using
      new.woning_id,
      new.opnamedatum,
      tg_op,
      new.id;

    if v_vorige is not null
      and v_waarde < v_vorige
    then
      raise exception
        '% mag niet lager zijn dan de vorige stand (%).',
        v_kolom,
        v_vorige;
    end if;

    execute format(
      'select %I
       from public.meterstanden
       where woning_id = $1
         and opnamedatum > $2
         and %I is not null
         and ($3 = ''INSERT'' or id <> $4)
       order by opnamedatum asc
       limit 1',
      v_kolom,
      v_kolom
    )
    into v_volgende
    using
      new.woning_id,
      new.opnamedatum,
      tg_op,
      new.id;

    if v_volgende is not null
      and v_waarde > v_volgende
    then
      raise exception
        '% mag niet hoger zijn dan de volgende stand (%).',
        v_kolom,
        v_volgende;
    end if;
  end loop;

  return new;
end;
$$;
