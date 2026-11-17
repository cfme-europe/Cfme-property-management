-- Informatieve schattingen inclusief btw; geen facturen of betalingsregistratie.
create table if not exists public.energie_jaarprijzen (
 id uuid primary key default gen_random_uuid(), woning_id bigint not null references public.woningen(id),
 jaar integer not null check(jaar between 1900 and 2200),
 stroomtype text not null check(stroomtype in ('enkel','dag_nacht')),
 stroom numeric(14,6) check(stroom>=0 and stroom<100000000), dag numeric(14,6) check(dag>=0 and dag<100000000), nacht numeric(14,6) check(nacht>=0 and nacht<100000000),
 gas numeric(14,6) check(gas>=0 and gas<100000000), water numeric(14,6) check(water>=0 and water<100000000), vast_jaar numeric(14,2) check(vast_jaar>=0 and vast_jaar<100000000),
 stroom_actief boolean not null default true, gas_actief boolean not null default true, water_actief boolean not null default true,
 voorganger_id uuid unique references public.energie_jaarprijzen(id),
 created_at timestamptz not null default now(), created_by uuid not null default auth.uid() references auth.users(id)
);
create table if not exists public.energie_voorschotafspraken (
 id uuid primary key default gen_random_uuid(), verhuurperiode_id bigint not null references public.verhuurperiodes(id),
 vanaf date not null, tot date, startsaldo numeric(14,2) check(startsaldo between -999999999 and 999999999), voorschotten jsonb not null default '[]',
 voorganger_id uuid unique references public.energie_voorschotafspraken(id),
 created_at timestamptz not null default now(), created_by uuid not null default auth.uid() references auth.users(id),
 check(tot is null or tot>vanaf), check(jsonb_typeof(voorschotten)='array' and jsonb_array_length(voorschotten)<=120)
);
create index if not exists energie_jaarprijzen_woning_jaar on public.energie_jaarprijzen(woning_id,jaar);
create index if not exists energie_voorschotafspraken_huur on public.energie_voorschotafspraken(verhuurperiode_id);
create or replace function public.energie_informatief_invoer() returns trigger language plpgsql set search_path=public as $$
declare vorige uuid; v jsonb; huur record; seen date[] := '{}'; d date;
begin
 if new.created_by is distinct from auth.uid() then raise exception 'Ongeldige auteur'; end if;
 new.created_at := now();
 if tg_table_name='energie_jaarprijzen' then
   perform pg_advisory_xact_lock(hashtextextended('jaarprijs:'||new.woning_id||':'||new.jaar,0));
   select p.id into vorige from public.energie_jaarprijzen p where p.woning_id=new.woning_id and p.jaar=new.jaar
     and not exists(select 1 from public.energie_jaarprijzen n where n.voorganger_id=p.id);
 else
   perform pg_advisory_xact_lock(hashtextextended('voorschot:'||new.verhuurperiode_id,0));
   select * into huur from public.verhuurperiodes where id=new.verhuurperiode_id;
   if not found then raise exception 'Verhuurperiode ontbreekt'; end if;
   if new.vanaf<huur.startdatum or (huur.werkelijke_einddatum is not null and (new.vanaf>=huur.werkelijke_einddatum or (new.tot is not null and new.tot>huur.werkelijke_einddatum))) then raise exception 'Afspraak valt buiten verhuurperiode'; end if;
   if new.vanaf<'1900-01-01'::date or new.vanaf>'2200-12-31'::date then raise exception 'Ongeldig startjaar'; end if;
   for v in select value from jsonb_array_elements(new.voorschotten) loop
     if jsonb_typeof(v)<>'object' or not(v ? 'vanaf' and v ? 'bedrag') then raise exception 'Ongeldig voorschot'; end if;
     d := (v->>'vanaf')::date;
     if d is null or d<new.vanaf or (new.tot is not null and d>=new.tot) or d=any(seen) then raise exception 'Ongeldige voorschotdatum'; end if;
     if v->'bedrag'<>'null'::jsonb and (jsonb_typeof(v->'bedrag')<>'number' or (v->>'bedrag')::numeric<0 or (v->>'bedrag')::numeric>999999999999) then raise exception 'Ongeldig voorschotbedrag'; end if;
     seen := array_append(seen,d);
   end loop;
   select a.id into vorige from public.energie_voorschotafspraken a where a.verhuurperiode_id=new.verhuurperiode_id
     and not exists(select 1 from public.energie_voorschotafspraken n where n.voorganger_id=a.id);
 end if;
 if new.voorganger_id is distinct from vorige then raise exception 'Invoer is inmiddels gewijzigd. Herlaad het scherm.'; end if;
 return new;
end $$;
revoke all on function public.energie_informatief_invoer() from public,anon,authenticated;
do $$ declare tabel text; begin
 foreach tabel in array array['energie_jaarprijzen','energie_voorschotafspraken'] loop
   execute format('alter table public.%I enable row level security',tabel);
   execute format('revoke all on public.%I from anon, authenticated',tabel);
   execute format('grant select,insert on public.%I to authenticated',tabel);
   execute format('drop policy if exists lezen on public.%I',tabel);
   execute format('create policy lezen on public.%I for select to authenticated using(public.mag_managementinformatie_lezen())',tabel);
   execute format('drop policy if exists invoeren on public.%I',tabel);
   execute format('create policy invoeren on public.%I for insert to authenticated with check(public.heeft_rol(array[''admin'',''management'']) and created_by=auth.uid())',tabel);
   execute format('drop trigger if exists invoer on public.%I',tabel);
   execute format('create trigger invoer before insert on public.%I for each row execute function public.energie_informatief_invoer()',tabel);
   execute format('drop trigger if exists onveranderlijk on public.%I',tabel);
   execute format('create trigger onveranderlijk before update or delete on public.%I for each row execute function public.energie_onveranderlijk()',tabel);
 end loop;
end $$;
