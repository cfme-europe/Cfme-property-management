-- Additive; no backfill, deletion or rewriting of existing business records.
begin;
create table if not exists public.energie_producten (
 code text primary key, naam text not null, eenheid text not null,
 dimensie text not null, display_factor numeric not null default 1 check(display_factor>0)
);
insert into public.energie_producten(code,naam,eenheid,dimensie) values
 ('elektriciteit','Elektriciteit','kWh','energie'),('gas','Gas','m³','volume'),('water','Water','m³','volume') on conflict do nothing;
create table if not exists public.energie_tariefplannen (
 id uuid primary key default gen_random_uuid(), product text not null references public.energie_producten(code),
 eenheid text not null, valuta text not null check(valuta ~ '^[A-Z]{3}$'),
 vanaf date not null, tot date, woning_id bigint references public.woningen(id), bedrijf_id bigint references public.bedrijven(id),
 bron text not null check(length(trim(bron))>0), componenten jsonb not null check(jsonb_typeof(componenten)='array' and jsonb_array_length(componenten)>0),
 voorganger_id uuid unique references public.energie_tariefplannen(id),
 created_at timestamptz not null default now(), created_by uuid not null default auth.uid(),
 check(tot is null or tot>vanaf),check(woning_id is null or bedrijf_id is null)
);
create index if not exists energie_tarief_scope on public.energie_tariefplannen(product,woning_id,bedrijf_id,vanaf);
create table if not exists public.energie_meterconfiguraties (
 id uuid primary key default gen_random_uuid(), woning_id bigint not null references public.woningen(id),
 product text not null references public.energie_producten(code), woning_object_id bigint references public.woning_objecten(id),
 meteridentiteit text not null check(length(trim(meteridentiteit))>0),
 registertype text not null check(registertype in ('dag_nacht','enkel','totaal')),
 voorganger_id uuid unique references public.energie_meterconfiguraties(id),
 vanaf date not null, tot date, created_at timestamptz not null default now(), created_by uuid not null default auth.uid(),
 check(tot is null or tot>vanaf)
);
create index if not exists energie_meter_woning on public.energie_meterconfiguraties(woning_id,product,vanaf);
create table if not exists public.energie_maatregelen (
 id uuid primary key default gen_random_uuid(), woning_id bigint not null references public.woningen(id),product text not null references public.energie_producten(code),
 titel text not null check(length(trim(titel)) between 1 and 160),
 status text not null check(status in ('onderzoek','gepland','uitgevoerd','gecontroleerd')),
 uitvoerdatum date,taak_id bigint references public.taken(id),
 referentie_vanaf date not null,referentie_tot date not null,controle_vanaf date,controle_tot date,
 onderbouwing text not null,klant_toelichting text not null default '',klant_goedgekeurd boolean not null default false,
 voorganger_id uuid unique references public.energie_maatregelen(id),
 created_at timestamptz not null default now(),created_by uuid not null default auth.uid(),
 check(referentie_tot>referentie_vanaf),check((controle_vanaf is null and controle_tot is null) or (controle_vanaf is not null and controle_tot>controle_vanaf and controle_vanaf>=referentie_tot)),
 check(status not in ('uitgevoerd','gecontroleerd') or uitvoerdatum is not null),
 check(status<>'gecontroleerd' or (controle_vanaf is not null and controle_tot is not null))
);
create index if not exists energie_maatregel_woning on public.energie_maatregelen(woning_id,created_at);
create table if not exists public.energie_snapshots (
 id uuid primary key default gen_random_uuid(), maandrapportage_id bigint references public.maandrapportages(id),
 woning_id bigint references public.woningen(id),klant jsonb not null,intern jsonb not null,
 bron_hash text not null,rekenregels text not null,codeversie text not null,
 created_at timestamptz not null default now(),created_by uuid not null default auth.uid()
);
create index if not exists energie_snapshot_rapport on public.energie_snapshots(maandrapportage_id,created_at);
create or replace function public.energie_onveranderlijk() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Energiehistorie is onveranderlijk. Maak een nieuwe versie.';end;$$;
create or replace function public.energie_controleer_invoer() returns trigger language plpgsql set search_path='' as $$
declare c jsonb; vorig record;
begin
 if auth.uid() is null or new.created_by<>auth.uid() then raise exception 'Ongeldige auditgebruiker';end if;
 new.created_at:=now();
 if tg_table_name='energie_tariefplannen' then
  perform pg_advisory_xact_lock(hashtextextended('energie_tarief_'||new.product,0));
  if new.voorganger_id is not null then
   select * into vorig from public.energie_tariefplannen where id=new.voorganger_id;
   if not found or vorig.product<>new.product or vorig.woning_id is distinct from new.woning_id or vorig.bedrijf_id is distinct from new.bedrijf_id then raise exception 'Voorganger heeft andere tariefscope';end if;
  end if;
  if new.eenheid<>(select eenheid from public.energie_producten where code=new.product) then raise exception 'Eenheid past niet bij product';end if;
  if exists(select 1 from public.energie_tariefplannen t where t.product=new.product and t.woning_id is not distinct from new.woning_id and t.bedrijf_id is not distinct from new.bedrijf_id and (new.voorganger_id is null or t.id<>new.voorganger_id) and not exists(select 1 from public.energie_tariefplannen v where v.voorganger_id=t.id) and daterange(t.vanaf,t.tot,'[)') && daterange(new.vanaf,new.tot,'[)')) then raise exception 'Overlappende tariefperioden';end if;
  if exists(select 1 from jsonb_array_elements(new.componenten) x group by x->>'soort' having count(*)>1) then raise exception 'Dubbele tariefcomponent';end if;
  if new.componenten @> '[{"soort":"variabel"}]'::jsonb and (new.componenten @> '[{"soort":"dag"}]'::jsonb or new.componenten @> '[{"soort":"nacht"}]'::jsonb) then raise exception 'Totaaltarief en dag/nacht sluiten elkaar uit';end if;
  if (new.componenten @> '[{"soort":"dag"}]'::jsonb) <> (new.componenten @> '[{"soort":"nacht"}]'::jsonb) then raise exception 'Dag en nacht samen vastleggen';end if;
  for c in select value from jsonb_array_elements(new.componenten) loop
   if c->>'soort' is null or c->>'soort' not in ('variabel','dag','nacht','vast_dag','vast_maand','belasting','toeslag','teruglevering') or c->>'prijs' is null or c->>'btw_percentage' is null or (c->>'prijs') !~ '^[0-9]+(\.[0-9]{1,9})?$' or (c->>'btw_percentage') !~ '^[0-9]+(\.[0-9]{1,9})?$' or (c->>'prijs')::numeric<0 or (c->>'btw_percentage')::numeric not between 0 and 100 or jsonb_typeof(c->'inclusief_btw') is distinct from 'boolean' then raise exception 'Ongeldige tariefcomponent';end if;
  end loop;
 elsif tg_table_name='energie_meterconfiguraties' then
  perform pg_advisory_xact_lock(hashtextextended('energie_meter_'||new.woning_id::text||new.product,0));
  if new.woning_object_id is not null and not exists(select 1 from public.woning_objecten where id=new.woning_object_id and woning_id=new.woning_id) then raise exception 'Meterobject hoort niet bij pand';end if;
  if new.voorganger_id is not null and not exists(select 1 from public.energie_meterconfiguraties where id=new.voorganger_id and woning_id=new.woning_id and product=new.product) then raise exception 'Voorganger heeft andere meterscope';end if;
  if exists(select 1 from public.energie_meterconfiguraties c where c.woning_id=new.woning_id and c.product=new.product and (new.voorganger_id is null or c.id<>new.voorganger_id) and not exists(select 1 from public.energie_meterconfiguraties v where v.voorganger_id=c.id) and daterange(c.vanaf,c.tot,'[)') && daterange(new.vanaf,new.tot,'[)')) then raise exception 'Overlappende meterconfiguratie';end if;
 elsif tg_table_name='energie_maatregelen' then
  if new.taak_id is not null and not exists(select 1 from public.taken where id=new.taak_id and woning_id=new.woning_id) then raise exception 'Taak hoort niet bij pand';end if;
  if new.voorganger_id is not null and not exists(select 1 from public.energie_maatregelen where id=new.voorganger_id and woning_id=new.woning_id and product=new.product) then raise exception 'Voorganger hoort niet bij maatregel';end if;
 elsif tg_table_name='energie_snapshots' then
  if new.maandrapportage_id is not null and not exists(select 1 from public.maandrapportages where id=new.maandrapportage_id and woning_id=new.woning_id) then raise exception 'Snapshot hoort niet bij rapportage';end if;
 end if;
 return new;
end;$$;
do $$ declare t text; begin
 foreach t in array array['energie_tariefplannen','energie_meterconfiguraties','energie_maatregelen','energie_snapshots'] loop
  execute format('drop trigger if exists energie_historie_bewaren on public.%I',t);
  execute format('create trigger energie_historie_bewaren before update or delete on public.%I for each row execute function public.energie_onveranderlijk()',t);
  execute format('drop trigger if exists energie_invoer on public.%I',t);
  execute format('create trigger energie_invoer before insert on public.%I for each row execute function public.energie_controleer_invoer()',t);
 end loop;
 foreach t in array array['energie_producten','energie_tariefplannen','energie_meterconfiguraties','energie_maatregelen','energie_snapshots'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('drop policy if exists energie_lezen on public.%I',t);
  execute format('create policy energie_lezen on public.%I for select to authenticated using ((select public.mag_managementinformatie_lezen()))',t);
  if t<>'energie_producten' then
   execute format('grant insert on public.%I to authenticated',t);
   execute format('drop policy if exists energie_toevoegen on public.%I',t);
   if t in ('energie_tariefplannen','energie_meterconfiguraties') then
    execute format('create policy energie_toevoegen on public.%I for insert to authenticated with check ((select public.heeft_rol(array[''admin'',''management''])) and created_by=(select auth.uid()))',t);
   else
    execute format('create policy energie_toevoegen on public.%I for insert to authenticated with check ((select public.mag_administratie_beheren()) and created_by=(select auth.uid()))',t);
   end if;
  end if;
 end loop;
end;$$;
revoke all on function public.energie_onveranderlijk() from public,anon,authenticated;
revoke all on function public.energie_controleer_invoer() from public,anon,authenticated;
-- Existing writable definer: restrict callers without rewriting business data.
do $$ begin
 if to_regprocedure('public.bereken_energie_bezetting_trends(bigint,date)') is not null then
  execute 'revoke execute on function public.bereken_energie_bezetting_trends(bigint,date) from public,anon,authenticated';
  -- Deliberately no authenticated grant; the new engine computes read-only in the app.
 end if;
end;$$;
commit;
