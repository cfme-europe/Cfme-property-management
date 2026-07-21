# CFME Control Roadmap

## Project

CFME Control is het property- en facilitymanagementsysteem van Complete Facility Management Europe.

Repository:
cfme-europe/Cfme-property-management

Hoofdbranch:
develop

---

# Gereed

## 0.2

- 0.2A Supabase basis
- 0.2B Bedrijven CRUD
- 0.2C Bedrijfsdossier
- 0.2D Bedrijf bewerken

## 0.3

- 0.3A Bedrijven ↔ woningen
- 0.3B Nieuwe verhuurperiode
- 0.3C Actieve verhuur + huurhistorie
- 0.3D Verhuurperiode beëindigen

## 0.4

- 0.4A Huurders ✅

- 0.4B Kamers ✅

- 0.4C Bewoners ↔ kamers ✅


## 0.5

- 0.5A Inspecties
- 0.5B Meldingen
- 0.5C Meterstanden
- Maandrapportages
- PDF-generatie maandrapport

---

# Gepland

## 0.4D

Verhuizen / uitchecken

- kamerwissel
- woningwissel
- uitchecken
- volledige historie

---

## 0.5D

Energie per persoon per week

- gas
- water
- dagstroom
- nachtstroom
- bewonersaantal
- weekverbruik
- trendanalyse

---

# 0.6 Compliance

## 0.6A ✅

Certificeringen

- Scope
- Brandblussers
- CV
- Rookmelders
- Overige keuringen
- geldigheid en waarschuwingstermijnen
- intrekken zonder historie te verwijderen
- woningdossieroverzicht en beheerformulieren
- PostgreSQL-validaties, RLS en rolgebaseerde schrijfrechten
- sessiebewuste serveracties
- lint, productiebuild en runtimecontrole geslaagd

## 0.6B ✅

Takenplanner

- taken gekoppeld aan woningen, inspecties en meldingen
- categorie, prioriteit, status, planning en toewijzing
- openstaande, verlopen en afgeronde taken zichtbaar
- toevoegen en wijzigen via sessiebewuste serveracties
- dubbele verzending geblokkeerd
- betrouwbare iPad- en Safari-navigatie na opslag
- workflowgebeurtenissen kunnen automatisch taken aanmaken
- RLS-lezen voor authenticated gebruikers
- schrijven uitsluitend voor bevoegde planning- en administratierollen
- fysieke verwijdering niet beschikbaar in de beheerinterface
- lint, productiebuild en runtimecontrole geslaagd

## 0.6C ✅

QR-codes

- QR-code per woning in het beveiligde woningdossier
- bestemming wordt opgebouwd vanuit de actuele applicatiehost
- geen publieke woningroute of openbaar toegangstoken
- na scannen blijft authenticatie verplicht
- compacte en goed scanbare weergave op iPad en Safari
- PNG-download in hoge resolutie
- afzonderlijke afdrukweergave met woninggegevens
- lint, productiebuild en runtimecontrole geslaagd

## 0.6D ✅

Documentbeheer

- private woningdocumenten met documenttype en vertrouwelijkheid
- volledige versiehistorie zonder overschrijven
- opslag in beveiligde Supabase Storage-bucket
- alleen bevoegde administratierollen kunnen toevoegen en archiveren
- actieve documenten beperkt zichtbaar in het woningdossier
- gearchiveerde documenten uitsluitend in afzonderlijk documentarchief
- PDF-, Office- en afbeeldingsbestanden tot 20 MB
- beveiligde tijdelijke downloadlinks
- downloads runtime bewezen voor actieve en gearchiveerde versies
- lint, productiebuild en iPad/Safari-runtimecontrole geslaagd

---

# 0.7 Rapportages

## 0.7A ✅

Dashboard

- bestaand managementdashboard uitgebreid
- KPI's voor open taken en achterstallige deadlines
- compliance-aandacht voor verlopen en binnenkort verlopende certificeringen
- hoge en kritieke Woning-DNA-risico's
- woningen zonder actieve rayonplanning
- operationele overzichten voor taken, compliance en woningrisico
- sessiebewuste Supabase-serverclient
- RLS-beveiliging behouden
- lint, productiebuild en iPad/Safari-runtimecontrole geslaagd

## 0.7B — Gereed

Klantrapportages

- maandrapportages per woning en rapportperiode
- vaste koppeling aan een actieve templateversie
- statussen concept, definitief en verzonden
- ontvanger, e-mailadres en interne opmerkingen
- rapportinhoud voor bewoners, inspecties, meldingen en energie
- samenvatting met aantallen en schade-indicatoren
- sessiebewuste server- en browserclients
- rapportgegevens samenstellen via beveiligde Server Action
- fysieke verwijdering uit applicatie en service verwijderd
- alleen geauthenticeerde gebruikers hebben tabeltoegang
- toevoegen en wijzigen uitsluitend met rapportagebeheerrecht
- geen toegang voor anon en geen DELETE-recht
- lint, productiebuild en iPad/Safari-runtimecontrole geslaagd
- dubbele GoTrueClient-waarschuwing uit rapportageketen verwijderd

Commits:

- `3485928` RAPPORTAGES-001 Beveilig klantrapportages
- `7e056f2` RAPPORTAGES-002 Verwijder fysieke rapportageverwijdering
- `1afce40` RAPPORTAGES-003 Splits rapportageclient en serverservice
- `360dd37` RAPPORTAGES-004 Genereer rapportages via serveractie

## 0.7C — Gereed

PDF- en Excel-export

- PDF-generatie via beveiligde serverroute
- PDF-download zonder navigatieverlies in Safari
- Excel-export als XLSX-bestand
- exportregistratie met formaat, status en tijdstippen
- afzonderlijke pagina voor exportgeschiedenis
- koppeling met maandrapportage en templateversie
- alleen geauthenticeerde bevoegde gebruikers
- sessiebewuste Supabase-client binnen de PDF-route
- geen publieke of anonieme exporttoegang
- lint, productiebuild en iPad/Safari-runtimecontrole geslaagd

Commits:

- `687222d` EXPORTS-001 Toon exportgeschiedenis
- `7133130` EXPORTS-002 Maak PDF-download en exportgeschiedenis robuust

## 0.7D — Gereed

KPI-dashboard

- managementdashboard met sessiebewuste serverdata
- KPI’s voor woningen, verhuur, bewoners, kamers en capaciteit
- KPI’s voor open meldingen en open inspecties
- KPI’s voor open en achterstallige taken
- compliance-aandacht voor verlopen en binnenkort verlopende certificeringen
- hoge en kritieke Woning-DNA-risico’s
- woningen zonder actieve rayonplanning
- energieafwijkingen van minimaal twintig procent
- conceptrapportages als afzonderlijke KPI
- operationele lijsten voor meldingen, inspecties, taken, compliance en woningrisico
- lint en productiebuild geslaagd

Commits:

- `85f7e7e` DASHBOARD-001 Breid managementdashboard uit
- `83d5f20` DOCS Rond DASHBOARD-001 af
- `8e09be2` DASHBOARD-002 Toon conceptrapportages als KPI

---

# 0.8 Productie

## 0.8A — Gereed

Gebruikers

- beheerinterface voor bestaande gebruikersprofielen
- uitsluitend toegankelijk voor actieve admins
- rollen wijzigen
- gebruikers activeren en deactiveren
- eigen adminaccount kan niet worden gedeactiveerd of gedegradeerd
- gebruikersprofielen blijven historisch behouden
- fysieke verwijderpolicy verwijderd
- DELETE-recht voor authenticated ingetrokken
- anon heeft geen toegang tot gebruikersprofielen
- lokale en remote migratiegeschiedenis hersteld en gelijkgetrokken
- remote database gecontroleerd en up-to-date

Commits:

- `205421b` GEBRUIKERS-001 Bescherm profielhistorie

## 0.8B — Gereed

Rollen en rechten

- uitgebreide rolset voor admin, medewerker, planner, controleur, administratie, management en lezen
- centrale PostgreSQL-functies voor domeinspecifieke autorisatie
- geen tabel- of sequencerechten voor anon
- geen DELETE-, TRUNCATE-, REFERENCES- of TRIGGER-rechten voor authenticated
- geen anon-policies
- geen DELETE-policies
- schrijfpolicies voor bedrijven, woningen, bewoners, huurders, kamers, inspecties, meldingen en meterstanden per rol beperkt
- controlebriefings, intelligence-werkpunten en workflow per bevoegde rol beperkt
- geen onbeperkte schrijfpolicies meer
- remote database gecontroleerd en migraties toegepast

Commits:

- `d7dfb1b` RECHTEN-001 Sluit publieke database toegang af
- `e0490d2` RECHTEN-002 Verwijder publieke en delete policies
- `24e64fa` RECHTEN-003 Beperk schrijfpolicies per rol

## 0.8C — Gereed

Auditlog

- centraal auditlog voor wijzigingen in publieke basistabellen
- registratie van INSERT-, UPDATE- en DELETE-acties
- gebruiker, database-rol, tabel, record, tijdstip en transactie worden vastgelegd
- oude en nieuwe waarden worden als JSON bewaard
- gewijzigde velden worden bij updates afzonderlijk geregistreerd
- 36 basistabellen zijn via audittriggers aangesloten
- auditlog is niet beschrijfbaar via authenticated of anon
- uitsluitend admin en management kunnen auditgegevens lezen
- anon heeft geen toegang
- databasecontrole succesvol uitgevoerd

Commits:

- `a7ba6f` AUDIT-001 Voeg centraal onveranderbaar auditlog toe

## 0.8D — Gereed

Back-ups

- logisch back-upscript voor schema, gegevens en databaserollen
- SHA-256-integriteitscontrole en metadata
- herstelprocedure, bewaartermijnen en verantwoordelijkheden vastgelegd
- fysieke Supabase-back-ups en PITR beschreven
- Supabase Storage opgenomen in het back-upbeleid
- lokale back-ups uitgesloten van Git
- scripts syntactisch en functioneel getest

Commits:

- `fba33b9` BACKUP-001 Voeg back-up- en herstelvoorzieningen toe

## 0.8E

Productierelease

---

# Releasevoorwaarden

Een release is pas gereed wanneer:

- scope geverifieerd
- implementatie compleet
- lint succesvol
- build succesvol
- gerichte git add
- git diff --cached gecontroleerd
- commit
- push

<!-- BP-ARCH-001 -->
## Enterprise-bouwpakketten

De verdere ontwikkeling volgt de bouwpakketstructuur uit
`docs/ENTERPRISE-BLUEPRINT.md`.

Volgorde:

1. BP-ARCH-001 — Enterprise Blueprint
2. BP-CORE-001 — Controlesessie en Gebeurtenis Engine
3. BP-CORE-002 — Workflow Engine
4. BP-INTELLIGENCE — Woning-DNA, trends en controlebriefing
5. BP-PLAN — Rayon- en taaktoewijzing
6. BP-REPORT — Modulair rapportplatform
7. BP-ADMIN — Rollen, rechten en instellingen

De bestaande versienummers blijven historische projectmijlpalen.
