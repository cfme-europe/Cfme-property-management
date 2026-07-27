# CFME CONTROL — CURRENT BUILD PACKAGE

**Status:** Actief overdrachtspunt
**Versie:** 1.0
**Datum:** 27 juli 2026
**Repository:** cfme-europe/Cfme-property-management
**Branch:** main
**HEAD:** 50ab7a3
**Laatste afgeronde bouwblok:** 9.0C Inspection Engine — ruimteakkoord
**Eerstvolgende bouwblok:** 9.0D Occupancy Intelligence

---

## 1. VERPLICHT STARTPROTOCOL

Een nieuwe ontwikkelsessie moet eerst volledig lezen:

1. docs/CFME_MASTER_ARCHITECTURE.md
2. docs/MASTER_BUILD_MATRIX.md
3. docs/CURRENT_BUILD_PACKAGE.md

Voer daarna uit:

    clear && \
    cd /workspaces/Cfme-property-management && \
    git status --short && \
    git log --oneline -5 && \
    git branch --show-current

Verwachte positie:

- branch main;
- HEAD 50ab7a3;
- gelijk met origin/main;
- alleen supabase/.temp/ lokaal en untracked;
- geen functionele lokale wijzigingen.

Bij een andere uitkomst: stoppen, afwijking benoemen en eerst de werkelijke staat bewijzen.

---

## 2. BINDENDE WERKWIJZE

- Communiceer uitsluitend in het Nederlands.
- Werk kort, zakelijk en bewijsgericht.
- Repository, database en masterdocumenten zijn leidend.
- Geen nieuwe brainstorm of herontwerp.
- Geen algemene herinventarisatie zonder aantoonbare aanleiding.
- Eén gerichte inventarisatie per bouwblok.
- Daarna één compleet en vooruitgedacht uitvoeringspakket.
- Geen dubbele invoer.
- Zo weinig mogelijk gebruikershandelingen.
- Database vóór applicatiecode wanneer gegevensintegriteit verandert.
- Geen losse microreparaties bij pakketbrede kwaliteitsproblemen.
- Terminalopdrachten beginnen altijd met clear &&.
- supabase/.temp/ wordt nooit gecommit.
- Remote uitgevoerde migraties worden nooit achteraf gewijzigd.
- Na ieder bouwblok: tests, lint, build, database-lint, dry-run, commit en push.

---

## 3. BEWEZEN AFGEROND — BOUWBLOK 9.0A

Commit:

    50ab7a3 9.0A reality engine en energy intelligence

### Reality Engine

Bewezen:

- een fysieke slaapkamer maakt automatisch een bewonerskamer;
- koppeling via woning_ruimten.kamer_id;
- één bewonerskamer kan maar aan één fysieke ruimte gekoppeld zijn;
- ruimte en kamer moeten bij dezelfde woning horen;
- bestaande slaapkamer-kamerkoppeling blijft bij wijziging behouden;
- actieve bewoners beschermen tegen onveilige ontkoppeling;
- synchronisatie wordt databasebreed afgedwongen;
- anon heeft geen toegang tot de synchronisatiefunctie.

Migraties:

- 20260727170000_9_0a1_reality_slaapkamer_kamer.sql
- 20260727171500_9_0a2_reality_koppeling_hardening.sql

### Energy Intelligence

Bewezen:

- alle meters in dezelfde ruimte worden gezamenlijk ingevoerd;
- één opslaghandeling;
- vorige standen zichtbaar;
- verbruik per periode;
- verbruik per bewoner per week;
- vergelijking met historische perioden van dezelfde woning;
- statussen onvoldoende data, normaal, verhoogd, kritiek en onwaarschijnlijk;
- teruglopende meterstanden worden herkend;
- analyse wordt bij de meteropname opgeslagen;
- controleur ziet de analyse direct;
- alleen bij afwijking wordt een verklaring gevraagd;
- automatische gededupliceerde opvolging;
- verhoogd geeft een intern werkpunt;
- kritiek en onwaarschijnlijk geven werkpunt, melding en taak;
- een latere verklaring actualiseert dezelfde opvolging.

Migraties:

- 20260727173000_9_0a3_energy_intelligence.sql
- 20260727180000_9_0a4_energy_automatische_opvolging.sql

Belangrijkste applicatiebestanden:

- src/components/controleur/ControleurFlow.tsx
- src/components/woningconfiguratie/WoningrouteWizard.tsx
- src/services/energy-intelligence.ts
- src/services/meterstanden.ts
- src/types/meterstand.ts
- tests/controleur-rapportage-keten.test.ts

Eindcontrole:

- 29 van 29 tests geslaagd;
- ESLint schoon;
- TypeScript schoon;
- productiebuild schoon;
- database-lint schoon;
- remote database up-to-date;
- commit en push geslaagd.

---

## 4. ACTIEF VOLGEND BOUWBLOK — 9.0B

### Naam

Reality Engine — volledige invoernorm

### Hoofddoel

De gebruiker beschrijft de woning één keer.

Het systeem maakt automatisch:

- fysieke ruimten;
- verdiepingskoppelingen;
- looproute;
- slaapkamers en bewonerskamers;
- standaardobjecten;
- relevante controlepunten;
- routepreview.

Geen dubbele invoer en geen databasegerichte gebruikersflow.

---

## 5. PROBLEEM DAT 9.0B OPLOST

De routewizard is al verbeterd, maar vraagt nog te veel afzonderlijke configuratie:

- slaapkamer en capaciteit zijn nog niet volledig één invoer;
- objecten en controlepunten vragen nog veel keuzes;
- verdieping en routevolgorde kunnen intuïtiever;
- de kamerpagina suggereert nog zelfstandige kameraanmaak;
- normale configuratie en geavanceerd technisch beheer zijn nog onvoldoende gescheiden.

---

## 6. BINDEND DOELONTWERP 9.0B

### Stap 1 — Aanwezige ruimten

Eén scherm met ruimtecategorieën en aantallen:

- entree;
- hal;
- gang;
- woonkamer;
- keuken;
- toilet;
- badkamer;
- slaapkamer;
- trap;
- overloop;
- berging;
- technische ruimte;
- zolder;
- kelder;
- overige ruimte;
- buitenruimten.

Bediening met grote plus- en minknoppen.

### Stap 2 — Automatische route

Het systeem maakt een eerste logische route.

De gebruiker corrigeert alleen uitzonderingen met:

- omhoog;
- omlaag;
- verplaats na.

Geen handmatige routenummers.

### Stap 3 — Verdieping

Het systeem stelt een logische verdieping voor.

De gebruiker wijzigt alleen uitzonderingen.

### Stap 4 — Noodzakelijke details

Per ruimte worden standaardcontrolepunten en standaardobjecten automatisch voorgesteld.

De gebruiker:

- schakelt afwezige objecten uit;
- voegt uitzonderingen toe;
- voert alleen noodzakelijke details in.

### Stap 5 — Slaapkamers

Per slaapkamer wordt in dezelfde flow vastgelegd:

- naam;
- verdieping;
- capaciteit;
- routepositie.

Automatisch ontstaan:

- fysieke slaapkamer;
- bewonerskamer;
- koppeling;
- standaardcontrolepunten.

Geen afzonderlijke primaire kameraanmaak.

### Stap 6 — Preview en activeren

De gebruiker ziet exact wat de controleur zal volgen.

Eén hoofdactie:

    Woningroute opslaan en activeren

### Geavanceerd beheer

De bestaande technische editor blijft beschikbaar voor beheerders en uitzonderingen, maar is niet de normale configuratieroute.

---

## 7. AFBAKENING 9.0B

Binnen scope:

- routewizard;
- slaapkamer-capaciteit;
- automatische kamerbron;
- automatische standaardvoorstellen;
- routebediening;
- preview;
- normale versus geavanceerde flow;
- noodzakelijke databaseaanpassingen;
- regressietests.

Niet binnen scope:

- volledige ruimteakkoordcontroleurflow; dit is 9.0C;
- volledige bewonersplaatsingsherbouw; dit is 9.0D;
- documenten en certificeringen aan objecten; dit is 9.0F;
- dashboardherbouw; dit is 9.0H;
- zakelijke rapportage-eindvorm; dit is 9.0I.

---

## 8. ACCEPTATIECRITERIA 9.0B

Bouwblok 9.0B is pas gereed wanneer:

1. een nieuwe woning via één begeleide configuratie kan worden ingericht;
2. slaapkamers automatisch bewonerskamers zijn;
3. capaciteit in dezelfde invoer wordt vastgelegd;
4. geen afzonderlijke kameraanmaak nodig is;
5. een standaardroute automatisch ontstaat;
6. route zonder handmatige nummers kan worden aangepast;
7. relevante objecten en controlepunten automatisch worden voorgesteld;
8. alleen uitzonderingen extra invoer vragen;
9. preview overeenkomt met de controleurroute;
10. bestaande woningdata en historie behouden blijven;
11. geavanceerd technisch beheer beschikbaar blijft;
12. tests, lint, build en database-lint groen zijn;
13. remote database up-to-date is;
14. commit en push zijn uitgevoerd.

---

## 9. EERSTE GERICHTE INVENTARISATIE 9.0B

Inventariseer uitsluitend:

- huidige WoningrouteWizard.tsx;
- huidige kamertypes en capaciteit;
- opslagketen van de routewizard;
- bestaande kamerbeheerpagina;
- databasekolommen voor kamers en woningruimten;
- relevante tests.

Niet opnieuw inventariseren:

- volledige repository;
- rapportageplatform;
- planning;
- documenten;
- certificeringen;
- algemene beveiligingsarchitectuur;
- reeds bewezen Energy Intelligence.

---

## 10. VERBODEN KOERSWIJZIGINGEN

Tijdens 9.0B niet:

- terugkeren naar losse kameraanmaak als primaire bron;
- nieuwe aantallimieten invoeren;
- route en kamers als onafhankelijke configuraties behandelen;
- gebruikers databasebegrippen laten invoeren;
- volledige modules opnieuw ontwerpen;
- 9.0C of latere bouwblokken ongemerkt meenemen;
- architectuurdocumenten zelfstandig herschrijven;
- reeds bewezen 9.0A opnieuw bouwen.

---

## 11. STARTBERICHT VOOR DE NIEUWE CHAT

We gaan verder met CFME Control.

Lees eerst volledig:

1. docs/CFME_MASTER_ARCHITECTURE.md
2. docs/MASTER_BUILD_MATRIX.md
3. docs/CURRENT_BUILD_PACKAGE.md

Deze documenten zijn bindend.

Geen nieuwe brainstorm, geen herontwerp en geen algemene inventarisatie.

Repository: cfme-europe/Cfme-property-management
Branch: main
Verwachte HEAD: 50ab7a3

Start uitsluitend met:

    clear && \
    cd /workspaces/Cfme-property-management && \
    git status --short && \
    git log --oneline -5 && \
    git branch --show-current

Verifieer daarna alleen de gerichte scope van bouwblok 9.0B.

Communiceer uitsluitend in het Nederlands, kort en zakelijk.

Terminalopdrachten beginnen altijd met clear &&.

---

## 12. BEWEZEN AFGEROND — BOUWBLOK 9.0B

Gerealiseerd:

- één begeleide woningconfiguratie;
- automatische standaardroute;
- onbeperkte ruimten en verdiepingen;
- capaciteit per slaapkamer in dezelfde flow;
- automatische bewonerskamerkoppeling;
- transactionele opslag van verdiepingen, ruimten, objecten en controlepunten;
- veilige deactivering zonder vernietiging van historie;
- automatische objectnummering;
- routepreview;
- geavanceerd beheer uitsluitend voor uitzonderingen;
- kamerbeheer herpositioneerd naar capaciteit en historie;
- zelfstandige primaire kameraanmaak verwijderd;
- onveilige capaciteitsverlaging en slaapkamerdeactivering geblokkeerd;
- aangescherpte kamerrechten.

Migraties:

- `20260727190000_9_0b_reality_volledige_invoernorm.sql`;
- `20260727193000_9_0b_reality_lintcorrectie.sql`.

Eindcontrole:

- 32 van 32 tests geslaagd;
- ESLint schoon;
- TypeScript en productiebuild schoon;
- database-lint schoon;
- Supabase dry-run schoon;
- remote database volledig bijgewerkt.

Volgend bouwblok:

`9.0C Inspection Engine — ruimteakkoord`

---

## 13. BEWEZEN AFGEROND — BOUWBLOK 9.0C

Gerealiseerd:

- één hoofdactie voor een normale ruimte;
- gezamenlijke transactionele opslag van normale controlepunten;
- vooraf gekozen afwijkingen worden uitgesloten van ruimteakkoord;
- meterpunten blijven in de bestaande Energy Intelligence-flow;
- internetcontrole blijft verkort;
- afwijkingen, foto’s, meldingen en taken blijven individueel gekoppeld;
- automatische doorgang na volledige ruimte;
- blokkade op overslaan van ontbrekende verplichte punten;
- eindcontrole met ontbrekende punten en vastgelegde afwijkingen;
- directe navigatie terug naar ontbrekende controlepunten.

Migraties:

- `20260727200000_9_0c_inspection_ruimteakkoord.sql`;
- `20260727203000_9_0c_ruimteakkoord_lintcorrectie.sql`;
- `20260727210000_9_0c_ruimteakkoord_ambiguiteit_hardening.sql`.

Eindcontrole:

- 34 van 34 tests geslaagd;
- ESLint schoon;
- TypeScript en productiebuild schoon;
- database-lint schoon;
- Supabase dry-run schoon;
- remote database volledig bijgewerkt.

Volgend bouwblok:

`9.0D Occupancy Intelligence`
