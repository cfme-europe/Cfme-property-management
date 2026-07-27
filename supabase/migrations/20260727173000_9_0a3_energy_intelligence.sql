begin;

alter table public.meterstanden
  add column if not exists analyse_status text
    default 'onvoldoende_data'
    not null,
  add column if not exists analyse_resultaat jsonb
    default '{}'::jsonb
    not null,
  add column if not exists verklaring_code text,
  add column if not exists verklaring_toelichting text,
  add column if not exists opvolging_nodig boolean
    default false
    not null,
  add column if not exists geanalyseerd_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meterstanden_analyse_status_check'
      and conrelid = 'public.meterstanden'::regclass
  ) then
    alter table public.meterstanden
      add constraint meterstanden_analyse_status_check
      check (
        analyse_status in (
          'onvoldoende_data',
          'normaal',
          'verhoogd',
          'kritiek',
          'onwaarschijnlijk'
        )
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'meterstanden_vervolgverklaring_check'
      and conrelid = 'public.meterstanden'::regclass
  ) then
    alter table public.meterstanden
      add constraint meterstanden_vervolgverklaring_check
      check (
        verklaring_code is null
        or verklaring_code in (
          'meer_bewoners_of_bezoekers',
          'koude_periode',
          'extra_verwarming',
          'lekkage_vermoed',
          'installatie_defect',
          'meterstand_verkeerd',
          'ander_gebruik',
          'geen_verklaring',
          'overig'
        )
      );
  end if;
end;
$$;

create index if not exists
meterstanden_afwijkende_analyse_idx
on public.meterstanden (
  woning_id,
  opnamedatum desc,
  analyse_status
)
where analyse_status in (
  'verhoogd',
  'kritiek',
  'onwaarschijnlijk'
);

create index if not exists
meterstanden_opvolging_nodig_idx
on public.meterstanden (
  woning_id,
  opnamedatum desc
)
where opvolging_nodig = true;

comment on column public.meterstanden.analyse_status is
  'Directe Energy Intelligence-uitkomst van de meteropname.';

comment on column public.meterstanden.analyse_resultaat is
  'Uitlegbare analyse per energiedrager, inclusief verbruik, woninggemiddelde en afwijkingspercentage.';

comment on column public.meterstanden.verklaring_code is
  'Door de controleur gekozen verklaring, uitsluitend gevraagd bij een afwijkend verbruik.';

comment on column public.meterstanden.verklaring_toelichting is
  'Aanvullende toelichting wanneer de standaardverklaring onvoldoende is.';

comment on column public.meterstanden.opvolging_nodig is
  'Geeft aan dat de energieafwijking automatisch in opvolging, dashboard en rapportage moet verschijnen.';

commit;
