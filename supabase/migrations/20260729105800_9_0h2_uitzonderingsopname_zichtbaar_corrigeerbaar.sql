begin;

alter table public.meterstanden
  add column if not exists meteruitzonderingen jsonb not null default '{}'::jsonb;

do $$
declare r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.meterstanden'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%gas_m3%'
      and pg_get_constraintdef(oid) ilike '%water_m3%'
  loop
    execute format('alter table public.meterstanden drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.meterstanden
  add constraint meterstanden_minimaal_een_feit
  check (
    dagstroom_kwh is not null
    or nachtstroom_kwh is not null
    or elektriciteit_kwh is not null
    or gas_m3 is not null
    or water_m3 is not null
    or meteruitzonderingen <> '{}'::jsonb
  )
  not valid;

create or replace function public.corrigeer_meterstand(
  p_meterstand_id bigint, p_bewoners_aantal integer, p_dagstroom_kwh numeric, p_nachtstroom_kwh numeric, p_gas_m3 numeric, p_water_m3 numeric, p_opmerkingen text, p_reden text
) returns public.meterstanden language plpgsql security definer set search_path=public,pg_temp as $$
declare v_oud public.meterstanden; v_nieuw public.meterstanden; v_uitzonderingen jsonb;
begin
  if not (public.mag_administratie_beheren() or public.mag_controles_uitvoeren()) then raise exception 'Onvoldoende rechten om een meterstand te corrigeren.'; end if;
  if nullif(btrim(coalesce(p_reden,'')),'') is null then raise exception 'Een reden voor de correctie is verplicht.'; end if;
  select * into v_oud from public.meterstanden where id=p_meterstand_id for update;
  if v_oud.id is null then raise exception 'Meterstand niet gevonden.'; end if;
  if p_bewoners_aantal < 0 or coalesce(p_dagstroom_kwh,0)<0 or coalesce(p_nachtstroom_kwh,0)<0 or coalesce(p_gas_m3,0)<0 or coalesce(p_water_m3,0)<0 then raise exception 'Waarden mogen niet negatief zijn.'; end if;
  v_uitzonderingen := coalesce(v_oud.meteruitzonderingen, '{}'::jsonb);
  if p_dagstroom_kwh is not null then v_uitzonderingen := v_uitzonderingen - 'dagstroom_kwh'; end if;
  if p_nachtstroom_kwh is not null then v_uitzonderingen := v_uitzonderingen - 'nachtstroom_kwh'; end if;
  if p_gas_m3 is not null then v_uitzonderingen := v_uitzonderingen - 'gas_m3'; end if;
  if p_water_m3 is not null then v_uitzonderingen := v_uitzonderingen - 'water_m3'; end if;
  insert into public.meterstand_correcties(meterstand_id,woning_id,controlesessie_id,gecorrigeerd_door,reden,oude_waarden,nieuwe_waarden) values (
    v_oud.id,v_oud.woning_id,v_oud.controlesessie_id,auth.uid(),btrim(p_reden),
    jsonb_build_object('bewoners_aantal',v_oud.bewoners_aantal,'dagstroom_kwh',v_oud.dagstroom_kwh,'nachtstroom_kwh',v_oud.nachtstroom_kwh,'gas_m3',v_oud.gas_m3,'water_m3',v_oud.water_m3,'opmerkingen',v_oud.opmerkingen,'meteruitzonderingen',v_oud.meteruitzonderingen),
    jsonb_build_object('bewoners_aantal',p_bewoners_aantal,'dagstroom_kwh',p_dagstroom_kwh,'nachtstroom_kwh',p_nachtstroom_kwh,'gas_m3',p_gas_m3,'water_m3',p_water_m3,'opmerkingen',p_opmerkingen,'meteruitzonderingen',v_uitzonderingen)
  );
  update public.meterstanden set bewoners_aantal=p_bewoners_aantal,dagstroom_kwh=p_dagstroom_kwh,nachtstroom_kwh=p_nachtstroom_kwh,gas_m3=p_gas_m3,water_m3=p_water_m3,meteruitzonderingen=v_uitzonderingen,opmerkingen=nullif(btrim(coalesce(p_opmerkingen,'')),''),analyse_status='onvoldoende_data',analyse_resultaat='{}'::jsonb,opvolging_nodig=false,geanalyseerd_at=null where id=v_oud.id returning * into v_nieuw;
  return v_nieuw;
end $$;

commit;
