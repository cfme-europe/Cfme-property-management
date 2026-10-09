-- Controlebewijs per controlepunt en reparaties die tijdens de controle
-- direct zijn uitgevoerd. Bestaande foto's blijven algemene situatiefoto's.

alter table public.inspectie_fotos
  add column if not exists foto_type text not null default 'situatie';

alter table public.inspectie_fotos
  drop constraint if exists inspectie_fotos_foto_type_geldig;

alter table public.inspectie_fotos
  add constraint inspectie_fotos_foto_type_geldig
  check (
    foto_type in (
      'situatie',
      'voor_herstel',
      'na_herstel',
      'herstelbewijs'
    )
  );

create index if not exists
  inspectie_fotos_resultaat_type_idx
on public.inspectie_fotos(
  controle_resultaat_id,
  foto_type,
  volgorde
);

alter table public.controle_afwijkingen
  add column if not exists ter_plaatse_hersteld boolean not null default false,
  add column if not exists gebruikte_materialen text,
  add column if not exists arbeid_minuten integer;

alter table public.controle_afwijkingen
  drop constraint if exists controle_afwijkingen_arbeid_minuten_geldig;

alter table public.controle_afwijkingen
  add constraint controle_afwijkingen_arbeid_minuten_geldig
  check (
    arbeid_minuten is null
    or arbeid_minuten >= 0
  );

alter table public.controle_afwijkingen
  drop constraint if exists controle_afwijkingen_ter_plaatse_herstel_consistent;

alter table public.controle_afwijkingen
  add constraint controle_afwijkingen_ter_plaatse_herstel_consistent
  check (
    ter_plaatse_hersteld = false
    or (
      status = 'opgelost'
      and opgelost_at is not null
      and oplossing is not null
      and length(trim(oplossing)) > 0
      and opvolging_nodig = false
      and melding_maken = false
      and taak_maken = false
    )
  );

comment on column public.inspectie_fotos.foto_type is
  'Duidt aan of een foto de situatie, de situatie voor herstel, de situatie na herstel of aanvullend herstelbewijs toont.';

comment on column public.controle_afwijkingen.ter_plaatse_hersteld is
  'Waar wanneer de controleur de afwijking tijdens dezelfde controle heeft hersteld.';

comment on column public.controle_afwijkingen.gebruikte_materialen is
  'Vrije omschrijving van materialen die bij herstel ter plaatse zijn gebruikt.';

comment on column public.controle_afwijkingen.arbeid_minuten is
  'Aantal minuten dat aan herstel ter plaatse is besteed.';
