drop policy if exists "Woning DNA lezen"
  on public.woning_dna_snapshots;

create policy "Woning DNA lezen"
on public.woning_dna_snapshots
for select
to anon, authenticated
using (true);
