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

## 0.6B

Takenplanner

## 0.6C

QR-codes

## 0.6D

Documentbeheer

---

# 0.7 Rapportages

## 0.7A

Dashboard

## 0.7B

Klantrapportages

## 0.7C

PDF-export

Excel-export

## 0.7D

KPI-dashboard

---

# 0.8 Productie

## 0.8A

Gebruikers

## 0.8B

Rollen en rechten

## 0.8C

Auditlog

## 0.8D

Back-ups

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
