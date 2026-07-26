-- CFME Control 8.1H
-- Waarborgt dat een verwerkte workflowgebeurtenis altijd een verwerkingstijd heeft.

create or replace function public.vul_workflow_verwerkt_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if
    new.status = 'verwerkt'
    and new.verwerkt_at is null
  then
    new.verwerkt_at := now();
  end if;

  return new;
end;
$$;

revoke all on function
  public.vul_workflow_verwerkt_at()
from public, anon, authenticated;

drop trigger if exists
  workflow_gebeurtenissen_vul_verwerkt_at
on public.workflow_gebeurtenissen;

create trigger workflow_gebeurtenissen_vul_verwerkt_at
before insert or update of status, verwerkt_at
on public.workflow_gebeurtenissen
for each row
execute function public.vul_workflow_verwerkt_at();
