alter table public.bewoners
add column if not exists kamer_id bigint;

alter table public.bewoners
drop constraint if exists bewoners_kamer_id_fkey;

alter table public.bewoners
add constraint bewoners_kamer_id_fkey
foreign key (kamer_id)
references public.kamers(id)
on delete set null;

create index if not exists bewoners_kamer_id_idx
on public.bewoners(kamer_id);
