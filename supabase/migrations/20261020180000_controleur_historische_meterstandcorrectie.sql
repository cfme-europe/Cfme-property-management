begin;

-- Historische correctie van precies één register door de toegewezen controleur.
-- De opnamedatum en alle andere registers blijven ongewijzigd; de bestaande
-- trigger controleer_oplopende_meterstanden bewaakt het vorige en volgende interval.
create or replace function public.corrigeer_controleur_meterstand(
  p_controlesessie_id bigint,
  p_meterstand_id bigint,
  p_register text,
  p_nieuwe_waarde numeric,
  p_reden text
)
returns public.meterstanden
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sessie public.controlesessies;
  v_oud public.meterstanden;
  v_nieuw public.meterstanden;
  v_oude_waarde numeric;
  v_uitzonderingen jsonb;
  v_reden text;
begin
  if auth.uid() is null or not public.mag_controles_uitvoeren() then
    raise exception 'Onvoldoende rechten om een meterstand te corrigeren.';
  end if;

  if p_register is null
    or p_register not in ('dagstroom_kwh', 'nachtstroom_kwh', 'gas_m3', 'water_m3')
  then
    raise exception 'Onbekend meterregister.';
  end if;

  v_reden := nullif(btrim(coalesce(p_reden, '')), '');
  if v_reden is null then
    raise exception 'Een reden voor de correctie is verplicht.';
  end if;

  if p_nieuwe_waarde is null or p_nieuwe_waarde < 0 then
    raise exception 'De gecorrigeerde stand moet nul of hoger zijn.';
  end if;

  select * into v_sessie
  from public.controlesessies
  where id = p_controlesessie_id;

  if v_sessie.id is null then
    raise exception 'Controlesessie niet gevonden.';
  end if;

  if v_sessie.controleur_id is distinct from auth.uid() then
    raise exception 'Deze controle is niet aan jou toegewezen.';
  end if;

  if v_sessie.status not in ('gepland', 'bezig') then
    raise exception 'Deze controlesessie is niet actief.';
  end if;

  select * into v_oud
  from public.meterstanden
  where id = p_meterstand_id
  for update;

  if v_oud.id is null then
    raise exception 'Meterstand niet gevonden.';
  end if;

  if v_oud.woning_id <> v_sessie.woning_id then
    raise exception 'Deze meteropname hoort niet bij het pand van deze controle.';
  end if;

  execute format('select ($1).%I', p_register) into v_oude_waarde using v_oud;

  if v_oude_waarde is null then
    raise exception 'Voor dit register is in deze opname geen stand vastgelegd.';
  end if;

  if v_oude_waarde = p_nieuwe_waarde then
    raise exception 'Er zijn geen wijzigingen om op te slaan.';
  end if;

  v_uitzonderingen := coalesce(v_oud.meteruitzonderingen, '{}'::jsonb) - p_register;

  insert into public.meterstand_correcties (
    meterstand_id, woning_id, controlesessie_id, gecorrigeerd_door,
    reden, oude_waarden, nieuwe_waarden
  )
  values (
    v_oud.id,
    v_oud.woning_id,
    v_sessie.id,
    auth.uid(),
    v_reden,
    jsonb_build_object(
      'gecorrigeerd_register', p_register,
      'opnamedatum', v_oud.opnamedatum,
      'oorspronkelijke_controlesessie_id', v_oud.controlesessie_id,
      'bewoners_aantal', v_oud.bewoners_aantal,
      'dagstroom_kwh', v_oud.dagstroom_kwh,
      'nachtstroom_kwh', v_oud.nachtstroom_kwh,
      'gas_m3', v_oud.gas_m3,
      'water_m3', v_oud.water_m3,
      'opgenomen_door', v_oud.opgenomen_door,
      'opmerkingen', v_oud.opmerkingen,
      'meteruitzonderingen', v_oud.meteruitzonderingen
    ),
    jsonb_build_object(
      'gecorrigeerd_register', p_register,
      'opnamedatum', v_oud.opnamedatum,
      'oorspronkelijke_controlesessie_id', v_oud.controlesessie_id,
      'bewoners_aantal', v_oud.bewoners_aantal,
      'dagstroom_kwh', case when p_register = 'dagstroom_kwh' then p_nieuwe_waarde else v_oud.dagstroom_kwh end,
      'nachtstroom_kwh', case when p_register = 'nachtstroom_kwh' then p_nieuwe_waarde else v_oud.nachtstroom_kwh end,
      'gas_m3', case when p_register = 'gas_m3' then p_nieuwe_waarde else v_oud.gas_m3 end,
      'water_m3', case when p_register = 'water_m3' then p_nieuwe_waarde else v_oud.water_m3 end,
      'opgenomen_door', v_oud.opgenomen_door,
      'opmerkingen', v_oud.opmerkingen,
      'meteruitzonderingen', v_uitzonderingen
    )
  );

  update public.meterstanden
  set
    dagstroom_kwh = case when p_register = 'dagstroom_kwh' then p_nieuwe_waarde else dagstroom_kwh end,
    nachtstroom_kwh = case when p_register = 'nachtstroom_kwh' then p_nieuwe_waarde else nachtstroom_kwh end,
    gas_m3 = case when p_register = 'gas_m3' then p_nieuwe_waarde else gas_m3 end,
    water_m3 = case when p_register = 'water_m3' then p_nieuwe_waarde else water_m3 end,
    meteruitzonderingen = v_uitzonderingen,
    analyse_status = 'onvoldoende_data',
    analyse_resultaat = '{}'::jsonb,
    opvolging_nodig = false,
    geanalyseerd_at = null
  where id = v_oud.id
  returning * into v_nieuw;

  return v_nieuw;
end;
$$;

revoke all on function public.corrigeer_controleur_meterstand(bigint, bigint, text, numeric, text)
  from public, anon;
grant execute on function public.corrigeer_controleur_meterstand(bigint, bigint, text, numeric, text)
  to authenticated, service_role;

commit;

notify pgrst, 'reload schema';
