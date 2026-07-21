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
10. BP-ADMIN-001 — Uitgebreide rollen en rechten — GEREED
   - uitgebreide rolset met admin, planner, controleur, administratie, management en lezen;
   - bestaande legacyrol medewerker blijft ondersteund;
   - centrale rol- en autorisatiefuncties in PostgreSQL;
   - afzonderlijke rechten voor planning, controles, administratie, rapportages en managementinformatie;
   - RLS-policies voor planning en controles per handeling aangescherpt;
   - rapportage- en exportbeheer beperkt tot bevoegde rollen;
   - applicatietypes en autorisatieservice op de nieuwe rolset aangesloten;
   - beheerinterface voor bestaande gebruikersprofielen;
   - rollen wijzigen en gebruikers activeren of deactiveren;
   - bescherming tegen het deactiveren of degraderen van het eigen adminaccount;
   - beheerroute alleen toegankelijk voor actieve admins;
   - lint, productiebuild en runtimecontrole geslaagd;
   - runtime bewezen met 404 voor medewerker en 200 voor admin.


11. BP-COMPLIANCE-001 — Certificeringen — GEREED
   - certificeringen gekoppeld aan woningen;
   - typen voor Scope, brandblussers, CV, rookmelders en overige keuringen;
   - keuringsdatum, geldig-totdatum en configureerbare waarschuwingstermijn;
   - databaseconstraints voor geldige datums en consistente intrekking;
   - actieve en ingetrokken certificeringen blijven als historie behouden;
   - automatische statussen geldig, verloopt binnenkort, verlopen en ingetrokken;
   - indexen en unieke actieve certificering per woning, type en object;
   - RLS-leesrecht voor authenticated gebruikers;
   - schrijven uitsluitend voor bevoegde administratie-, medewerker- en adminrollen;
   - sessiebewuste serverservice en serveractie;
   - woningdossieroverzicht met statuskleuren;
   - formulieren voor toevoegen, wijzigen en intrekken;
   - lint en productiebuild geslaagd;
   - runtime bewezen met succesvolle opslag en dossierweergave.


12. BP-TAKEN-001 — Takenplanner — GEREED
   - taken gekoppeld aan woningen, inspecties en meldingen;
   - categorieën voor inspectie, schade, onderhoud, veiligheid, schoonmaak, installatie, administratie en overig;
   - prioriteiten laag, normaal, hoog en spoed;
   - statussen open, in behandeling, afgerond en geannuleerd;
   - startdatum, deadline, afrondingsdatum, toewijzing en externe referentie;
   - databasevalidaties voor titel, datums en afrondingsstatus;
   - automatische updated-at- en afrondingsverwerking;
   - workflowdispatcher maakt idempotent taken vanuit gebeurtenissen aan;
   - taken worden gebruikt door Woning-DNA en trendanalyse;
   - RLS-leesrecht voor authenticated gebruikers;
   - toevoegen en wijzigen uitsluitend voor bevoegde planning- en administratierollen;
   - anonrechten ingetrokken en geen delete-recht voor de applicatie;
   - sessiebewuste serverservice en serveracties;
   - woningdossieroverzicht met aantallen, deadlinebewaking en statuskleuren;
   - formulieren voor toevoegen en wijzigen;
   - dubbele verzending geblokkeerd;
   - harde, betrouwbare navigatie voor iPad en Safari;
   - lint en productiebuild geslaagd;
   - runtime bewezen met één succesvolle opslag en correcte dossierweergave.


13. BP-QR-001 — Beveiligde woning-QR-codes — GEREED
   - iedere woning kan vanuit het woningdossier een QR-code tonen;
   - de QR-code verwijst uitsluitend naar de interne woningroute;
   - de bestemming wordt runtime opgebouwd vanuit de actuele applicatiehost;
   - tijdelijke Codespaces-hostnamen worden niet permanent opgeslagen;
   - geen publieke woninggegevens, openbare routes of toegangstokens toegevoegd;
   - authenticatie blijft verplicht na het scannen;
   - QR-generatie vindt lokaal in de browser plaats;
   - compacte vaste weergave voor iPad en Safari;
   - hoge-resolutie PNG-download;
   - afzonderlijke afdrukweergave met adres- en plaatsgegevens;
   - foutafhandeling voor generatie en geblokkeerde afdrukvensters;
   - lint en productiebuild geslaagd;
   - runtime bewezen met correcte, scanbare dossierweergave.


14. BP-DOCUMENTEN-001 — Documentbeheer — GEREED
   - documenten gekoppeld aan woningen;
   - documenttypen voor contracten, certificeringen, keuringen, inspecties, verzekeringen, facturen, rapportages, handleidingen, identificatie en overig;
   - vertrouwelijkheid intern, vertrouwelijk en extern geschikt;
   - private Supabase Storage-bucket met limiet van 20 MB;
   - PDF-, DOCX-, XLSX- en gangbare afbeeldingsformaten ondersteund;
   - documenten en versies zijn historisch en worden niet fysiek verwijderd;
   - nieuwe versies overschrijven bestaande bestanden niet;
   - actuele versie en aantal versies beschikbaar via beveiligd overzicht;
   - RLS-leesrecht voor authenticated gebruikers;
   - toevoegen, wijzigen en archiveren uitsluitend voor bevoegde administratierollen;
   - actieve documenten beperkt tot vijf recente items in het woningdossier;
   - gearchiveerde documenten uitsluitend zichtbaar in een afzonderlijk archief;
   - tijdelijke ondertekende downloadlinks;
   - downloadroute uitgevoerd via serverpagina voor betrouwbare Next.js-, iPad- en Safari-werking;
   - lint en productiebuild geslaagd;
   - runtime bewezen met documentaanmaak, versie toevoegen, archiveren en downloads van actieve en gearchiveerde bestanden.


15. BP-DASHBOARD-001 — Managementdashboard — GEREED
   - bestaand dashboard hergebruikt en gericht uitgebreid;
   - kern-KPI's voor vastgoed, bezetting, meldingen, inspecties en energie behouden;
   - open taken en verstreken deadlines toegevoegd;
   - compliance-aandacht voor verlopen en binnenkort verlopende certificeringen;
   - hoge en kritieke Woning-DNA-risico's zichtbaar;
   - woningen zonder actieve rayonplanning zichtbaar;
   - operationele lijsten voor taken, compliance en woningrisico;
   - gegevens worden via een sessiebewuste Supabase-serverclient opgehaald;
   - bestaande RLS-beveiliging is niet versoepeld;
   - lint en productiebuild geslaagd;
   - runtime bewezen op iPad en Safari.

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
