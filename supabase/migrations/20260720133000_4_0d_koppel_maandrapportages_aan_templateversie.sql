alter table public.maandrapportages
  add column if not exists templateversie_id bigint;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'maandrapportages_templateversie_id_fkey'
      and conrelid = 'public.maandrapportages'::regclass
  ) then
    alter table public.maandrapportages
      add constraint maandrapportages_templateversie_id_fkey
      foreign key (templateversie_id)
      references public.rapporttemplateversies(id)
      on delete restrict;
  end if;
end;
$$;

create index if not exists maandrapportages_templateversie_id_idx
  on public.maandrapportages(templateversie_id);

insert into public.rapporttemplates (
  code,
  naam,
  omschrijving,
  doelgroep,
  status,
  actief
)
values (
  'maandrapportage-standaard',
  'Standaard maandrapportage',
  'Standaardtemplate voor bestaande en nieuwe maandrapportages.',
  'extern',
  'concept',
  true
)
on conflict (code) do nothing;

insert into public.rapporttemplateversies (
  template_id,
  versienummer,
  status,
  geldig_vanaf,
  toelichting
)
select
  template.id,
  1,
  'concept',
  current_date,
  'Initiële standaardversie voor BP-REPORT-001.'
from public.rapporttemplates as template
where template.code = 'maandrapportage-standaard'
on conflict (template_id, versienummer) do nothing;

insert into public.rapporttemplateblokken (
  templateversie_id,
  rapportblok_id,
  volgorde,
  verplicht,
  zichtbaar
)
select
  versie.id,
  blok.id,
  case blok.code
    when 'samenvatting' then 1
    when 'bewoners' then 2
    when 'inspecties' then 3
    when 'meldingen' then 4
    when 'meterstanden' then 5
    when 'energieverbruik' then 6
    when 'opmerkingen' then 7
    else 100
  end,
  blok.code in (
    'samenvatting',
    'inspecties',
    'meldingen',
    'energieverbruik'
  ),
  blok.standaard_zichtbaar
from public.rapporttemplateversies as versie
join public.rapporttemplates as template
  on template.id = versie.template_id
cross join public.rapportblokken as blok
where template.code = 'maandrapportage-standaard'
  and versie.versienummer = 1
  and blok.code in (
    'samenvatting',
    'bewoners',
    'inspecties',
    'meldingen',
    'energieverbruik',
    'opmerkingen'
  )
on conflict (templateversie_id, rapportblok_id)
do nothing;

create or replace function public.controleer_activering_rapporttemplateversie()
returns trigger
language plpgsql
as $$
declare
  template_doelgroep text;
begin
  if new.status <> 'actief' then
    return new;
  end if;

  select doelgroep
  into template_doelgroep
  from public.rapporttemplates
  where id = new.template_id;

  if not exists (
    select 1
    from public.rapporttemplateblokken
    where templateversie_id = new.id
  ) then
    raise exception
      'Een templateversie zonder rapportblokken kan niet actief worden.';
  end if;

  if not exists (
    select 1
    from public.rapporttemplateblokken
    where templateversie_id = new.id
      and zichtbaar = true
  ) then
    raise exception
      'Een templateversie moet minimaal één zichtbaar rapportblok bevatten.';
  end if;

  if exists (
    select 1
    from public.rapporttemplateblokken as koppeling
    join public.rapportblokken as blok
      on blok.id = koppeling.rapportblok_id
    where koppeling.templateversie_id = new.id
      and blok.actief = false
  ) then
    raise exception
      'Een templateversie met inactieve rapportblokken kan niet actief worden.';
  end if;

  if exists (
    select 1
    from public.rapporttemplateblokken
    where templateversie_id = new.id
      and verplicht = true
      and zichtbaar = false
  ) then
    raise exception
      'Een verplicht rapportblok moet zichtbaar zijn.';
  end if;

  if exists (
    select 1
    from public.rapporttemplateblokken as koppeling
    join public.rapportblokken as blok
      on blok.id = koppeling.rapportblok_id
    where koppeling.templateversie_id = new.id
      and (
        (
          template_doelgroep = 'extern'
          and blok.doelgroep = 'intern'
        )
        or (
          template_doelgroep = 'intern'
          and blok.doelgroep = 'extern'
        )
      )
  ) then
    raise exception
      'Een rapportblok past niet bij de doelgroep van de template.';
  end if;

  return new;
end;
$$;

drop trigger if exists rapporttemplateversies_controle_activering
  on public.rapporttemplateversies;

create trigger rapporttemplateversies_controle_activering
before insert or update of status
on public.rapporttemplateversies
for each row
execute function public.controleer_activering_rapporttemplateversie();

update public.rapporttemplateversies as versie
set
  status = 'actief',
  geldig_vanaf = coalesce(
    versie.geldig_vanaf,
    current_date
  )
from public.rapporttemplates as template
where template.id = versie.template_id
  and template.code = 'maandrapportage-standaard'
  and versie.versienummer = 1
  and versie.status <> 'actief';

update public.rapporttemplates
set status = 'actief'
where code = 'maandrapportage-standaard'
  and status <> 'actief';

update public.maandrapportages
set templateversie_id = (
  select versie.id
  from public.rapporttemplateversies as versie
  join public.rapporttemplates as template
    on template.id = versie.template_id
  where template.code = 'maandrapportage-standaard'
    and versie.versienummer = 1
)
where templateversie_id is null;

alter table public.maandrapportages
  alter column templateversie_id set not null;

create or replace function public.bescherm_maandrapportage_templateversie()
returns trigger
language plpgsql
as $$
begin
  if old.templateversie_id is distinct from new.templateversie_id then
    raise exception
      'De templateversie van een maandrapportage is onveranderlijk.';
  end if;

  return new;
end;
$$;

drop trigger if exists maandrapportages_bescherm_templateversie
  on public.maandrapportages;

create trigger maandrapportages_bescherm_templateversie
before update of templateversie_id
on public.maandrapportages
for each row
execute function public.bescherm_maandrapportage_templateversie();