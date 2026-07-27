# CFME Control — Productiehardening en acceptatie 1.1.0

Datum: 27 juli 2026  
Branch: `main`  
Basiscommit: `7ff59e6`

## Releaseomvang

Deze acceptatie omvat de volledige CFME Control-keten tot en met:

- Reality Engine;
- Inspection Engine;
- Occupancy Intelligence;
- Maintenance Intelligence;
- Compliance Intelligence;
- Planning Intelligence;
- Business Intelligence Cockpit;
- zakelijke rapportage-eindvorm;
- Predictive Intelligence.

## Bewezen technische controles

- 39 functionele tests geslaagd;
- ketentests 9.0F tot en met 9.0J geslaagd;
- TypeScript zonder fouten;
- ESLint zonder fouten of waarschuwingen;
- Next.js-productiebuild geslaagd;
- database-lint zonder schemafouten;
- lokale en remote migratiehistorie synchroon;
- migratie-dry-run meldt database volledig actueel;
- repository bevat geen gevolgde `.env`- of geheimbestanden;
- back-up van schema, data en rollen succesvol aangemaakt;
- SHA-256-controlesommen van de back-up succesvol gevalideerd.

## RLS- en policycontrole

Alle 48 publieke tabellen hebben Row Level Security ingeschakeld.

Veertig tabellen hebben expliciete policies.

De volgende acht tabellen hebben RLS ingeschakeld en geen policies:

- `certifications`;
- `controletermijn_email_log`;
- `customers`;
- `inspections`;
- `issues`;
- `meter_readings`;
- `photos`;
- `properties`.

Dit betekent dat normale `anon`- en `authenticated`-rollen geen directe toegang hebben.

De zeven Engelstalige tabellen zijn legacy-tabellen en blijven gesloten totdat zij gecontroleerd worden gemigreerd of verwijderd.

`controletermijn_email_log` is een interne servicetabel en blijft bewust gesloten voor normale gebruikers.

## Back-up en herstelbaarheid

De productieback-up bevat:

- `schema.sql`;
- `data.sql`;
- `roles.sql`;
- `metadata.txt`;
- `SHA256SUMS`.

De integriteitscontrole bevestigt dat alle bestanden aanwezig, niet leeg en ongewijzigd zijn.

Een volledige restore naar een geïsoleerde herstelomgeving blijft een operationele releasehandeling en mag nooit rechtstreeks op de productiedatabase worden getest.

## Dependency-restrisico

`npm audit --omit=dev` meldt twaalf hoge transitieve kwetsbaarheden:

- `brace-expansion` via de Excel-exportketen;
- `postcss` via Next.js;
- `sharp` via Next.js.

De voorgestelde automatische force-fixes veroorzaken incompatibele downgrades van kernpakketten en worden daarom niet toegepast.

Beheersmaatregelen:

- geen `npm audit fix --force`;
- Next.js en ExcelJS alleen gecontroleerd upgraden;
- impactanalyse en volledige regressietest verplicht;
- Excel-export behandelt uitsluitend door CFME opgebouwde werkmappen;
- productiegeheimen en serverbestanden blijven buiten gebruikersinvoer;
- dependency-risico blijft expliciet openstaand releasewerk.

## Acceptatie-einddoel

Bewezen:

- woningen, bedrijven en verhuurperiodes beheersbaar;
- configureerbare woningstructuur;
- bewoners, kamers en capaciteit bewaakt;
- controleurflow en afwijkingsopvolging gekoppeld;
- energieanalyse uitlegbaar;
- compliance objectgericht;
- planning risicogestuurd;
- cockpit actiegericht;
- rapportages automatisch naar scherm, PDF en Excel;
- Predictive Intelligence toont onzekerheid en bewijs;
- rollen, RLS en policies gecontroleerd;
- historie en auditbaarheid behouden;
- tests, lint, build en database-lint groen;
- repository en remote database synchroon.

## Releasebesluit

CFME Control 1.1.0 is technisch acceptabel voor een gecontroleerde productierelease, onder de volgende voorwaarden:

1. dependency-restrisico blijft geregistreerd;
2. legacytabellen blijven gesloten;
3. productiegeheimen worden uitsluitend via de hostingomgeving beheerd;
4. vóór feitelijke ingebruikname wordt de releasegate opnieuw uitgevoerd;
5. kritieke gebruikersflows worden éénmaal op het productieadres gecontroleerd met testdata;
6. herstel wordt periodiek in een geïsoleerde omgeving geoefend.

## Openstaande operationele acceptatie

Nog handmatig te bevestigen op het definitieve productieadres:

- login en uitloggen op iPhone en iPad;
- foto-upload vanaf camera;
- volledige controleurflow;
- PDF-preview en download;
- Excel-download;
- e-mailwaarschuwingen;
- correcte productie-URL’s en secrets;
- minimaal één gecontroleerde back-up buiten de Codespace.
