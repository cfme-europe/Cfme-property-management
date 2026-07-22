drop policy if exists "Workflow gebeurtenissen lezen"
  on public.workflow_gebeurtenissen;

create policy "Workflow gebeurtenissen lezen"
on public.workflow_gebeurtenissen
for select
to authenticated
using (true);

drop policy if exists "Workflow acties lezen"
  on public.workflow_acties;

create policy "Workflow acties lezen"
on public.workflow_acties
for select
to authenticated
using (true);

create or replace function public.dispatch_nieuwe_workflow_gebeurtenis()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    perform public.verwerk_workflow_gebeurtenis(new.id);
  exception
    when others then
      update public.workflow_gebeurtenissen
      set
        status = 'mislukt',
        foutmelding = sqlerrm
      where id = new.id;
  end;

  return new;
end;
$$;

revoke all
on function public.dispatch_nieuwe_workflow_gebeurtenis()
from public, anon, authenticated;

drop trigger if exists workflow_gebeurtenissen_dispatch
  on public.workflow_gebeurtenissen;

create trigger workflow_gebeurtenissen_dispatch
after insert
on public.workflow_gebeurtenissen
for each row
execute function public.dispatch_nieuwe_workflow_gebeurtenis();
