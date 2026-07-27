# CFME CONTROL — MASTER BUILD MATRIX

**Status:** Bindend  
**Versie:** 1.0  
**Repository:** `cfme-europe/Cfme-property-management`  
**Branch:** `main`  
**Referentiecommit:** `50ab7a3`

---

## 1. DOEL

Deze matrix bepaalt:

- wat bewezen gereed is;
- wat gedeeltelijk gereed is;
- wat nog gebouwd moet worden;
- in welke volgorde wordt gewerkt;
- welke afhankelijkheden gelden;
- wanneer een bouwblok als afgerond geldt.

Een nieuwe ontwikkelsessie mag deze volgorde niet zelfstandig wijzigen.

Legenda:

- `✅ Gereed` — gebouwd, getest, gecommit en gepusht.
- `🟡 Gedeeltelijk` — basis bestaat, maar nieuwe norm is nog niet volledig doorgevoerd.
- `⬜ Gepland` — nog uit te voeren.
- `⛔ Geblokkeerd` — afhankelijkheid ontbreekt.
- `🔒 Bindend` — ontwerpbesluit mag niet ongemerkt wijzigen.

---

## 2. BEWEZEN BASIS

### 0.1 Projectfundament — ✅ Gereed

- Next.js, React en TypeScript.
- Supabase/PostgreSQL.
- GitHub-repository.
- Productiebuild.
- Omgevingsconfiguratie.
- Basisnavigatie en login.

### 0.2 Bedrijven en woningen — ✅ Gereed

- bedrijven;
- woningen;
- woningdossiernummer;
- woningdetails;
- relatie tussen bedrijven en woningen;
- basisvalidatie;
- RLS.

### 0.3 Verhuurperiodes — ✅ Gereed

- maximaal één actieve verhuurperiode per woning;
- huurhistorie;
- beëindiging;
- koppeling aan hurend bedrijf;
- beveiligde mutaties.

### 0.4 Kamers en bewoners — 🟡 Gedeeltelijk

Bewezen:

- kamers;
- capaciteit;
- bewoners;
- kamerplaatsing;
- kamerhistorie;
- in- en uitchecken;
- kamerwissel;
- capaciteitscontrole.

Nieuwe norm gerealiseerd:

- fysieke slaapkamer synchroniseert automatisch met bewonerskamer;
- unieke koppeling via `woning_ruimten.kamer_id`;
- geen dubbele kameraanmaak vanuit routewizard.

Nog nodig:

- kamerinterface herpositioneren als bezettings- en capaciteitsbeheer;
- losse primaire actie “Nieuwe kamer toevoegen” verwijderen of beperken;
- bewonersplaatsing optimaliseren vanuit beschikbare kamers;
- correcte afhandeling van bestaande historische kamers zonder fysieke slaapkamer.

### 0.5 Inspecties en controlesessies — ✅ Gereed

- inspecties;
- controlesessies;
- statussen;
- inspectiefoto’s;
- koppeling inspectie en controlesessie;
- controleurwerkplek;
- voortgang en afronding.

### 0.6 Meldingen, afwijkingen en taken — ✅ Gereed

- meldingen;
- controleafwijkingen;
- automatische opvolging;
- taken;
- prioriteit;
- status;
- herstel;
- hercontrole;
- factuurontvanger;
- deduplicatie.

### 0.7 Meterstanden en energie — ✅ Gereed volgens 9.0A

- meterstanden;
- historische controle;
- gezamenlijke invoer per ruimte;
- vorige stand zichtbaar;
- verbruik per periode;
- per bewoner per week;
- woninghistorisch gemiddelde;
- statussen normaal/verhoogd/kritiek/onwaarschijnlijk;
- verklaring;
- automatisch intelligence-werkpunt;
- automatische melding en taak bij ernstige afwijking;
- dashboard- en rapportagebron.

### 0.8 Rapportageplatform — ✅ Technische basis gereed

- maandrapportages;
- rapportblokken;
- templates en templateversies;
- rapportagemotor;
- PDF;
- Excel;
- exports;
- zakelijke gegevensscheiding;
- interne en externe inhoud;
- energiegegevens;
- meldingen en afwijkingen;
- kosten en risico.

Nog nodig:

- volledige zakelijke eindvorm visueel beoordelen;
- automatisch gegenereerde energieverklaring duidelijk opnemen;
- managementconclusie verder optimaliseren;
- éénpagina-samenvatting als vaste zakelijke norm afronden.

### 0.9 Planning en rayons — 🟡 Gedeeltelijk

Bewezen:

- rayons;
- woning-rayoutetoewijzingen;
- planning;
- controleurwerkplek;
- planningsrechten.

Nog nodig:

- risicogestuurde prioriteitsvoorstellen;
- energieafwijkingen meenemen;
- open urgente meldingen meenemen;
- certificeringen meenemen;
- laatste controledatum meenemen;
- route-efficiëntie en rayon combineren.

### 0.10 Documenten en certificeringen — 🟡 Gedeeltelijk

Bewezen:

- documenten;
- documentversies;
- archief;
- certificeringen;
- vervaldata;
- RLS;
- triggers en views.

Nog nodig:

- objectgerichte koppeling als primaire gebruikersflow;
- automatische relevante documentcategorie vanuit object;
- certificering automatisch voorstellen vanuit objecttype;
- onderhoud, document en certificering in één keten;
- configure-once-principe volledig toepassen.

### 0.11 Intelligence-basis — ✅ Gereed

- woning-DNA;
- controlebriefing;
- intelligence-werkpunten;
- risicoscore;
- energie- en bezettingsanalyse;
- deduplicatie;
- werkpuntstatussen.

Nog nodig:

- integreren in cockpitdashboard;
- betrouwbaarheid en verklaring zichtbaar maken;
- prioriteiten in planning gebruiken;
- terugkerende patronen uitbreiden.

---

## 3. NIEUWE ARCHITECTUURBLOKKEN

### 9.0A Reality Engine + Energy Intelligence — ✅ Gereed

Referentiecommit:

`50ab7a3 — 9.0A reality engine en energy intelligence`

Gerealiseerd:

- slaapkamer wordt automatisch bewonerskamer;
- één fysieke bron van waarheid;
- bestaande kamerrelatie blijft behouden;
- unieke koppeling;
- beveiliging en datagaranties;
- gezamenlijke meterinvoer;
- directe analyse;
- vergelijking per bewoner per week;
- woninghistorie;
- onwaarschijnlijke standherkenning;
- verklaring;
- automatische opvolging;
- automatische melding en taak;
- 29/29 tests;
- lint, build en database-lint groen.

### 9.0B Reality Engine — volledige invoernorm — ⬜ Gepland

Doel:

Alle woningconfiguratie laten voldoen aan:

- werkelijkheid één keer beschrijven;
- automatische standaardroute;
- automatische object- en controlepuntvoorstellen;
- alleen uitzonderingen configureren;
- geen dubbele invoer.

Scope:

- slaapkamer-capaciteit in routewizard;
- kamerbeheer alleen voor bezetting en historie;
- logisch standaardverdiepingsvoorstel;
- grote omhoog/omlaagbediening;
- automatische nummering;
- routepreview;
- activeren in één handeling;
- objectdetails alleen waar noodzakelijk;
- bestaande geavanceerde editor behouden voor uitzonderingen.

Afhankelijkheden:

- 9.0A gereed.

Acceptatie:

- nieuwe woning kan zonder afzonderlijke kamerconfiguratie volledig worden ingericht;
- route, kamers, objecten en controlepunten ontstaan uit één invoer;
- bestaande data blijft behouden;
- geen dubbele kamers.

### 9.0C Inspection Engine — ruimteakkoord — ⬜ Gepland

Doel:

Normale ruimtes met één hoofdhandeling afronden.

Scope:

- “Alles in deze ruimte akkoord”;
- alle standaardcontrolepunten gezamenlijk opslaan;
- afwijking vooraf selecteren;
- alleen afwijkende onderdelen openen;
- automatisch verder;
- eindecontrole met uitsluitend ontbrekende punten en afwijkingen;
- internetvoorzieningen waar mogelijk gezamenlijk akkoord.

Afhankelijkheden:

- 9.0B voor volledige consistente ruimteconfiguratie.

Acceptatie:

- normale woningcontrole vereist aanzienlijk minder handelingen;
- geen afzonderlijke “goed”-actie per standaardcontrolepunt;
- afwijkingen blijven individueel en volledig traceerbaar.

### 9.0D Occupancy Intelligence — ⬜ Gepland

Doel:

Bewonersplaatsing en capaciteit zonder dubbele selectie of zoekwerk.

Scope:

- woning kiezen;
- alleen beschikbare kamers tonen;
- capaciteit en actuele bezetting zichtbaar;
- waarschuwing bij overbezetting;
- snelle kamerwissel;
- bewonershistorie automatisch;
- fysieke slaapkamernaam overal gelijk;
- leegstaande en volle kamers inzichtelijk.

Afhankelijkheden:

- 9.0B.

### 9.0E Maintenance Intelligence — ⬜ Gepland

Doel:

Afwijking, melding, taak, herstel, kosten en facturatie als één keten.

Scope:

- één afwijkingsbron;
- automatische categorie en prioriteit;
- passende melding en taak;
- verantwoordelijke;
- herstelbewijs;
- hercontrole;
- geschatte en werkelijke kosten;
- factuurontvanger;
- doorlooptijd;
- terugkerende schade;
- woning- en objecthistorie.

Afhankelijkheden:

- Inspection Engine;
- bestaande meldingen/takenbasis.

### 9.0F Compliance Intelligence — ⬜ Gepland

Doel:

Objecten automatisch verbinden met documenten, onderhoud en certificeringen.

Scope:

- objecttype bepaalt relevante verplichtingen;
- documenten aan object;
- certificeringen aan object;
- onderhoudshistorie;
- vervaldatum;
- automatische waarschuwing;
- werkpunt en taak;
- bewijs van herstel of herkeuring;
- rapportage.

Afhankelijkheden:

- Reality Engine-objectmodel;
- Maintenance Intelligence.

### 9.0G Planning Intelligence — ⬜ Gepland

Doel:

Het systeem stelt de juiste controlevolgorde voor.

Invoerfactoren:

- laatste controledatum;
- woning-DNA;
- open spoedmeldingen;
- achterstallige taken;
- energieafwijkingen;
- overbezetting;
- verlopen certificeringen;
- rayon;
- reistijd;
- beschikbaarheid controleur.

Uitvoer:

- voorgestelde prioriteit;
- reden;
- aanbevolen datum;
- efficiënte dagroute.

Afhankelijkheden:

- Energy Intelligence;
- Maintenance Intelligence;
- Compliance Intelligence.

### 9.0H Business Intelligence Cockpit — ⬜ Gepland

Doel:

Dashboard wordt een bestuurlijke cockpit in plaats van een menuscherm.

Hoofdonderdelen:

- vandaag geplande controles;
- woningen die aandacht vragen;
- energieafwijkingen;
- open spoedmeldingen;
- achterstallige taken;
- overbezetting;
- verlopen certificeringen;
- kosten;
- rapportages die gereed of achterstallig zijn.

Iedere kaart is direct doorklikbaar naar de oorzaak en actie.

Afhankelijkheden:

- voorgaande intelligence-engines.

### 9.0I Zakelijke rapportage-eindvorm — ⬜ Gepland

Doel:

Volledig automatische, zakelijke en uitlegbare maandrapportage.

Norm:

- vorige situatie;
- huidige situatie;
- verschil;
- actie;
- resultaat;
- financiële en operationele betekenis.

Scope:

- éénpagina-managementsamenvatting;
- energieanalyse en verklaring;
- schades;
- open en opgeloste meldingen;
- herstel;
- kosten;
- factuurontvanger;
- compliance;
- grafieken;
- PDF en Excel;
- extern privacyveilig.

Afhankelijkheden:

- 9.0E t/m 9.0H.

### 9.0J Predictive Intelligence — ⬜ Gepland

Doel:

Betrouwbare voorspellingen op basis van opgebouwde feiten.

Mogelijke signalen:

- lekkagerisico;
- terugkerende schade;
- verhoogd energieverbruik;
- ongebruikelijke controletijd;
- verslechterende woningconditie;
- onderhoudsbehoefte;
- prioriteit voor hercontrole.

Voorwaarde:

- voldoende historische data;
- uitlegbare berekening;
- onzekerheid zichtbaar;
- geen automatische feitelijke conclusie zonder bewijs.

---

## 4. VASTE UITVOERVOLGORDE

De huidige bindende volgorde is:

1. `9.0B` Reality Engine — volledige invoernorm.
2. `9.0C` Inspection Engine — ruimteakkoord.
3. `9.0D` Occupancy Intelligence.
4. `9.0E` Maintenance Intelligence.
5. `9.0F` Compliance Intelligence.
6. `9.0G` Planning Intelligence.
7. `9.0H` Business Intelligence Cockpit.
8. `9.0I` Zakelijke rapportage-eindvorm.
9. `9.0J` Predictive Intelligence.
10. Productiehardening en acceptatietest.

Een afwijking van deze volgorde vereist een expliciete beslissing en actualisatie van dit document.

---

## 5. DOORLOPENDE TECHNISCHE VERPLICHTINGEN

Bij ieder bouwblok:

- database vóór applicatiecode wanneer integriteit of ketenlogica verandert;
- één bron van waarheid;
- geen dubbele invoer;
- RLS en grants controleren;
- auditbaarheid behouden;
- bestaande historie niet beschadigen;
- iPad/iPhone-gebruik bewaken;
- tests uitbreiden;
- geen migraties achteraf wijzigen wanneer remote toegepast;
- `supabase/.temp/` nooit committen;
- terminalopdrachten beginnen met `clear &&`;
- na afronding commit en push.

---

## 6. ACCEPTATIE-EINDDOEL

CFME Control is productiegereed wanneer minimaal bewezen is:

- woningen, bedrijven en verhuurperiodes volledig beheersbaar;
- fysieke woningconfiguratie éénmalig en intuïtief;
- slaapkamers automatisch bewonerskamers;
- bewoners en capaciteit bewaakt;
- controleurflow snel en volledig;
- foto’s en afwijkingen traceerbaar;
- meldingen en taken automatisch gekoppeld;
- energieanalyse direct en uitlegbaar;
- certificeringen en documenten objectgericht;
- planning risicogestuurd;
- dashboard actiegericht;
- zakelijke rapportages automatisch;
- rollen en rechten correct;
- historie intact;
- mobiele werking betrouwbaar;
- tests, lint, build en database-lint groen;
- repository en remote database synchroon.
