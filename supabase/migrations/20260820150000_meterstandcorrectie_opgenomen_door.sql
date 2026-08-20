begin;

create or replace function public.corrigeer_meterstand(
  p_meterstand_id bigint,
  p_bewoners_aantal integer,
  p_dagstroom_kwh numeric,
  p_nachtstroom_kwh numeric,
  p_gas_m3 numeric,
  p_water_m3 numeric,
  p_opgenomen_door text,
  p_opmerkingen text,
  p_reden text
)
returns public.meterstanden
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oud public.meterstanden;
  v_nieuw public.meterstanden;
  v_uitzonderingen jsonb;
  v_opgenomen_door text;
  v_opmerkingen text;
  v_meetgegevens_gewijzigd boolean;
begin
  if not (
    public.mag_administratie_beheren()
    or public.mag_controles_uitvoeren()
  ) then
    raise exception
      'Onvoldoende rechten om een meterstand te corrigeren.';
  end if;

  if nullif(
    btrim(coalesce(p_reden, '')),
    ''
  ) is null then
    raise exception
      'Een reden voor de correctie is verplicht.';
  end if;

  select *
  into v_oud
  from public.meterstanden
  where id = p_meterstand_id
  for update;

  if v_oud.id is null then
    raise exception 'Meterstand niet gevonden.';
  end if;

  if
    p_bewoners_aantal < 0
    or coalesce(p_dagstroom_kwh, 0) < 0
    or coalesce(p_nachtstroom_kwh, 0) < 0
    or coalesce(p_gas_m3, 0) < 0
    or coalesce(p_water_m3, 0) < 0
  then
    raise exception
      'Waarden mogen niet negatief zijn.';
  end if;

  v_opgenomen_door :=
    nullif(
      btrim(coalesce(p_opgenomen_door, '')),
      ''
    );

  v_opmerkingen :=
    nullif(
      btrim(coalesce(p_opmerkingen, '')),
      ''
    );

  v_uitzonderingen :=
    coalesce(
      v_oud.meteruitzonderingen,
      '{}'::jsonb
    );

  if p_dagstroom_kwh is not null then
    v_uitzonderingen :=
      v_uitzonderingen - 'dagstroom_kwh';
  end if;

  if p_nachtstroom_kwh is not null then
    v_uitzonderingen :=
      v_uitzonderingen - 'nachtstroom_kwh';
  end if;

  if p_gas_m3 is not null then
    v_uitzonderingen :=
      v_uitzonderingen - 'gas_m3';
  end if;

  if p_water_m3 is not null then
    v_uitzonderingen :=
      v_uitzonderingen - 'water_m3';
  end if;

  v_meetgegevens_gewijzigd :=
    v_oud.bewoners_aantal
      is distinct from p_bewoners_aantal
    or v_oud.dagstroom_kwh
      is distinct from p_dagstroom_kwh
    or v_oud.nachtstroom_kwh
      is distinct from p_nachtstroom_kwh
    or v_oud.gas_m3
      is distinct from p_gas_m3
    or v_oud.water_m3
      is distinct from p_water_m3
    or coalesce(
      v_oud.meteruitzonderingen,
      '{}'::jsonb
    ) is distinct from v_uitzonderingen;

  if
    not v_meetgegevens_gewijzigd
    and nullif(
      btrim(coalesce(v_oud.opgenomen_door, '')),
      ''
    ) is not distinct from v_opgenomen_door
    and nullif(
      btrim(coalesce(v_oud.opmerkingen, '')),
      ''
    ) is not distinct from v_opmerkingen
  then
    raise exception
      'Er zijn geen wijzigingen om op te slaan.';
  end if;

  insert into public.meterstand_correcties (
    meterstand_id,
    woning_id,
    controlesessie_id,
    gecorrigeerd_door,
    reden,
    oude_waarden,
    nieuwe_waarden
  )
  values (
    v_oud.id,
    v_oud.woning_id,
    v_oud.controlesessie_id,
    auth.uid(),
    btrim(p_reden),

    jsonb_build_object(
      'bewoners_aantal',
        v_oud.bewoners_aantal,
      'dagstroom_kwh',
        v_oud.dagstroom_kwh,
      'nachtstroom_kwh',
        v_oud.nachtstroom_kwh,
      'gas_m3',
        v_oud.gas_m3,
      'water_m3',
        v_oud.water_m3,
      'opgenomen_door',
        v_oud.opgenomen_door,
      'opmerkingen',
        v_oud.opmerkingen,
      'meteruitzonderingen',
        v_oud.meteruitzonderingen
    ),

    jsonb_build_object(
      'bewoners_aantal',
        p_bewoners_aantal,
      'dagstroom_kwh',
        p_dagstroom_kwh,
      'nachtstroom_kwh',
        p_nachtstroom_kwh,
      'gas_m3',
        p_gas_m3,
      'water_m3',
        p_water_m3,
      'opgenomen_door',
        v_opgenomen_door,
      'opmerkingen',
        v_opmerkingen,
      'meteruitzonderingen',
        v_uitzonderingen
    )
  );

  update public.meterstanden
  set
    bewoners_aantal =
      p_bewoners_aantal,
    dagstroom_kwh =
      p_dagstroom_kwh,
    nachtstroom_kwh =
      p_nachtstroom_kwh,
    gas_m3 =
      p_gas_m3,
    water_m3 =
      p_water_m3,
    opgenomen_door =
      v_opgenomen_door,
    meteruitzonderingen =
      v_uitzonderingen,
    opmerkingen =
      v_opmerkingen,
    analyse_status =
      case
        when v_meetgegevens_gewijzigd
          then 'onvoldoende_data'
        else v_oud.analyse_status
      end,
    analyse_resultaat =
      case
        when v_meetgegevens_gewijzigd
          then '{}'::jsonb
        else v_oud.analyse_resultaat
      end,
    opvolging_nodig =
      case
        when v_meetgegevens_gewijzigd
          then false
        else v_oud.opvolging_nodig
      end,
    geanalyseerd_at =
      case
        when v_meetgegevens_gewijzigd
          then null
        else v_oud.geanalyseerd_at
      end
  where id = v_oud.id
  returning *
  into v_nieuw;

  return v_nieuw;
end;
$$;

revoke all
on function public.corrigeer_meterstand(
  bigint,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.corrigeer_meterstand(
  bigint,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text,
  text
)
to authenticated, service_role;


create or replace function public.corrigeer_meterstand(
  p_meterstand_id bigint,
  p_bewoners_aantal integer,
  p_dagstroom_kwh numeric,
  p_nachtstroom_kwh numeric,
  p_gas_m3 numeric,
  p_water_m3 numeric,
  p_opmerkingen text,
  p_reden text
)
returns public.meterstanden
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_opgenomen_door text;
begin
  select opgenomen_door
  into v_opgenomen_door
  from public.meterstanden
  where id = p_meterstand_id;

  return public.corrigeer_meterstand(
    p_meterstand_id,
    p_bewoners_aantal,
    p_dagstroom_kwh,
    p_nachtstroom_kwh,
    p_gas_m3,
    p_water_m3,
    v_opgenomen_door,
    p_opmerkingen,
    p_reden
  );
end;
$$;

revoke all
on function public.corrigeer_meterstand(
  bigint,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
)
from public, anon;

grant execute
on function public.corrigeer_meterstand(
  bigint,
  integer,
  numeric,
  numeric,
  numeric,
  numeric,
  text,
  text
)
to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
