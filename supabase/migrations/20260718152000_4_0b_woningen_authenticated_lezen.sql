drop policy if exists "Woningen authenticated lezen"
  on public.woningen;

create policy "Woningen authenticated lezen"
  on public.woningen
  for select
  to authenticated
  using (true);
