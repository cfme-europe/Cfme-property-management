# CFME CONTROL — MASTER ARCHITECTURE

**Status:** Bindend  
**Versie:** 1.0  
**Vastgelegd na:** Bouwblok 9.0A  
**Repository:** `cfme-europe/Cfme-property-management`  
**Hoofdbranch:** `main`  
**Referentiecommit:** `50ab7a3`

---

## 1. FUNCTIE VAN DIT DOCUMENT

Dit document bevat de bindende architectuur, ontwerpprincipes en ontwikkelregels van CFME Control.

Het is geen brainstormdocument en geen vrijblijvende richting.

Bij iedere nieuwe ontwikkelsessie, overdracht, inventarisatie, wijziging of uitbreiding geldt:

1. repository en database zijn de technische waarheid;
2. dit document is de architecturale waarheid;
3. de Master Build Matrix bepaalt de bouwvolgorde;
4. het Current Build Package bepaalt de actuele scope;
5. een nieuwe chat mag doelstellingen niet opnieuw interpreteren, verbreden, verkleinen of vervangen;
6. bestaande ontwerpbesluiten blijven geldig totdat de gebruiker ze expliciet wijzigt;
7. proces- of architectuurwijzigingen worden nooit ongemerkt tijdens een actief bouwblok ingevoerd.

Bij een conflict tussen oude toelichting en dit document geldt dit document, tenzij repository of database aantoonbaar een nieuwere expliciet goedgekeurde beslissing bevat.

---

## 2. ORGANISATIE EN BEDRIJFSCONTEXT

CFME staat voor Complete Facility Management Europe.

CFME beheert en verhuurt woningen aan bedrijven en uitzendbureaus die arbeidsmigranten huisvesten.

De organisatie:

- bezit of huurt woningen;
- verhuurt volledige woningen aan precies één bedrijf tegelijk;
- richt woningen in;
- beheert kamers, capaciteit, slaapplaatsen en bewoners;
- registreert verhuurperiodes en historie;
- voert periodieke woningcontroles uit;
- verwerkt afwijkingen, meldingen, schades, taken en herstel;
- registreert meterstanden;
- analyseert energie- en waterverbruik;
- beheert documenten en certificeringen;
- plant werkzaamheden en controles;
- genereert zakelijke maandrapportages;
- bewaakt kosten, factuurontvangers, risico’s en compliance.

Het systeem moet geschikt zijn voor sterke groei en mag niet afhankelijk zijn van het huidige aantal woningen.

---

## 3. CENTRALE PRODUCTVISIE

CFME Control is geen traditionele registratie-app.

CFME Control is een intelligenceplatform dat:

1. de werkelijkheid één keer vastlegt;
2. dagelijkse handelingen minimaliseert;
3. gegevens automatisch koppelt;
4. uitzonderingen direct herkent;
5. passende opvolging automatisch start;
6. managementinformatie en rapportages automatisch opbouwt;
7. gebruikers helpt beslissen zonder de menselijke eindverantwoordelijkheid over te nemen.

De gebruiker voert feiten in.

Het systeem:

- legt relaties;
- bewaakt historie;
- controleert plausibiliteit;
- herkent afwijkingen;
- maakt vervolgacties;
- berekent trends;
- stelt prioriteiten;
- voedt dashboards;
- bouwt rapportages.

---

## 4. HOOFDREGEL: GEEN DUBBELE INVOER

Iedere feitelijke invoer mag maximaal één keer plaatsvinden.

Alle andere weergaven, relaties en vervolgprocessen ontstaan automatisch uit dezelfde bron.

Voorbeelden:

- een fysieke slaapkamer wordt automatisch een bewonerskamer;
- de slaapkamer en bewonerskamer blijven blijvend gekoppeld;
- capaciteit wordt niet afzonderlijk op meerdere plaatsen beheerd;
- een meter wordt eenmaal op zijn fysieke locatie geconfigureerd;
- dezelfde meter wordt daarna gebruikt voor controle, historie, analyse, dashboard en rapportage;
- een afwijking wordt eenmaal geregistreerd;
- melding, taak, schade, herstel, kosten en rapportage gebruiken dezelfde afwijkingsketen;
- bewonersaantallen worden uit bestaande bewonersgegevens gehaald en niet opnieuw gevraagd wanneer het systeem ze al kent;
- woning-, bedrijfs- en verhuurgegevens worden niet opnieuw in rapportages ingevoerd.

Wanneer een ontwerp dubbele invoer vereist, is het ontwerp niet gereed voor uitvoering.

---

## 5. BINDENDE ONTWERPPRINCIPES

### 5.1 Reality First

De gebruiker beschrijft de fysieke en operationele werkelijkheid, niet de databasestructuur.

De interface gebruikt begrijpelijke begrippen zoals:

- woning;
- verdieping;
- ruimte;
- slaapkamer;
- object;
- meter;
- bewoner;
- controle;
- afwijking;
- herstel.

Technische sleutels, koppeltabellen en interne codes blijven buiten de normale gebruikersflow.

### 5.2 Configure Once

Gegevens die langdurig geldig zijn, worden eenmaal geconfigureerd.

Voorbeelden:

- woningindeling;
- fysieke looproute;
- ruimtevolgorde;
- objectlocatie;
- meterlocatie;
- installaties;
- relevante controlepunten;
- capaciteit van slaapkamers.

Daarna hergebruikt het systeem deze configuratie automatisch.

### 5.3 Normal Flow First

De interface gaat uit van de normale situatie.

Een ruimte zonder problemen moet met zo weinig mogelijk handelingen kunnen worden afgerond.

De normale flow mag niet worden vertraagd door formulieren die alleen bij uitzonderingen nodig zijn.

### 5.4 Exception Driven

Extra invoer verschijnt alleen wanneer een afwijking of bijzondere situatie dit noodzakelijk maakt.

Bijvoorbeeld:

- normaal: één akkoordhandeling;
- afwijking: type, toelichting, foto en urgentie;
- normaal energieverbruik: automatisch verder;
- afwijkend energieverbruik: analyse en verklaring;
- werkende internetvoorzieningen: één akkoordhandeling;
- storing: toelichting en opvolging.

### 5.5 Think Before Asking

Voordat de gebruiker iets moet invullen, controleert het systeem of het antwoord al bekend of veilig afleidbaar is.

Het systeem vraagt niet opnieuw om:

- woning;
- huidige verhuurder;
- bekende bewoners;
- bewonersaantal;
- vorige meterstand;
- gekoppelde ruimte;
- controlesessie;
- inspectie;
- datum;
- routepositie;
- bestaande objectgegevens.

### 5.6 Automatic Linking

Iedere invoer wordt automatisch gekoppeld aan alle relevante onderdelen.

Voorbeeldketen:

`woning → ruimte → object → controlepunt → resultaat → afwijking → foto → melding/taak → herstel → kosten → factuurontvanger → rapportage`

Voor energie:

`meterobject → meteropname → verbruik → bewonersnormalisatie → afwijking → verklaring → werkpunt → melding/taak → dashboard → rapportage`

### 5.7 Intelligence First

Het systeem registreert niet alleen gegevens, maar analyseert ze onmiddellijk waar dit betrouwbaar mogelijk is.

Intelligentie moet:

- uitlegbaar zijn;
- gebaseerd zijn op feiten;
- onzekerheid zichtbaar maken;
- nooit feiten verzinnen;
- nooit automatisch een definitief menselijk oordeel simuleren;
- passende vervolgstappen voorstellen of starten.

### 5.8 Minimal Interaction

Bij iedere functie wordt vooraf bepaald hoe hetzelfde resultaat met minder handelingen kan worden bereikt.

Voorkeur:

- één gezamenlijke opslag boven meerdere afzonderlijke opslaghandelingen;
- automatische standaardwaarden boven herhaalde keuzes;
- één ruimtelijke akkoordactie boven een reeks losse “goed”-knoppen;
- automatische volgende stap boven een onnodige vervolgknop;
- grote aanraakvlakken boven kleine bedieningselementen.

### 5.9 One Source of Truth

Per feit bestaat precies één gezaghebbende bron.

Voorbeelden:

- fysieke woningstructuur: `woning_verdiepingen`, `woning_ruimten`, `woning_objecten`;
- bewonerskamer: gekoppeld aan fysieke slaapkamer;
- bewonersplaatsing: `bewoners` en kamerhistorie;
- controle-uitkomst: controle-resultaat;
- afwijking: controle-afwijking;
- energieopname: meterstand;
- energieanalyse: opgeslagen analyse bij de meterstand;
- verhuursituatie: actieve verhuurperiode;
- rapportage: afgeleide formele rapportagedata.

Afgeleide gegevens mogen worden opgeslagen voor snelheid, historie of bewijs, maar moeten naar hun bron herleidbaar blijven.

### 5.10 History Is Never Destroyed

Productiegegevens worden niet fysiek verwijderd wanneer historie operationeel, juridisch of financieel relevant is.

Gebruik waar passend:

- actief/inactief;
- statusovergangen;
- begin- en einddatums;
- snapshots;
- archivering;
- auditlog.

---

## 6. FUNCTIONELE ENGINES

CFME Control wordt als één platform ontwikkeld met onderling verbonden engines.

### 6.1 Reality Engine

Beschrijft de werkelijkheid van de woning:

- woning;
- verdiepingen;
- binnen- en buitenruimten;
- looproute;
- slaapkamers;
- bewonerskamers;
- capaciteit;
- objecten;
- meters;
- internetvoorzieningen;
- installaties;
- relevante controlepunten.

De Reality Engine is de basis voor alle andere engines.

### 6.2 Inspection Engine

Ondersteunt de controleur:

- geplande controles;
- woningbriefing;
- fysieke route;
- controle per ruimte;
- groepsgewijze akkoordhandeling;
- extra invoer alleen bij afwijkingen;
- foto’s;
- meteropname;
- internetcontrole;
- voortgang;
- verplichte volledigheidscontrole;
- afronding.

### 6.3 Energy Intelligence

Verwerkt:

- gezamenlijke meteropname;
- vorige standen;
- verbruik per periode;
- normalisatie per bewoner per week;
- vergelijking met woninghistorie;
- plausibiliteitscontrole;
- status:
  - onvoldoende data;
  - normaal;
  - verhoogd;
  - kritiek;
  - onwaarschijnlijk;
- directe terugkoppeling aan de controleur;
- verklaring;
- gededupliceerde opvolging;
- dashboard- en rapportagesignalen.

### 6.4 Maintenance Intelligence

Verbindt:

- afwijkingen;
- meldingen;
- schades;
- taken;
- verantwoordelijke;
- herstel;
- hercontrole;
- kosten;
- factuurontvanger;
- doorlooptijd;
- terugkerende problemen.

### 6.5 Compliance Intelligence

Verbindt objecten en woningen met:

- certificeringen;
- keuringen;
- onderhoudsverplichtingen;
- documenten;
- vervaldatums;
- waarschuwingen;
- bewijs van herstel of herkeuring.

### 6.6 Business Intelligence

Levert:

- dashboard;
- KPI’s;
- risico-overzicht;
- woning-DNA;
- trends;
- energieafwijkingen;
- open meldingen;
- achterstallige taken;
- compliance;
- kosten;
- zakelijke maandrapportages;
- PDF- en Excel-export.

### 6.7 Predictive Intelligence

Wordt alleen toegevoegd op basis van voldoende betrouwbare gegevens.

Mogelijke functies:

- terugkerende schade voorspellen;
- lekkagerisico herkennen;
- prioriteit van controles voorstellen;
- ongebruikelijke controletijden signaleren;
- stijgende energietrends herkennen;
- onderhoudsbehoefte voorspellen.

Voorspellingen blijven altijd uitlegbaar en worden niet als bewezen feiten weergegeven.

---

## 7. DEFINITIEVE WONINGKETEN

De bindende gegevensketen is:

`woning`
→ `verdieping`
→ `fysieke looproute`
→ `ruimte`
→ `object`
→ `controlepunt`
→ `controle-resultaat`
→ `afwijking`
→ `foto`
→ `melding en/of taak`
→ `herstel`
→ `hercontrole`
→ `kosten`
→ `factuurontvanger`
→ `maandrapportage`
→ `managementinformatie`

Geen nieuw onderdeel mag deze keten dupliceren of omzeilen zonder expliciete architectuurbeslissing.

---

## 8. WONINGCONFIGURATIE EN LOOPROUTE

### 8.1 Werkelijke route

De controle start bij de toegangsdeur en volgt de fysieke looproute van de woning.

Voorbeeld:

1. voordeur en gevel;
2. entree;
3. hal;
4. meterkast;
5. woonkamer;
6. keuken;
7. toilet;
8. trap;
9. overloop;
10. slaapkamers;
11. badkamer;
12. buitenruimte;
13. berging;
14. containerplaats.

De route is per woning configureerbaar.

### 8.2 Geen aantallimieten

Er gelden geen kunstmatige limieten voor:

- verdiepingen;
- ruimten;
- slaapkamers;
- badkamers;
- toiletten;
- keukens;
- technische ruimten;
- buitenruimten;
- rookmelders;
- brandblussers;
- meters;
- ketels;
- boilers;
- internetvoorzieningen;
- overige objecten.

Meerdere gelijke objecten in dezelfde ruimte moeten individueel herkenbaar en historisch gevolgd kunnen worden.

### 8.3 Slaapkamer en bewonerskamer

Een fysieke ruimte met type `slaapkamer` heeft automatisch precies één gekoppelde bewonerskamer.

Bindende regels:

- geen losse dubbele kameraanmaak;
- koppeling via `woning_ruimten.kamer_id`;
- één bewonerskamer kan aan maximaal één fysieke ruimte gekoppeld zijn;
- kamer en ruimte behoren altijd tot dezelfde woning;
- bestaande capaciteit en bewonershistorie blijven behouden;
- een slaapkamer met actieve bewoners mag niet onveilig worden ontkoppeld of gedeactiveerd;
- kamerbeheer richt zich op capaciteit, bewoners, bezetting en historie;
- woningconfiguratie bepaalt de fysieke slaapkamer en route.

---

## 9. CONTROLEURFLOW

### 9.1 Gebruikersdoel

De controleur moet de woning correct en volledig kunnen controleren met minimale administratieve belasting.

### 9.2 Ruimtegebaseerde uitvoering

De controleur ziet per stap:

- actuele ruimte;
- route-instructie;
- alleen relevante controlepunten;
- aanwezige objecten;
- noodzakelijke invoer.

### 9.3 Normale ruimte

De uiteindelijke norm is:

- één actie voor “alles akkoord” waar dit veilig kan;
- afzonderlijke invoer alleen voor uitzonderingen;
- automatische opslag;
- automatisch doorgaan zodra alle verplichte handelingen compleet zijn.

### 9.4 Afwijking

Bij een afwijking verschijnt alleen relevante invoer:

- gebrekstype;
- toelichting;
- urgentie;
- foto indien vereist;
- automatische melding en/of taak volgens configuratie;
- eventuele kosten en factuurverantwoordelijkheid in opvolging.

### 9.5 Meterlocatie

Alle aanwezige meters in dezelfde ruimte worden gezamenlijk ingevoerd.

De controleur:

1. ziet de vorige stand;
2. vult alle actuele standen in;
3. gebruikt één knop voor opslaan en analyseren;
4. ziet onmiddellijk het berekende verbruik;
5. ziet onmiddellijk of het verbruik normaal, verhoogd, kritiek of onwaarschijnlijk is;
6. geeft alleen bij afwijking een verklaring;
7. hoeft geen afzonderlijke melding of taak handmatig te maken wanneer automatische opvolging van toepassing is.

### 9.6 Internetvoorzieningen

Internetvoorzieningen worden met minimale keuzes gecontroleerd:

- werkt;
- storing;
- niet aanwezig.

Bij storing opent uitsluitend de noodzakelijke afwijkingsinvoer.

---

## 10. ENERGY INTELLIGENCE-STANDAARD

### 10.1 Berekening

De analyse gebruikt waar beschikbaar:

- huidige en vorige meterstand;
- aantal dagen tussen opnames;
- totaalverbruik;
- gemiddelde bewonersbezetting;
- verbruik per bewoner per week;
- historische periodes van dezelfde woning;
- afwijkingspercentage;
- technische plausibiliteit.

### 10.2 Betrouwbaarheid

Een vergelijking wordt niet als betrouwbaar gepresenteerd wanneer onvoldoende historie bestaat.

Teruglopende meterstanden worden als onwaarschijnlijk aangemerkt, tenzij een toekomstige expliciete meterwisselregistratie dit verklaart.

### 10.3 Drempels

De huidige formele standaard gebruikt:

- minder dan 20% boven historisch gemiddelde: normaal;
- vanaf 20%: verhoogd;
- vanaf 35%: kritiek;
- extreme of technisch onwaarschijnlijke uitkomst: onwaarschijnlijk.

Deze drempels mogen later configureerbaar worden, maar niet stilzwijgend veranderen.

### 10.4 Verklaring

Bij afwijking kan de controleur kiezen uit onder andere:

- meer bewoners of bezoekers;
- koude periode;
- extra verwarming;
- lekkage vermoed;
- installatie of apparatuur defect;
- meterstand mogelijk verkeerd;
- ander verklaarbaar gebruik;
- geen verklaring;
- overig.

Alleen feitelijk vastgestelde verklaringen worden gekozen.

### 10.5 Opvolging

- verhoogd: intern werkpunt;
- kritiek: werkpunt, melding en taak;
- onwaarschijnlijk: werkpunt, melding en controletaak;
- opvolging is gededupliceerd per meteropname;
- een latere verklaring actualiseert dezelfde opvolging;
- een herstelde normale analyse mag bestaande automatische opvolging passend sluiten.

---

## 11. RAPPORTAGESTANDAARD

Zakelijke rapportage beantwoordt compact:

1. wat was de vorige situatie;
2. wat is de huidige situatie;
3. wat is veranderd;
4. welke actie is uitgevoerd of nodig;
5. wat is het resultaat;
6. wat is de operationele of financiële betekenis.

Vaste onderdelen kunnen omvatten:

- algemene toestand;
- orde en netheid;
- schades;
- open en opgeloste meldingen;
- taken;
- afwijkingen;
- energie- en waterverbruik;
- verbruik per bewoner per week;
- afwijking ten opzichte van eerdere perioden;
- kosten;
- factuurontvanger;
- compliance;
- zakelijke conclusie.

Externe rapportages tonen geen onnodige persoonsgegevens of interne informatie.

---

## 12. ROLLEN EN BEVEILIGING

CFME Control gebruikt PostgreSQL/Supabase RLS als primaire gegevensbeveiliging.

Rollen omvatten onder andere:

- admin;
- management;
- planner;
- controleur;
- beheerder/administratie;
- rapportage;
- alleen-lezen.

Bindende principes:

- `management` erft de relevante operationele rechten;
- `admin` blijft exclusief voor systeembeheer;
- de laatste actieve admin wordt beschermd;
- interne werkpunten blijven intern;
- vertrouwelijke en externe gegevens worden gescheiden;
- publieke toegang wordt nooit toegevoegd als snelle oplossing;
- `security definer`-functies krijgen een vaste `search_path`;
- functierechten worden expliciet ingetrokken en uitsluitend gericht verleend;
- mutaties blijven auditbaar.

---

## 13. TECHNISCHE ARCHITECTUUR

### 13.1 Stack

- Next.js;
- React;
- TypeScript;
- Supabase;
- PostgreSQL;
- Row Level Security;
- SQL-migraties;
- Git/GitHub.

### 13.2 Laagverdeling

- `src/app`: routes en pagina-assemblage;
- `src/components`: gebruikersinterface;
- `src/services`: gegevens- en businesslogica;
- `src/types`: formele TypeScript-contracten;
- `supabase/migrations`: databasearchitectuur;
- `tests`: keten-, regressie- en architectuurtests;
- `docs`: bindende architectuur, bouwmatrix en actuele scope.

### 13.3 Scheidingsregels

- geen SQL in pagina’s;
- geen complexe businesslogica in presentational components;
- databaseconstraints voor kritieke gegevensintegriteit;
- services voor applicatieketens;
- componenten voor gebruikersinteractie;
- rapportage gebruikt formele afgeleide data;
- geen duplicatie van berekeningslogica wanneer één centrale motor mogelijk is.

### 13.4 Migratieregels

Migraties zijn:

- oplopend gedateerd;
- idempotent waar passend;
- voorzien van expliciete constraints en indexen;
- veilig voor bestaande data;
- voorzien van RLS en grants waar nodig;
- eerst dry-run;
- daarna remote push;
- daarna schema-dump en lint;
- nooit gewijzigd nadat ze remote zijn uitgevoerd; correcties krijgen een nieuwe migratie.

---

## 14. UX-STANDAARD VOOR IPAD EN IPHONE

De primaire werkomgeving omvat iPad/Safari en mobiele apparaten.

Daarom gelden:

- grote aanraakvlakken;
- duidelijke hoofdacties;
- minimale modals;
- korte formulieren;
- logische standaardwaarden;
- weinig horizontale interactie;
- geen afhankelijkheid van hover;
- voorspelbare navigatie;
- duidelijke foutmeldingen;
- snelle foto-upload;
- automatische opslag waar veilig;
- geen kleine sleepbediening als betrouwbare knoppen beter werken;
- terminalopdrachten beginnen met `clear &&` om eerdere uitvoer te verwijderen.

---

## 15. BINDENDE ONTWIKKELWERKWIJZE

### 15.1 Bron van waarheid

Voor technische feiten:

1. actuele repository;
2. actuele database;
3. gecommitteerde documentatie.

Niet gokken.

### 15.2 Bouwblokken

Per bouwblok:

1. één gerichte inventarisatie;
2. één definitief ketenontwerp;
3. één samenhangend uitvoeringspakket;
4. één gecombineerde eindcontrole;
5. commit en push.

Geen herhaalde algemene inventarisaties en geen fout-voor-fout improvisatie.

### 15.3 Volledige kwaliteitscontrole

Een bouwblok wordt pas afgerond na relevante controles:

- `git diff --check`;
- tests;
- ESLint;
- TypeScript/productiebuild;
- database-lint;
- Supabase dry-run;
- migratiestatus;
- Git-status;
- commit;
- push.

### 15.4 Codekwaliteit

Wanneer gegenereerde code meerdere fouten bevat, wordt het volledige betrokken bestand of bouwpakket opnieuw gecontroleerd.

Niet eindeloos losse symptomen repareren.

### 15.5 Actieve scope

Tijdens een actief bouwblok:

- geen nieuwe algemene architectuur;
- geen onverwachte functievergroting;
- geen zijpaden;
- geen proceswijzigingen;
- geen wijziging van bewezen doelstellingen.

Nieuwe ideeën worden in de Master Build Matrix geplaatst voor een later bouwblok.

### 15.6 Communicatie

Communicatie is:

- Nederlands;
- zakelijk;
- kort;
- gebaseerd op bewijs;
- één concrete actie per antwoord wanneer de gebruiker handelingen uitvoert.

Gebruik waar passend:

- **Bewezen**
- **ACTIE**
- **VRAAG**

---

## 16. OVERDRACHT NAAR EEN NIEUWE CHAT

Een nieuwe chat start nooit met een vrije herinterpretatie van het project.

De nieuwe sessie moet eerst raadplegen:

1. `docs/CFME_MASTER_ARCHITECTURE.md`;
2. `docs/MASTER_BUILD_MATRIX.md`;
3. `docs/CURRENT_BUILD_PACKAGE.md`;
4. actuele `git log`;
5. actuele `git status`;
6. alleen de bestanden die voor het actieve bouwblok relevant zijn.

De nieuwe chat:

- neemt de bestaande architectuur over;
- verandert geen doelstellingen;
- begint geen algemene inventarisatie zonder aantoonbare aanleiding;
- herhaalt geen reeds bewezen controles;
- werkt verder vanaf de vastgelegde commit;
- meldt expliciet wanneer repository, database en documentatie niet overeenkomen.

---

## 17. BEWEZEN STATUS NA BOUWBLOK 9.0A

Referentiecommit:

`50ab7a3 — 9.0A reality engine en energy intelligence`

Bewezen gerealiseerd:

- fysieke slaapkamer synchroniseert automatisch met bewonerskamer;
- unieke slaapkamer-kamerkoppeling;
- bescherming van bestaande bewonerskoppelingen;
- routewizard behoudt bestaande kamerrelatie;
- gezamenlijke meteropname per ruimte;
- vorige meterstanden zichtbaar;
- directe centrale Energy Intelligence-analyse;
- verbruik per bewoner per week;
- vergelijking met woninghistorie;
- herkenning van teruglopende/onwaarschijnlijke standen;
- verklaring bij afwijkend verbruik;
- opgeslagen analyse bij meteropname;
- gededupliceerd intelligence-werkpunt;
- automatische melding en taak bij kritieke of onwaarschijnlijke afwijking;
- 29 van 29 tests geslaagd;
- ESLint schoon;
- productiebuild schoon;
- database-lint schoon;
- remote database volledig bijgewerkt.

---

## 18. WIJZIGINGSBEHEER

Dit document mag alleen inhoudelijk worden gewijzigd wanneer:

1. de gebruiker een architectuurwijziging expliciet goedkeurt;
2. de wijziging buiten een actief bouwblok wordt vastgelegd;
3. de Master Build Matrix en het Current Build Package worden bijgewerkt;
4. de wijziging wordt getest, gecommit en gepusht.

Een assistent mag dit document nooit zelfstandig herschrijven om een andere ontwikkelmethode, productvisie of module-indeling te introduceren.

