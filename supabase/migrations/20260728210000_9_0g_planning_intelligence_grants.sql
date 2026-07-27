begin;

grant select
on public.woning_planning_intelligence
to authenticated;

grant select
on public.planning_intelligence_samenvatting
to authenticated;

grant select
on public.rayon_planning_samenvatting
to authenticated;

grant select
on public.controleur_planning_samenvatting
to authenticated;

commit;
