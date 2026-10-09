-- Een controleur kan een per ongeluk gestarte, nog lege controle veilig
-- annuleren. De inspectie blijft als auditspoor bestaan, maar telt niet meer
-- mee als uitgevoerde of open inspectie.

alter table public.inspecties
  drop constraint if exists inspecties_status_check;

alter table public.inspecties
  add constraint inspecties_status_check
  check (status in ('open', 'afgerond', 'geannuleerd'));

alter table public.inspecties
  add column if not exists geannuleerd_at timestamptz,
  add column if not exists annuleringsreden text,
  add column if not exists geannuleerd_door uuid
    references public.profiles(id)
    on update cascade
    on delete restrict,
  add column if not exists geannuleerd_door_naam text;

alter table public.inspecties
  drop constraint if exists inspecties_annulering_consistent;

alter table public.inspecties
  add constraint inspecties_annulering_consistent
  check (
    status <> 'geannuleerd'
    or (
      geannuleerd_at is not null
      and geannuleerd_door is not null
      and geannuleerd_door_naam is not null
      and length(trim(geannuleerd_door_naam)) > 0
      and annuleringsreden is not null
      and length(trim(annuleringsreden)) between 5 and 1000
    )
  );

create or replace function public.annuleer_controleurinspectie(
  p_controlesessie_id bigint,
  p_reden text
)
returns public.inspecties
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sessie public.controlesessies;
  v_inspectie public.inspecties;
  v_reden text := nullif(trim(coalesce(p_reden, '')), '');
  v_naam text;
begin
  if not public.mag_controles_uitvoeren() then
    raise exception 'Geen bevoegdheid om deze controle te annuleren.';
  end if;

  if v_reden is null or length(v_reden) < 5 then
    raise exception 'Geef een annuleringsreden van minimaal 5 tekens.';
  end if;

  if length(v_reden) > 1000 then
    raise exception 'De annuleringsreden mag maximaal 1000 tekens bevatten.';
  end if;

  select sessie.*
  into v_sessie
  from public.controlesessies sessie
  where sessie.id = p_controlesessie_id
    and sessie.status = 'bezig'
  for update;

  if not found then
    raise exception 'De controlesessie is niet actief of bestaat niet.';
  end if;

  if v_sessie.controleur_id is distinct from auth.uid() then
    raise exception 'Deze controlesessie is niet aan jou toegewezen.';
  end if;

  if v_sessie.inspectie_id is null then
    raise exception 'Aan deze controlesessie is geen inspectie gekoppeld.';
  end if;

  select inspectie.*
  into v_inspectie
  from public.inspecties inspectie
  where inspectie.id = v_sessie.inspectie_id
    and inspectie.woning_id = v_sessie.woning_id
    and inspectie.status = 'open'
  for update;

  if not found then
    raise exception 'De gekoppelde inspectie is niet meer open.';
  end if;

  if exists (
    select 1
    from public.controle_resultaten resultaat
    where resultaat.controlesessie_id = v_sessie.id
  ) or exists (
    select 1
    from public.meterstanden meterstand
    where meterstand.controlesessie_id = v_sessie.id
  ) or exists (
    select 1
    from public.intelligence_werkpunt_terugmeldingen terugmelding
    where terugmelding.controlesessie_id = v_sessie.id
  ) or exists (
    select 1
    from public.inspectiefotos foto
    where foto.inspectie_id = v_inspectie.id
  ) then
    raise exception 'Deze controle bevat al registraties of bewijs. Laat een manager de inspectie beoordelen.';
  end if;

  select coalesce(
    nullif(trim(profiel.volledige_naam), ''),
    nullif(trim(profiel.email), ''),
    auth.uid()::text
  )
  into v_naam
  from public.profiles profiel
  where profiel.id = auth.uid();

  v_naam := coalesce(v_naam, auth.uid()::text);

  update public.controlesessies
  set
    status = 'geannuleerd',
    opmerkingen = concat_ws(
      E'\n',
      nullif(trim(opmerkingen), ''),
      'Geannuleerd door controleur: ' || v_reden
    )
  where id = v_sessie.id;

  update public.inspecties
  set
    status = 'geannuleerd',
    geannuleerd_at = now(),
    annuleringsreden = v_reden,
    geannuleerd_door = auth.uid(),
    geannuleerd_door_naam = v_naam
  where id = v_inspectie.id
  returning * into v_inspectie;

  insert into public.workflow_gebeurtenissen (
    woning_id,
    controlesessie_id,
    gebeurtenis_type,
    bron_type,
    bron_id,
    status,
    prioriteit,
    deduplicatie_sleutel,
    payload,
    verwerkt_at
  )
  values (
    v_sessie.woning_id,
    v_sessie.id,
    'controle.inspectie_geannuleerd',
    'inspectie',
    v_inspectie.id,
    'verwerkt',
    'normaal',
    format('inspectie_geannuleerd:%s', v_inspectie.id),
    jsonb_build_object(
      'reden', v_reden,
      'geannuleerd_door', auth.uid(),
      'geannuleerd_door_naam', v_naam,
      'controleur_annulering', true
    ),
    now()
  )
  on conflict (deduplicatie_sleutel) do nothing;

  return v_inspectie;
end;
$$;

revoke all
on function public.annuleer_controleurinspectie(bigint, text)
from public, anon;

grant execute
on function public.annuleer_controleurinspectie(bigint, text)
to authenticated;

comment on function public.annuleer_controleurinspectie(bigint, text)
is 'Annuleert uitsluitend een nog lege, open inspectie van de toegewezen controleur en bewaart reden, gebruiker en tijdstip.';
