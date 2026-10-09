-- Volledige opvolging van interne intelligence-werkpunten.

alter table public.intelligence_werkpunten
  add column if not exists afgehandeld_at timestamptz,
  add column if not exists afgehandeld_door uuid
    references public.profiles(id) on delete set null,
  add column if not exists afgehandeld_door_naam text,
  add column if not exists afhandelnotitie text;

create index if not exists
  intelligence_werkpunten_afgehandeld_idx
on public.intelligence_werkpunten(
  woning_id,
  afgehandeld_at desc
)
where status in ('opgevolgd', 'genegeerd');

create or replace function public.intelligence_werkpunt_status_bewaken()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'actief'
    and new.geactiveerd_at is null
  then
    new.geactiveerd_at = now();
  end if;

  if new.status <> 'actief' then
    new.geactiveerd_at = null;
  end if;

  if new.status = 'opgevolgd'
    and new.opgevolgd_at is null
  then
    new.opgevolgd_at = now();
  end if;

  if new.status <> 'opgevolgd' then
    new.opgevolgd_at = null;
  end if;

  if new.status in ('opgevolgd', 'genegeerd')
    and new.afgehandeld_at is null
  then
    new.afgehandeld_at = now();
  end if;

  if new.status not in ('opgevolgd', 'genegeerd') then
    new.afgehandeld_at = null;
    new.afgehandeld_door = null;
    new.afgehandeld_door_naam = null;
    new.afhandelnotitie = null;
  end if;

  return new;
end;
$$;

create or replace function public.handel_intelligence_werkpunt_af(
  p_werkpunt_id bigint,
  p_status text,
  p_notitie text
)
returns public.intelligence_werkpunten
language plpgsql
security definer
set search_path = public
as $$
declare
  resultaat public.intelligence_werkpunten;
  gebruiker_naam text;
  notitie text := nullif(trim(coalesce(p_notitie, '')), '');
begin
  if not public.mag_wijzigen() then
    raise exception 'Geen bevoegdheid om dit werkpunt af te handelen.';
  end if;

  if p_status not in ('opgevolgd', 'genegeerd') then
    raise exception 'Kies opgevolgd of niet relevant.';
  end if;

  if notitie is null then
    raise exception 'Een afhandelnotitie is verplicht.';
  end if;

  if length(notitie) > 2000 then
    raise exception 'De afhandelnotitie mag maximaal 2000 tekens bevatten.';
  end if;

  select coalesce(
    nullif(trim(profiel.volledige_naam), ''),
    nullif(trim(profiel.email), ''),
    auth.uid()::text
  )
  into gebruiker_naam
  from public.profiles profiel
  where profiel.id = auth.uid();

  gebruiker_naam := coalesce(gebruiker_naam, auth.uid()::text);

  update public.intelligence_werkpunten werkpunt
  set
    status = p_status,
    afgehandeld_at = now(),
    afgehandeld_door = auth.uid(),
    afgehandeld_door_naam = gebruiker_naam,
    afhandelnotitie = notitie
  where werkpunt.id = p_werkpunt_id
    and werkpunt.status = 'actief'
  returning werkpunt.* into resultaat;

  if not found then
    raise exception 'Dit werkpunt is niet meer actief of bestaat niet.';
  end if;

  return resultaat;
end;
$$;

revoke all
on function public.handel_intelligence_werkpunt_af(bigint, text, text)
from public, anon;

grant execute
on function public.handel_intelligence_werkpunt_af(bigint, text, text)
to authenticated;

comment on function public.handel_intelligence_werkpunt_af(bigint, text, text)
is 'Handelt een actief intern werkpunt gecontroleerd af met gebruiker, tijdstip en verplichte notitie.';
