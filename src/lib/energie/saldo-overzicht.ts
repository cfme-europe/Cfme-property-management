import type { PandSaldo } from './voorschotten';
/** Presentation totals only: use saved cumulative balances, never restart at a filter. */
export function saldoOverzicht(saldi: PandSaldo[], ids: number[], jaar: number, van: number, tot: number, maand: number) {
  const vanaf = `${jaar}-${String(van+1).padStart(2,'0')}`;
  const totKey = `${jaar}-${String(Math.min(tot,maand)+1).padStart(2,'0')}`;
  const groepen = saldi.filter(p=>ids.includes(p.woning_id)).map(p=>({p, rijen:p.maanden.filter(m=>m.maand>=vanaf && m.maand<=totKey && !m.lopend)})).filter(g=>g.rijen.length);
  const ontbrekend = ids.filter(id=>!groepen.some(g=>g.p.woning_id===id)).length;
  const rijen = groepen.flatMap(g=>g.rijen);
  const som = (veld:'kosten'|'voorschot') => !rijen.length || ontbrekend || rijen.some(m=>m[veld]===null) ? null : rijen.reduce((s,m)=>s+m[veld]!,0);
  const eind = groepen.map(g=>g.rijen[g.rijen.length-1].saldo);
  const begin = groepen.map(g=>{const eerste=g.rijen[0];return eerste.saldo===null || eerste.verschil===null ? null : eerste.saldo-eerste.verschil;});
  const totaal = (v:(number|null)[])=> !v.length || ontbrekend || v.some(x=>x===null) ? null : v.reduce<number>((s,x)=>s+x!,0);
  return {kosten:som('kosten'),voorschot:som('voorschot'),saldo:totaal(eind),beginsaldo:totaal(begin),ontbrekend,van:rijen.map(m=>m.maand).sort()[0]??vanaf,tot:rijen.map(m=>m.maand).sort().at(-1)??totKey,heeftMaanden:rijen.length>0};
}
