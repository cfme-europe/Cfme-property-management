alter table public.inspecties
add column if not exists controlesessie_id bigint
references public.controlesessies(id)
on update cascade
on delete set null;

create index if not exists inspecties_controlesessie_id_idx
on public.inspecties(controlesessie_id);

create unique index if not exists inspecties_controlesessie_uniek_idx
on public.inspecties(controlesessie_id)
where controlesessie_id is not null;
