-- CFME Control 9.0E
-- Maintenance Intelligence: transactioneel herstelbeheer,
-- herstelbewijs en aantoonbare afsluitvoorwaarden.

alter table public.controle_afwijkingen
  add column if not exists herstelbewijs_status text
    not null default 'niet_vereist'
    check (
      herstelbewijs_status in (
        'niet_vereist',
        'vereist',
        'aangeleverd',
        'goedgekeurd',
        'afgekeurd'
      )
    ),
  add column if not exists herstelbewijs_beoordeeld_at timestamptz,
  add column if not exists herstelbewijs_beoordeeld_door uuid
    references public.profiles(id)
    on update cascade
    on delete set null;

update public.controle_afwijkingen
set herstelbewijs_status =
  case
    when herstelbewijs_verplicht
      then 'vereist'
    else 'niet_vereist'
  end
where herstelbewijs_status = 'niet_vereist'
  and herstelbewijs_verplicht;

alter table public.controle_afwijkingen
  drop constraint if exists
    controle_afwijkingen_herstelbewijs_consistent;

alter table public.controle_afwijkingen
  add constraint
    controle_afwijkingen_herstelbewijs_consistent
  check (
    (
      herstelbewijs_verplicht = false
      and herstelbewijs_status = 'niet_vereist'
    )
    or (
      herstelbewijs_verplicht = true
      and herstelbewijs_status in (
        'vereist',
        'aangeleverd',
        'goedgekeurd',
        'afgekeurd'
      )
    )
  );

create index if not exists
  controle_afwijkingen_herstelbewijs_status_idx
on public.controle_afwijkingen(
  herstelbewijs_status
);

drop policy if exists "Inspectiefotos toevoegen"
  on public.inspectie_fotos;

create policy "Inspectiefotos toevoegen"
on public.inspectie_fotos
for insert
to authenticated
with check (
  public.mag_controles_uitvoeren()
  or public.mag_meldingen_beheren()
);

drop policy if exists "Inspectiefotos wijzigen"
  on public.inspectie_fotos;

create policy "Inspectiefotos wijzigen"
on public.inspectie_fotos
for update
to authenticated
using (
  public.mag_controles_uitvoeren()
  or public.mag_meldingen_beheren()
)
with check (
  public.mag_controles_uitvoeren()
  or public.mag_meldingen_beheren()
);

create or replace function public.beheer_controle_afwijking(
  p_afwijking_id bigint,
  p_woning_id bigint,
  p_status text,
  p_verantwoordelijke text,
  p_deadline date,
  p_hercontrole_nodig boolean,
  p_hercontrole_voor date,
  p_herstelbewijs_verplicht boolean,
  p_herstelbewijs_omschrijving text,
  p_herstelbewijs_status text,
  p_oplossing text,
  p_geschatte_kosten numeric,
  p_werkelijke_kosten numeric,
  p_factuur_naar text,
  p_financieel_gevolg text,
  p_operationeel_gevolg text
)
returns public.controle_afwijkingen
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_afwijking public.controle_afwijkingen%rowtype;
  v_bewijs_aantal integer;
  v_nu timestamptz := now();
begin
  if not (
    public.mag_controles_uitvoeren()
    or public.mag_meldingen_beheren()
  ) then
    raise exception
      'Onvoldoende rechten om onderhoudsopvolging te beheren.';
  end if;

  if p_afwijking_id is null
    or p_afwijking_id <= 0
    or p_woning_id is null
    or p_woning_id <= 0
  then
    raise exception 'Ongeldige controleafwijking of woning.';
  end if;

  if p_status not in (
    'open',
    'in_opvolging',
    'opgelost',
    'geaccepteerd',
    'niet_relevant'
  ) then
    raise exception 'Ongeldige afwijkingsstatus.';
  end if;

  if p_factuur_naar not in (
    'cfme',
    'hurend_bedrijf',
    'eigenaar',
    'nog_te_bepalen'
  ) then
    raise exception 'Ongeldige factuurontvanger.';
  end if;

  if p_herstelbewijs_status not in (
    'niet_vereist',
    'vereist',
    'aangeleverd',
    'goedgekeurd',
    'afgekeurd'
  ) then
    raise exception 'Ongeldige herstelbewijsstatus.';
  end if;

  if p_geschatte_kosten is not null
    and p_geschatte_kosten < 0
  then
    raise exception 'Geschatte kosten mogen niet negatief zijn.';
  end if;

  if p_werkelijke_kosten is not null
    and p_werkelijke_kosten < 0
  then
    raise exception 'Werkelijke kosten mogen niet negatief zijn.';
  end if;

  if p_hercontrole_nodig
    and p_hercontrole_voor is null
  then
    raise exception 'Datum van de hercontrole is verplicht.';
  end if;

  if p_status = 'opgelost'
    and nullif(btrim(coalesce(p_oplossing, '')), '') is null
  then
    raise exception 'Beschrijving van het herstel is verplicht.';
  end if;

  select *
  into v_afwijking
  from public.controle_afwijkingen
  where id = p_afwijking_id
    and woning_id = p_woning_id
  for update;

  if not found then
    raise exception 'Controleafwijking niet gevonden.';
  end if;

  select count(*)::integer
  into v_bewijs_aantal
  from public.inspectie_fotos
  where controle_afwijking_id = p_afwijking_id;

  if p_herstelbewijs_verplicht then
    if p_herstelbewijs_status = 'niet_vereist' then
      raise exception
        'Herstelbewijsstatus moet worden vastgelegd.';
    end if;

    if p_herstelbewijs_status in (
      'aangeleverd',
      'goedgekeurd'
    )
      and v_bewijs_aantal = 0
    then
      raise exception
        'Voeg eerst minimaal één herstelbewijsfoto toe.';
    end if;

    if p_status = 'opgelost'
      and p_herstelbewijs_status <> 'goedgekeurd'
    then
      raise exception
        'Verplicht herstelbewijs moet zijn goedgekeurd voordat de afwijking wordt opgelost.';
    end if;
  elsif p_herstelbewijs_status <> 'niet_vereist' then
    raise exception
      'Herstelbewijsstatus moet niet vereist zijn.';
  end if;

  update public.controle_afwijkingen
  set
    status = p_status,
    verantwoordelijke =
      nullif(btrim(coalesce(p_verantwoordelijke, '')), ''),
    deadline = p_deadline,
    hercontrole_nodig = p_hercontrole_nodig,
    hercontrole_voor =
      case
        when p_hercontrole_nodig
          then p_hercontrole_voor
        else null
      end,
    herstelbewijs_verplicht =
      p_herstelbewijs_verplicht,
    herstelbewijs_omschrijving =
      nullif(
        btrim(coalesce(
          p_herstelbewijs_omschrijving,
          ''
        )),
        ''
      ),
    herstelbewijs_status =
      case
        when p_herstelbewijs_verplicht
          then p_herstelbewijs_status
        else 'niet_vereist'
      end,
    herstelbewijs_beoordeeld_at =
      case
        when p_herstelbewijs_status in (
          'goedgekeurd',
          'afgekeurd'
        )
          then v_nu
        else null
      end,
    herstelbewijs_beoordeeld_door =
      case
        when p_herstelbewijs_status in (
          'goedgekeurd',
          'afgekeurd'
        )
          then auth.uid()
        else null
      end,
    oplossing =
      case
        when p_status = 'opgelost'
          then nullif(
            btrim(coalesce(p_oplossing, '')),
            ''
          )
        else null
      end,
    opgelost_at =
      case
        when p_status = 'opgelost'
          then coalesce(v_afwijking.opgelost_at, v_nu)
        else null
      end,
    opgelost_door =
      case
        when p_status = 'opgelost'
          then auth.uid()
        else null
      end,
    geschatte_kosten = p_geschatte_kosten,
    werkelijke_kosten = p_werkelijke_kosten,
    factuur_naar = p_factuur_naar,
    financieel_gevolg =
      nullif(
        btrim(coalesce(p_financieel_gevolg, '')),
        ''
      ),
    operationeel_gevolg =
      nullif(
        btrim(coalesce(p_operationeel_gevolg, '')),
        ''
      ),
    updated_at = v_nu
  where id = p_afwijking_id
    and woning_id = p_woning_id
  returning *
  into v_afwijking;

  return v_afwijking;
end;
$$;

revoke all on function public.beheer_controle_afwijking(
  bigint,
  bigint,
  text,
  text,
  date,
  boolean,
  date,
  boolean,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text
)
from public, anon;

grant execute on function public.beheer_controle_afwijking(
  bigint,
  bigint,
  text,
  text,
  date,
  boolean,
  date,
  boolean,
  text,
  text,
  text,
  numeric,
  numeric,
  text,
  text,
  text
)
to authenticated, service_role;
