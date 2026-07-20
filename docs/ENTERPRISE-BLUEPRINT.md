# CFME Control Enterprise Blueprint

## 1. Status en functie

Dit document is de centrale blauwdruk voor CFME Control.

De repository en deze documentatie vormen samen de enige waarheid voor:

- architectuur;
- bedrijfsprocessen;
- gegevensstromen;
- gebruikersrollen;
- automatisering;
- rapportages;
- verdere ontwikkeling.

CFME Control wordt gebouwd als operationeel platform voor vastgoed-, bewoners-,
controle-, onderhouds-, energie- en rapportagebeheer.

## 2. Missie

CFME Control helpt CFME om aantoonbaar waarde toe te voegen aan huurders,
pandeigenaren, bewoners en controlerende instanties.

Iedere functie moet aantoonbaar bijdragen aan minimaal één van deze doelen:

1. noodzakelijke gebruikershandelingen verminderen;
2. kosten bewaken of verlagen;
3. risico's eerder signaleren;
4. kwaliteit en opvolging verbeteren;
5. transparantie en verantwoording vergroten;
6. bedrijfskennis behouden en hergebruiken.

## 3. Gouden ontwerpregels

### CFME-000 — Bedrijfsfilosofie

CFME Control is geen los registratiesysteem, maar ondersteunt de volledige
digitale bedrijfsvoering van CFME.

### CFME-001 — Minimale handelingen

Iedere fysieke of administratieve handeling die de software veilig kan
overnemen, wordt geautomatiseerd.

### CFME-002 — Geen frictie

Niet-essentiële functies mogen het primaire werk nooit vertragen of blokkeren.

### CFME-003 — Stille intelligentie

Automatische verwerking gebeurt zoveel mogelijk onzichtbaar. De gebruiker ziet
alleen informatie die op dat moment noodzakelijk of aantoonbaar nuttig is.

### CFME-004 — Gebeurtenis Engine

Iedere controle bestaat uit een chronologische reeks gebeurtenissen.

### CFME-005 — Alles is een gebeurtenis

Constateringen, metingen, bevestigingen, acties, foto's, bijlagen,
locatiepogingen en systeemacties gebruiken hetzelfde centrale
gebeurtenismodel.

### CFME-006 — Digitale collega

Het platform bereidt werk voor, bewaakt opvolging en presenteert relevante
informatie zonder de professionele beoordeling van medewerkers over te nemen.

### CFME-007 — Kennis als bedrijfsmiddel

Iedere controle en iedere gebeurtenis vergroot de herbruikbare kennis van CFME.

## 4. Hoofdarchitectuur

CFME Control bestaat uit zeven samenhangende domeinen.

### BP-ARCH — Architectuur

- Enterprise Blueprint;
- domeinmodel;
- procesmodel;
- beveiligingsmodel;
- ontwikkelstandaarden.

### BP-CORE — Centrale kern

- controlesessies;
- gebeurtenissen;
- gebeurtenistypen;
- tijdlijnen;
- automatische verwerkingsregels;
- auditinformatie.

### BP-OPS — Operationele modules

- woningen;
- bedrijven;
- verhuurperioden;
- kamers;
- bewoners;
- inspecties;
- meldingen;
- meterstanden;
- onderhoud;
- reparaties;
- taken.

### BP-INTELLIGENCE — Intelligentie

- Woning-DNA;
- klant- en huurderspatronen;
- trendanalyse;
- energieafwijkingen;
- risicosignalen;
- controlebriefing;
- werkpunten;
- interne Advisor.

### BP-PLAN — Planning

- rayons;
- vaste controleur;
- vervangende controleur;
- standaardtoewijzingen;
- gemiddelde controletijd;
- werkdruk- en routeondersteuning.

### BP-REPORT — Rapportage

- rapportblokken;
- rapporttemplates;
- doelgroepen;
- zichtbaarheidsregels;
- templateversies;
- rapportbibliotheek;
- PDF- en overige exports.

### BP-ADMIN — Beheer

- gebruikers;
- rollen;
- rechten;
- instellingen;
- bedrijfsregels;
- auditbeheer.

## 5. Centrale procesketen

De primaire keten is:

Planning
→ Controlesessie
→ Gebeurtenis
→ Intelligence
→ Workflow
→ Opvolging
→ Rapportage
→ Managementinformatie

De controleur registreert alleen wat daadwerkelijk nodig is voor een goede
controle. De software verzorgt zoveel mogelijk automatisch de afgeleide
administratie.

## 6. Controlesessie

Een controlesessie verbindt minimaal:

- woning;
- inspectie of controleopdracht;
- controleur;
- planning of taak;
- starttijd;
- eindtijd;
- status;
- gemiddelde controletijd;
- chronologische gebeurtenissen.

Een locatiepoging mag automatisch plaatsvinden bij starten of afronden.

Locatieverificatie:

- is ondersteunend bewijs;
- is niet verplicht;
- blokkeert nooit de controle;
- veroorzaakt geen extra handeling wanneer locatie ontbreekt;
- volgt medewerkers niet continu.

## 7. Gebeurtenismodel

Een gebeurtenis bevat minimaal:

- uniek ID;
- woning;
- controlesessie;
- gebeurtenistype;
- datum en tijd;
- bron;
- vastleggende gebruiker of systeemproces;
- feitelijke inhoud;
- optionele gestructureerde gegevens;
- interne of externe zichtbaarheid;
- herleidbaarheid naar vervolgstappen.

### Gebeurtenistypen

- constatering;
- meting;
- bevestiging;
- actie;
- foto;
- bijlage;
- notitie;
- locatiepoging;
- QR- of NFC-scan;
- systeemgebeurtenis.

Nieuwe gebeurtenistypen moeten zonder herontwerp van de kern kunnen worden
toegevoegd.

## 8. Intelligence Engine

De Intelligence Engine verwerkt gebeurtenissen en kan automatisch:

- een trend bijwerken;
- een energieafwijking bepalen;
- een werkpunt toevoegen;
- een melding voorstellen of aanmaken;
- een taak voorstellen of aanmaken;
- een huurdersignaal voorbereiden;
- een controlebriefing aanpassen;
- een rapportblok vullen;
- KPI- en dashboardgegevens actualiseren.

Automatische interpretaties blijven gescheiden van objectief vastgelegde feiten.

Waarschijnlijkheden en adviezen worden nooit als bewezen feiten gepresenteerd.

## 9. Workflow Engine

De Workflow Engine beheert afgeleide acties.

Iedere automatische actie moet:

- herleidbaar zijn naar een brongebeurtenis;
- controleerbaar zijn;
- zo nodig door een bevoegde gebruiker aanpasbaar zijn;
- dubbele meldingen en taken voorkomen;
- bestaande bedrijfsregels respecteren.

De software automatiseert waar veilig mogelijk. De bevoegde medewerker behoudt
de professionele eindverantwoordelijkheid.

## 10. Informatieclassificatie

### Feitelijk extern geschikt

- inspectieresultaten;
- meldingen;
- uitgevoerde reparaties;
- meterstanden;
- energieverbruik;
- certificeringen;
- afgesproken opvolging;
- objectieve foto's en documenten.

### Intern

- Advisor;
- waarschijnlijkheden;
- interne risicoscores;
- conceptsignalen;
- interne werkpunten;
- interne opmerkingen;
- personeels- en planningsinformatie.

Interne informatie komt nooit automatisch in een extern rapport.

## 11. Rapportplatform

Rapportages worden modulair samengesteld.

### Rapportblok

Eén herbruikbaar inhoudsonderdeel, bijvoorbeeld:

- samenvatting;
- pandgegevens;
- inspecties;
- meldingen;
- energie;
- onderhoud;
- reparaties;
- kosten;
- certificeringen;
- foto's;
- trends.

### Rapporttemplate

Bepaalt:

- gebruikte blokken;
- volgorde;
- doelgroep;
- opmaak;
- zichtbaarheidsregels;
- rapportregels;
- versie.

### Rapportbibliotheek

Bevat opgeslagen standaardkeuzes voor veelgebruikte rapportages.

De normale workflow blijft beperkt tot:

1. opgeslagen rapportkeuze of doelgroep selecteren;
2. periode kiezen;
3. woning(en) of klant kiezen;
4. genereren.

## 12. Klantwaarde

Externe rapportages moeten duidelijk maken dat CFME:

- actief bewaakt;
- risico's vroeg signaleert;
- storingen en reparaties opvolgt;
- energie en kosten behandelt alsof het eigen uitgaven zijn;
- bewonersgerelateerde overtredingen tijdig signaleert;
- klanten ondersteunt bij structurele verbeteringen;
- aantoonbaar meer doet dan uitsluitend contractueel registreren.

Interne Advisor-informatie wordt niet automatisch aan klanten getoond.

## 13. Planning en rayonbeheer

Een woning kan standaard worden gekoppeld aan:

- één vaste controleur;
- één vervangende controleur;
- een rayon;
- een standaard controlefrequentie;
- terugkerende taken.

De planner beheert vooral uitzonderingen. Bestaande toewijzingen blijven actief
totdat een bevoegde gebruiker ze wijzigt.

## 14. Autorisatiemodel

Minimale rollen:

- admin;
- planner;
- controleur;
- administratie;
- management;
- lezen;
- toekomstige klant- of auditorrol.

Rechten worden bepaald per handeling en gegevenscategorie, niet uitsluitend per
pagina.

Nieuwe Core-tabellen worden niet openbaar schrijfbaar gemaakt.

## 15. Niet-functionele eisen

- mobiel en tabletvriendelijk;
- bruikbaar met beperkte netwerkverbinding;
- geen onnodige modals of tussenstappen;
- geen dubbele invoer;
- foutmeldingen blokkeren alleen wanneer gegevensintegriteit dat vereist;
- wijzigingen zijn herleidbaar;
- bestaande functionaliteit wordt stapsgewijs geïntegreerd;
- databasewijzigingen zijn idempotent waar praktisch mogelijk;
- services bevatten gedeelde bedrijfslogica;
- UI bevat geen gedupliceerde domeinlogica.

## 16. Ontwikkelvolgorde

1. BP-ARCH-001 — Enterprise Blueprint
2. BP-CORE-001 — Controlesessie en Gebeurtenis Engine
3. BP-CORE-002 — Gebeurtenisverwerking en Workflow Engine
4. BP-INTELLIGENCE-001 — Trends en Woning-DNA
5. BP-INTELLIGENCE-002 — Controlebriefing en werkpunten
6. BP-INTELLIGENCE-003 — Energie- en huurdersignalen
7. BP-PLAN-001 — Rayon- en standaardtoewijzing
8. BP-REPORT-001 — Rapportblokken en templates — GEREED
   - rapportblokken en doelgroepen;
   - rapporttemplates en onveranderlijke templateversies;
   - zichtbaarheid, verplichting en blokvolgorde;
   - atomaire activering en vervallen van vorige versies;
   - vaste templateversie per maandrapportage;
   - templategestuurde rapportinhoud en PDF-export;
   - rapportagebibliotheek met beheerinterface;
   - runtime getest met actieve templateversie 2.
9. BP-REPORT-002 — Rapportbibliotheek en dynamische generator — GEREED
   - herleidbare rapportexporthistorie;
   - exportstatussen aangemaakt, gereed en mislukt;
   - vaste koppeling met maandrapportage en templateversie;
   - templategestuurde Excel-export;
   - PDF- en Excel-export bevatten dezelfde kerngegevens;
   - externe exports respecteren zichtbaarheid en blokvolgorde;
   - mislukte exportpogingen blijven als historie behouden;
   - Excel-download en exportregistratie runtime getest.
10. BP-ADMIN-001 — Uitgebreide rollen en rechten

## 17. Definition of Done

Een bouwpakket is pas gereed wanneer:

- de huidige staat vooraf is geverifieerd;
- bedrijfsregels zijn vastgesteld;
- database en types overeenkomen;
- gedeelde logica in services staat;
- lint slaagt;
- build slaagt;
- relevante tests of verificaties slagen;
- documentatie is bijgewerkt;
- alleen bedoelde bestanden zijn gestaged;
- staged diff is gecontroleerd;
- commit en push zijn geslaagd;
- de working tree schoon is.
