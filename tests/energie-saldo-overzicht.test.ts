import test from 'node:test';
import assert from 'node:assert/strict';
import { saldoOverzicht } from '../src/lib/energie/saldo-overzicht';
import type { PandSaldo } from '../src/lib/energie/voorschotten';
const p: PandSaldo = {woning_id:1, verhuurperiode_id:1,bedrijf_id:1,adres:'Pand',klant:'Klant',vanaf:'2025-12-01',startsaldo:50,maanden:[
  {maand:'2025-12',vanaf:'2025-12-01',tot:'2026-01-01',lopend:false,kosten:80,bekend:80,voorschot:100,verschil:20,saldo:70,ontbrekend:[],producten:[]},
  {maand:'2026-01',vanaf:'2026-01-01',tot:'2026-02-01',lopend:false,kosten:120,bekend:120,voorschot:100,verschil:-20,saldo:50,ontbrekend:[],producten:[]},
  {maand:'2026-02',vanaf:'2026-02-01',tot:'2026-02-17',lopend:true,kosten:40,bekend:40,voorschot:50,verschil:10,saldo:60,ontbrekend:[],producten:[]},
]};
test('summary excludes current month and preserves balance carried across years',()=>{
 const r=saldoOverzicht([p],[1],2026,0,11,1);
 assert.equal(r.voorschot,100);assert.equal(r.kosten,120);assert.equal(r.beginsaldo,70);assert.equal(r.saldo,50);assert.equal(r.tot,'2026-01');
 assert.equal(r.beginsaldo!+r.voorschot!-r.kosten!,r.saldo);
});
test('missing property or price never becomes zero or a complete saldo',()=>{
 assert.equal(saldoOverzicht([p],[1,2],2026,0,11,1).saldo,null);
 const missing=structuredClone(p);missing.maanden[1].kosten=null;missing.maanden[1].saldo=null;
 const r=saldoOverzicht([missing],[1],2026,0,11,1);assert.equal(r.kosten,null);assert.equal(r.saldo,null);assert.equal(r.voorschot,100);
});
test('no closed month in selected range stays unknown',()=>{
 const r=saldoOverzicht([p],[1],2026,1,1,1);assert.equal(r.heeftMaanden,false);assert.equal(r.voorschot,null);assert.equal(r.saldo,null);
});
