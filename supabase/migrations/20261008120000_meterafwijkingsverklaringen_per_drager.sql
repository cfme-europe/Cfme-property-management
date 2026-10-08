begin;

alter table public.meterstanden
add column if not exists afwijkingsverklaringen jsonb
not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname =
      'meterstanden_afwijkingsverklaringen_object_check'
      and conrelid = 'public.meterstanden'::regclass
  ) then
    alter table public.meterstanden
    add constraint
      meterstanden_afwijkingsverklaringen_object_check
    check (
      jsonb_typeof(afwijkingsverklaringen) = 'object'
    );
  end if;
end;
$$;

with bestaande_afwijkingen as (
  select
    meterstand.id,
    count(*) filter (
      where drager.item ->> 'status' in (
        'verhoogd',
        'kritiek',
        'onwaarschijnlijk'
      )
    ) as aantal_afwijkende_dragers,
    min(drager.item ->> 'drager') filter (
      where drager.item ->> 'status' in (
        'verhoogd',
        'kritiek',
        'onwaarschijnlijk'
      )
    ) as enige_drager
  from public.meterstanden meterstand
  left join lateral jsonb_array_elements(
    coalesce(
      meterstand.analyse_resultaat -> 'dragers',
      '[]'::jsonb
    )
  ) as drager(item) on true
  where meterstand.verklaring_code is not null
  group by meterstand.id
),
over_te_nemen as (
  select
    meterstand.id,
    case
      when afwijking.aantal_afwijkende_dragers = 1
        then afwijking.enige_drager
      else 'algemeen'
    end as sleutel,
    jsonb_strip_nulls(
      jsonb_build_object(
        'verklaring_code',
          meterstand.verklaring_code,
        'verklaring_toelichting',
          meterstand.verklaring_toelichting,
        'opgeslagen_at',
          coalesce(
            meterstand.updated_at,
            meterstand.created_at
          ),
        'bron', 'bestaande_verklaring'
      )
    ) as verklaring
  from public.meterstanden meterstand
  join bestaande_afwijkingen afwijking
    on afwijking.id = meterstand.id
)
update public.meterstanden meterstand
set afwijkingsverklaringen =
  meterstand.afwijkingsverklaringen ||
  jsonb_build_object(
    over_te_nemen.sleutel,
    over_te_nemen.verklaring
  )
from over_te_nemen
where meterstand.id = over_te_nemen.id
  and not (
    meterstand.afwijkingsverklaringen
      ? over_te_nemen.sleutel
  );

create or replace function
public.sla_energieverklaring_per_drager(
  p_meterstand_id bigint,
  p_drager text,
  p_verklaring_code text,
  p_verklaring_toelichting text default null
)
returns public.meterstanden
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_code text := btrim(
    coalesce(p_verklaring_code, '')
  );
  v_toelichting text := nullif(
    btrim(
      coalesce(p_verklaring_toelichting, '')
    ),
    ''
  );
  v_verklaringen jsonb;
  v_resultaat public.meterstanden;
begin
  if p_meterstand_id is null
    or p_meterstand_id <= 0
  then
    raise exception 'Ongeldige meteropname.';
  end if;

  if p_drager not in (
    'elektriciteit',
    'gas',
    'water'
  ) then
    raise exception 'Ongeldige energiedrager.';
  end if;

  if v_code not in (
    'meer_bewoners_of_bezoekers',
    'koude_periode',
    'extra_verwarming',
    'lekkage_vermoed',
    'installatie_defect',
    'meterstand_verkeerd',
    'ander_gebruik',
    'geen_verklaring',
    'overig'
  ) then
    raise exception
      'Kies eerst een geldige verklaring voor het afwijkende verbruik.';
  end if;

  if v_code in (
    'geen_verklaring',
    'overig'
  ) and v_toelichting is null then
    raise exception
      'Geef een korte toelichting bij deze verklaring.';
  end if;

  select jsonb_set(
    meterstand.afwijkingsverklaringen,
    array[p_drager],
    jsonb_strip_nulls(
      jsonb_build_object(
        'verklaring_code', v_code,
        'verklaring_toelichting', v_toelichting,
        'opgeslagen_at', now(),
        'opgeslagen_door', auth.uid()
      )
    ),
    true
  )
  into v_verklaringen
  from public.meterstanden meterstand
  where meterstand.id = p_meterstand_id
  for update;

  if v_verklaringen is null then
    raise exception 'Meteropname niet gevonden.';
  end if;

  update public.meterstanden
  set
    afwijkingsverklaringen = v_verklaringen,
    verklaring_code = v_code,
    verklaring_toelichting = v_toelichting,
    analyse_resultaat = jsonb_set(
      coalesce(analyse_resultaat, '{}'::jsonb),
      '{afwijkingsverklaringen}',
      v_verklaringen,
      true
    ),
    opvolging_nodig = true
  where id = p_meterstand_id
  returning * into v_resultaat;

  return v_resultaat;
end;
$$;

revoke all
on function public.sla_energieverklaring_per_drager(
  bigint,
  text,
  text,
  text
)
from public, anon;

grant execute
on function public.sla_energieverklaring_per_drager(
  bigint,
  text,
  text,
  text
)
to authenticated;

comment on column
public.meterstanden.afwijkingsverklaringen is
  'Verklaringen per energiedrager. De sleutel algemeen bewaart uitsluitend niet-eenduidig te migreren historische verklaringen.';

comment on function
public.sla_energieverklaring_per_drager(
  bigint,
  text,
  text,
  text
) is
  'Slaat atomair één verklaring per elektriciteit, gas of water op en behoudt verklaringen van andere dragers.';

commit;
