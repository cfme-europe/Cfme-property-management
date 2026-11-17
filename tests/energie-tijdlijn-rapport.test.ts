import test from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import fs from 'node:fs';
import { tekenEnergieRapportPagina } from '../src/lib/energie/rapport-pdf';
import { klantSnapshot,type EnergieKlantSnapshot } from '../src/lib/energie/snapshot';
import { bouwTijdlijnRapport } from '../src/lib/energie/tijdlijn-rapport';
import type { TijdlijnPand,TijdlijnPunt } from '../src/lib/energie/tijdlijn';
const punten=Array.from({length:12},(_,i):TijdlijnPunt=>({maand:`2026-${String(i+1).padStart(2,'0')}`,vanaf:'2026-01-01',tot:'2026-02-01',lopend:i===10,verbruik:i===11?null:100+i*10,normaalVerbruik:100,persoonsdagen:70,onbekend:false,dekking:i===10?50:100,naarRato:true,waarschuwingen:[],bronnen:[]}));
const pand:TijdlijnPand={id:1,adres:'Voorbeeldpand',producten:{elektriciteit:punten,gas:punten,water:punten}};
test('customer PDF renders three distinct units and twelve balance rows in one extra page',()=>{
 const saldi={woning_id:1,verhuurperiode_id:1,bedrijf_id:1,adres:'Voorbeeldpand',klant:'Voorbeeldklant',vanaf:'2026-01-01',startsaldo:0,maanden:punten.map((p,i)=>({maand:p.maand,vanaf:p.vanaf,tot:p.tot,lopend:p.lopend,kosten:i===10?null:100,bekend:100,voorschot:150,verschil:i===10?null:50,saldo:i===10?null:i*50,ontbrekend:[],producten:[]}))};
 const tijdlijn=bouwTijdlijnRapport(pand,pand,2026,2025,0,11,true,['elektriciteit','gas','water'],saldi);
 assert.deepEqual(tijdlijn.grafieken.map(g=>g.eenheid),['kWh/persoon/week','m³/persoon/week','liter/persoon/dag']);
 const snapshot:EnergieKlantSnapshot={versie:'test',gegenereerd_op:'2026-11-17',vanaf:'2026-01-01',tot:'2027-01-01',modus:'informatief',producten:[],maatregelen:[],conclusie:'Informatief',tijdlijn};
 const doc=new jsPDF();tekenEnergieRapportPagina(doc,klantSnapshot(snapshot),'Voorbeeldpand');
 assert.equal(doc.getNumberOfPages(),2);
 fs.writeFileSync('/tmp/cfme-rapport-controle.pdf',Buffer.from(doc.output('arraybuffer')));
});
