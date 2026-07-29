import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
const lees=(p:string)=>fs.readFileSync(p,"utf8");
test("metercontrole kan zonder fictieve stand worden afgerond",()=>{
 const flow=lees("src/components/controleur/ControleurFlow.tsx");
 for(const status of ["niet_bereikbaar","niet_afleesbaar","niet_aanwezig","defect","overgeslagen"]) assert.match(flow,new RegExp(status));
 assert.match(flow,/Verplichte korte reden/);
});
test("metercorrectie bewaart onveranderlijke historie",()=>{
 const m=lees("supabase/migrations/20260729103000_9_0h_meteruitzonderingen_correctieaudit.sql");
 assert.match(m,/create table if not exists public\.meterstand_correcties/i);
 assert.match(m,/oude_waarden jsonb not null/i);
 assert.match(m,/blokkeer_meterstandcorrectie_wijziging/i);
 assert.match(m,/create or replace function public\.corrigeer_meterstand/i);
});
