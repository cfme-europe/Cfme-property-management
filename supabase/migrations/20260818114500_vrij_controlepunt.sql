begin;

insert into public.controlepunt_definities (
  code,
  naam,
  omschrijving,
  categorie,
  invoertype,
  foto_verplicht_bij_afwijking,
  actief
)
select
  'VRIJ_CONTROLEPUNT',
  'Vrij controlepunt',
  'Vrij door de beheerder benoemd controlepunt.',
  'algemeen',
  bron.invoertype,
  bron.foto_verplicht_bij_afwijking,
  true
from public.controlepunt_definities bron
where bron.code = 'ALG_NETHEID'
  and not exists (
    select 1
    from public.controlepunt_definities
    where code = 'VRIJ_CONTROLEPUNT'
  );

update public.controlepunt_definities
set
  naam = 'Vrij controlepunt',
  omschrijving =
    'Vrij door de beheerder benoemd controlepunt.',
  categorie = 'algemeen',
  actief = true
where code = 'VRIJ_CONTROLEPUNT';

do $$
begin
  if not exists (
    select 1
    from public.controlepunt_definities
    where code = 'VRIJ_CONTROLEPUNT'
      and categorie = 'algemeen'
      and actief = true
  ) then
    raise exception
      'Vrij controlepunt is niet correct ingesteld.';
  end if;
end;
$$;

commit;
