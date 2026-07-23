# CFME Control — Productierelease 1.0.0

Datum: 23 juli 2026
Branch: `main`

## Status

CFME Control is functioneel en technisch gereed voor productierelease 1.0.0.

## Geaccepteerde scope

- bedrijven, woningen en verhuurperioden
- kamers, bewoners en bezettingshistorie
- inspecties, controlesessies en inspectiefoto’s
- meldingen, taken en workflow
- meterstanden en energieanalyse
- certificeringen en compliance
- planning en rayons
- Woning-DNA, trends en controlebriefings
- modulair rapportageplatform
- PDF-preview, PDF-download, Excel-export en exporthistorie
- dashboard en managementinformatie
- gebruikers, rollen, rechten en auditlog
- back-up- en herstelvoorzieningen

## Technische acceptatie

- gerichte tests geslaagd
- ESLint geslaagd
- productiebuild geslaagd
- productieflows op iPad en Safari gecontroleerd
- repository schoon en gelijk aan `origin/main`
- productie-export van PDF en Excel geslaagd

## Bekend restrisico

`npm audit --omit=dev` meldt transitieve kwetsbaarheden in PostCSS en Sharp. `npm audit fix --force` wordt niet gebruikt omdat dit een incompatibele downgrade voorstelt. Dependency-updates blijven vervolgwerk en worden alleen na impactcontrole en regressietest toegepast.

## Productievoorwaarden

- productiegeheimen blijven buiten Git
- productiedata wordt niet fysiek verwijderd
- databasewijzigingen verlopen via gecontroleerde migraties
- elke volgende release vereist tests, lint, build, gerichte staging, commit en push

## Releasebesluit

Release 1.0.0 is geaccepteerd.
