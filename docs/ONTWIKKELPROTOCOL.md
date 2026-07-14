# CFME Control Ontwikkelprotocol

## 1. Doel

Dit document bepaalt de vaste ontwikkelwerkwijze voor CFME Control.

Het protocol is leidend voor:

- analyse
- ontwerp
- databasewijzigingen
- applicatiecode
- documentatie
- testen
- Git
- releases
- overdracht tussen chats en ontwikkelsessies

De repository is de enige waarheid.

De chat ondersteunt het proces, maar vervangt de repositorydocumentatie niet.

---

## 2. Ontwikkelomgeving

De ontwikkeling vindt uitsluitend plaats in:

- GitHub Codespaces
- Safari
- iPad
- repository `cfme-europe/Cfme-property-management`

Gebruik nooit:

- `/mnt/data`
- lokale terminals
- lokale bestanden
- veronderstelde bestanden
- veronderstelde functies
- veronderstelde UI-elementen

Alle terminalcommando’s zijn uitsluitend bedoeld voor de reeds geopende Codespaces-terminal.

---

## 3. Verificatie vóór uitvoering

Voor iedere nieuwe ontwikkelactie wordt eerst de actuele toestand bewezen.

Minimale verificatie:

```bash
git log --oneline -5
git status --short```

---

## 4. Repository is de enige waarheid

Leidende documenten:

- docs/ROADMAP.md
- docs/ARCHITECTUUR.md
- docs/BEDRIJFSREGELS.md
- docs/ONTWIKKELPROTOCOL.md

Bij verschillen geldt:

1. Repository controleren.
2. Implementatie controleren.
3. Afwijking vaststellen.
4. Corrigeren.
5. Repository opnieuw synchroon maken.
## 5. Geen aannames

Er wordt nooit gegokt over:

- bestanden
- functies
- database
- routes
- UI
- terminalstatus

Wanneer iets niet bewezen is:

1. eerst controleren;
2. daarna wijzigen;
3. nooit aannemen.
## 6. Screenshotverificatie

Voor iedere opdracht wordt eerst vastgesteld wat op de laatste screenshot zichtbaar is.

Verplicht:

1. Benoem eerst de bewezen feiten.
2. Trek geen conclusies zonder bewijs.
3. Geef geen UI-instructie die niet zichtbaar onderbouwd kan worden.
4. Controleer of een voorgestelde wijziging werkelijk een wijziging is.
5. Controleer of een commando daadwerkelijk is uitgevoerd voordat een vervolgopdracht wordt gegeven.
6. Bij twijfel eerst verifiëren, daarna handelen.

Een opdracht wordt pas gegeven wanneer de actuele toestand bewezen is.
---

## 7. Vooruitdenken

Voor iedere opdracht wordt de volledige uitvoeringsketen vooraf beoordeeld.

Controlepunten:

1. Huidige toestand.
2. Gewenst eindresultaat.
3. Gevolgen voor database.
4. Gevolgen voor applicatie.
5. Gevolgen voor documentatie.
6. Mogelijke foutscenario's.
7. Herstelstrategie.
8. Controle na uitvoering.

Pas daarna wordt een opdracht gegeven.
---

## 8. Bouwblok

Iedere release wordt uitgevoerd in deze volgorde:

1. Verificatie.
2. Scope bevestigen.
3. Ontwerp.
4. Implementatie.
5. Controle.
6. Git diff controleren.
7. npm run lint.
8. npm run build.
9. Gerichte git add.
10. Commit.
11. Push.
12. Eindcontrole.

Een bouwblok is pas gereed wanneer de build succesvol is, de commit is gepusht en de working tree schoon is.
---

## 9. Git-procedure

Voor iedere commit geldt:

1. git status --short
2. Alleen bedoelde bestanden toevoegen.
3. git diff --cached controleren.
4. Commit.
5. Push.
6. git status --short controleren.

Er wordt nooit gecommit zonder:

- succesvolle lint;
- succesvolle build;
- gecontroleerde staged wijzigingen;
- schone working tree na de push.
---

## 10. Databaseprocedure

De database is leidend.

Volgorde:

1. Bestaande tabellen controleren.
2. Bestaande migraties controleren.
3. Bedrijfsregels controleren.
4. Nieuwe migratie ontwerpen.
5. SQL inhoudelijk controleren.
6. SQL uitvoeren.
7. Resultaat controleren.
8. Pas daarna applicatiecode wijzigen.

Iedere migratie bevat waar mogelijk:

- IF EXISTS
- IF NOT EXISTS
- expliciete foreign keys
- expliciete indexen
- expliciete constraints
- Row Level Security
- policies

Na iedere migratie worden controlequery's uitgevoerd.

Applicatiecode wordt nooit aangepast voordat de database is bewezen.

---

## 11. Soft delete

Productiedata wordt nooit fysiek verwijderd.

Gebruik:

- beëindigd
- gearchiveerd
- actief = false
- deleted_at

Historie blijft altijd behouden.

Van toepassing op:

- woningen
- verhuurperiodes
- huurders
- bewoners
- kamers
- inspecties
- meldingen
- schades
- meterstanden
- documenten
- certificeringen

Alleen expliciete testdata mag fysiek verwijderd worden.

---

## 12. Build-first

Een bouwblok is pas gereed wanneer:

```bash
npm run lint
npm run build
```

beide succesvol zijn.

Zonder groene build:

- geen commit
- geen push

---

## 13. Codespaces iPad

CFME Control wordt ontwikkeld via:

- GitHub Codespaces
- Safari
- iPad

Daarom geldt:

- geen aannames over terminalstatus
- geen lange heredocs
- geen grote base64-blokken
- geen interactieve editors tenzij noodzakelijk
- terminal uitsluitend voor verificatie, Git, SQL, lint en build
- documentatie via de editor

Bij een vastgelopen terminal wordt eerst de terminalstatus bewezen voordat nieuwe opdrachten worden gegeven.

---

## 14. Screenshotcontrole

Voor iedere opdracht:

1. Screenshot volledig bekijken.
2. Benoemen wat bewezen zichtbaar is.
3. Geen interpretaties.
4. Geen aannames.
5. Geen opdracht geven die niet uitvoerbaar bewezen is.

Wanneer iets niet zichtbaar is:

- eerst controleren
- daarna pas handelen

---

## 15. Kwaliteitscontrole

Voor iedere release wordt gecontroleerd:

- bedrijfsregels gevolgd
- database klopt
- services kloppen
- types kloppen
- routes kloppen
- UI klopt
- lint groen
- build groen
- Git schoon
- documentatie bijgewerkt

Pas daarna is een bouwblok gereed.

