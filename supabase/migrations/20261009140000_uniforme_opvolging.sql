-- Eén beheerhandeling voor meldingen, taken en controleafwijkingen.
-- De brontabellen blijven bestaan als audit- en rapportagegegevens.

create or replace function public.beheer_opvolgitem(
  p_bron_type text,
  p_bron_id bigint,
  p_woning_id bigint,
  p_status text,
  p_verantwoordelijke text,
  p_deadline date,
  p_oplossing text
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_nu timestamptz := now();
  v_vandaag date := current_date;
  v_verantwoordelijke text := nullif(btrim(coalesce(p_verantwoordelijke, '')), '');
  v_oplossing text := nullif(btrim(coalesce(p_oplossing, '')), '');
  v_melding public.meldingen%rowtype;
  v_taak public.taken%rowtype;
  v_afwijking public.controle_afwijkingen%rowtype;
begin
  if not public.mag_wijzigen() then
    raise exception 'Alleen management mag opvolging definitief beheren.';
  end if;

  if p_bron_type not in ('afwijking', 'melding', 'taak') then
    raise exception 'Ongeldig opvolgtype.';
  end if;

  if p_bron_id is null or p_bron_id <= 0
    or p_woning_id is null or p_woning_id <= 0
  then
    raise exception 'Ongeldig opvolgitem of woning.';
  end if;

  if p_status not in ('open', 'in_behandeling', 'afgehandeld', 'niet_relevant') then
    raise exception 'Ongeldige opvolgstatus.';
  end if;

  if p_status in ('afgehandeld', 'niet_relevant') and v_oplossing is null then
    raise exception 'Een toelichting op de afhandeling is verplicht.';
  end if;

  if p_bron_type = 'afwijking' then
    select * into v_afwijking
    from public.controle_afwijkingen
    where id = p_bron_id and woning_id = p_woning_id
    for update;

    if not found then
      raise exception 'Controleafwijking niet gevonden.';
    end if;

    if p_status = 'afgehandeld'
      and v_afwijking.herstelbewijs_verplicht
      and v_afwijking.herstelbewijs_status <> 'goedgekeurd'
    then
      raise exception 'Verplicht herstelbewijs moet eerst zijn goedgekeurd.';
    end if;

    update public.controle_afwijkingen
    set status = case p_status
        when 'open' then 'open'
        when 'in_behandeling' then 'in_opvolging'
        when 'afgehandeld' then 'opgelost'
        else 'niet_relevant'
      end,
      verantwoordelijke = v_verantwoordelijke,
      deadline = p_deadline,
      oplossing = case when p_status in ('afgehandeld', 'niet_relevant') then v_oplossing else null end,
      opgelost_at = case when p_status = 'afgehandeld' then coalesce(opgelost_at, v_nu) else null end,
      opgelost_door = case when p_status = 'afgehandeld' then auth.uid() else null end,
      updated_at = v_nu
    where id = v_afwijking.id;

  elsif p_bron_type = 'melding' then
    select * into v_melding
    from public.meldingen
    where id = p_bron_id and woning_id = p_woning_id
    for update;

    if not found then
      raise exception 'Melding niet gevonden.';
    end if;

    update public.meldingen
    set status = case when p_status in ('afgehandeld', 'niet_relevant') then 'opgelost' else p_status end,
      verantwoordelijke = v_verantwoordelijke,
      oplossing = case when p_status in ('afgehandeld', 'niet_relevant') then v_oplossing else null end,
      oplosdatum = case when p_status in ('afgehandeld', 'niet_relevant') then coalesce(oplosdatum, v_vandaag) else null end,
      updated_at = v_nu
    where id = v_melding.id;

    update public.taken
    set status = case
        when p_status = 'open' then 'open'
        when p_status = 'in_behandeling' then 'in_behandeling'
        when p_status = 'afgehandeld' then 'afgerond'
        else 'geannuleerd'
      end,
      toegewezen_aan = v_verantwoordelijke,
      deadline = p_deadline,
      afgerond_op = case when p_status = 'afgehandeld' then coalesce(afgerond_op, v_vandaag) else null end,
      opmerkingen = case when p_status in ('afgehandeld', 'niet_relevant') then v_oplossing else opmerkingen end,
      updated_at = v_nu
    where melding_id = v_melding.id
      and woning_id = p_woning_id;

    if not found and (p_status in ('open', 'in_behandeling') or p_deadline is not null or v_verantwoordelijke is not null) then
      insert into public.taken (
        woning_id, inspectie_id, melding_id, titel, omschrijving,
        categorie, prioriteit, status, startdatum, deadline,
        toegewezen_aan, externe_referentie, opmerkingen
      ) values (
        v_melding.woning_id, v_melding.inspectie_id, v_melding.id,
        'Opvolgen – ' || v_melding.titel, v_melding.omschrijving,
        case when v_melding.categorie in ('schade','onderhoud','veiligheid','schoonmaak','installatie')
          then v_melding.categorie else 'overig' end,
        v_melding.prioriteit,
        case when p_status = 'in_behandeling' then 'in_behandeling' else 'open' end,
        v_vandaag, p_deadline, v_verantwoordelijke,
        'melding:' || v_melding.id || ':opvolging',
        'Aangemaakt vanuit centrale opvolging.'
      );
    end if;

  else
    select * into v_taak
    from public.taken
    where id = p_bron_id and woning_id = p_woning_id
    for update;

    if not found then
      raise exception 'Taak niet gevonden.';
    end if;

    update public.taken
    set status = case
        when p_status = 'open' then 'open'
        when p_status = 'in_behandeling' then 'in_behandeling'
        when p_status = 'afgehandeld' then 'afgerond'
        else 'geannuleerd'
      end,
      toegewezen_aan = v_verantwoordelijke,
      deadline = p_deadline,
      afgerond_op = case when p_status = 'afgehandeld' then coalesce(afgerond_op, v_vandaag) else null end,
      opmerkingen = case when p_status in ('afgehandeld', 'niet_relevant') then v_oplossing else opmerkingen end,
      updated_at = v_nu
    where id = v_taak.id;
  end if;

  return jsonb_build_object(
    'bron_type', p_bron_type,
    'bron_id', p_bron_id,
    'woning_id', p_woning_id,
    'status', p_status
  );
end;
$$;

revoke all on function public.beheer_opvolgitem(text, bigint, bigint, text, text, date, text)
from public, anon;

grant execute on function public.beheer_opvolgitem(text, bigint, bigint, text, text, date, text)
to authenticated, service_role;
