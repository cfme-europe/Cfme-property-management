-- CFME Control 9.0I
-- Event Engine + Operational Intelligence
--
-- Bestaande bronnen blijven leidend:
-- controle_resultaten -> workflow_gebeurtenissen
-- controlesessie afgerond -> intelligencepakket vernieuwen
--
-- Geen tweede workflow- of intelligencearchitectuur.

create or replace function public.registreer_controlefeit_gebeurtenis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prioriteit text;
begin
  v_prioriteit :=
    case new.resultaat
      when 'defect' then 'hoog'
      when 'onvoldoende' then 'hoog'
      when 'niet_aanwezig' then 'normaal'
      when 'niet_bereikbaar' then 'normaal'
      when 'niet_afleesbaar' then 'normaal'
      when 'overgeslagen' then 'laag'
      else 'laag'
    end;

  insert into public.workflow_gebeurtenissen (
    woning_id,
    controlesessie_id,
    gebeurtenis_type,
    bron_type,
    bron_id,
    status,
    prioriteit,
    deduplicatie_sleutel,
    payload
  )
  values (
    new.woning_id,
    new.controlesessie_id,
    'controle.feit_vastgelegd',
    'controle_resultaat',
    new.id,
    'verwerkt',
    v_prioriteit,
    format(
      'controle_resultaat:%s:feit',
      new.id
    ),
    jsonb_build_object(
      'controle_resultaat_id', new.id,
      'inspectie_id', new.inspectie_id,
      'ruimte_id', new.ruimte_id,
      'ruimte', new.ruimte_naam_snapshot,
      'object_id', new.object_id,
      'object', new.object_naam_snapshot,
      'woning_controlepunt_id',
        new.woning_controlepunt_id,
      'controlepunt',
        new.controlepunt_naam_snapshot,
      'resultaat', new.resultaat,
      'numerieke_waarde',
        new.numerieke_waarde,
      'tekstwaarde', new.tekstwaarde,
      'datumwaarde', new.datumwaarde,
      'beoordeeld_at', new.beoordeeld_at,
      'beoordeeld_door',
        new.beoordeeld_door,
      'feitelijk', true
    )
  )
  on conflict (deduplicatie_sleutel)
  do update
  set
    status = 'verwerkt',
    prioriteit = excluded.prioriteit,
    payload = excluded.payload,
    verwerkt_at = now(),
    foutmelding = null;

  return new;
end;
$$;

revoke all
on function public.registreer_controlefeit_gebeurtenis()
from public, anon, authenticated;

grant execute
on function public.registreer_controlefeit_gebeurtenis()
to service_role;

drop trigger if exists
  controle_resultaten_event_engine
on public.controle_resultaten;

create trigger controle_resultaten_event_engine
after insert or update of
  resultaat,
  numerieke_waarde,
  tekstwaarde,
  datumwaarde,
  opmerkingen,
  beoordeeld_at,
  beoordeeld_door
on public.controle_resultaten
for each row
execute function public.registreer_controlefeit_gebeurtenis();


create or replace function public.ververs_intelligence_na_controle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_intelligence jsonb;
begin
  if new.status <> 'afgerond'
    or old.status = 'afgerond'
  then
    return new;
  end if;

  v_intelligence :=
    public.genereer_intelligence_pakket(
      new.woning_id,
      new.id,
      coalesce(new.afgerond_at::date, current_date)
    );

  insert into public.workflow_gebeurtenissen (
    woning_id,
    controlesessie_id,
    gebeurtenis_type,
    bron_type,
    bron_id,
    status,
    prioriteit,
    deduplicatie_sleutel,
    payload
  )
  values (
    new.woning_id,
    new.id,
    'controle.afgerond',
    'controlesessie',
    new.id,
    'verwerkt',
    'normaal',
    format(
      'controlesessie:%s:afgerond',
      new.id
    ),
    jsonb_build_object(
      'controlesessie_id', new.id,
      'inspectie_id', new.inspectie_id,
      'afgerond_at', new.afgerond_at,
      'intelligence', v_intelligence
    )
  )
  on conflict (deduplicatie_sleutel)
  do update
  set
    status = 'verwerkt',
    payload = excluded.payload,
    verwerkt_at = now(),
    foutmelding = null;

  return new;
end;
$$;

revoke all
on function public.ververs_intelligence_na_controle()
from public, anon, authenticated;

grant execute
on function public.ververs_intelligence_na_controle()
to service_role;

drop trigger if exists
  controlesessies_intelligence_na_afronding
on public.controlesessies;

create trigger controlesessies_intelligence_na_afronding
after update of status, afgerond_at
on public.controlesessies
for each row
execute function public.ververs_intelligence_na_controle();

comment on function
  public.registreer_controlefeit_gebeurtenis()
is
  'CFME 9.0I: registreert iedere controlewaarneming idempotent als feitelijke workflowgebeurtenis.';

comment on function
  public.ververs_intelligence_na_controle()
is
  'CFME 9.0I: vernieuwt trends, Woning-DNA en controlebriefing nadat een controlesessie is afgerond.';
