# CFME Control Architectuur

## Doel

CFME Control is het centrale property- en facilitymanagementsysteem van Complete Facility Management Europe.

De applicatie ondersteunt de volledige levenscyclus van woningen, huurders, bewoners, inspecties, meldingen, meterstanden, energieverbruik, compliance en rapportages.

---

# Techniek

## Front-end

- Next.js
- React
- TypeScript

## Back-end

- Supabase
- PostgreSQL
- Row Level Security

## Ontwikkeling

- GitHub
- GitHub Codespaces
- Safari op iPad

---

# Architectuur

De applicatie is opgebouwd uit vier lagen.

## Presentatie

src/app

Bevat uitsluitend pagina's en routing.

---

## Componenten

src/components

Herbruikbare UI-componenten.

Componenten bevatten geen directe SQL.

---

## Services

src/services

Alle databasebewerkingen verlopen via services.

Pagina's communiceren uitsluitend met services.

---

## Types

src/types

Centrale domeinmodellen.

Alle services gebruiken dezelfde types.

---

# Database

Databasewijzigingen verlopen uitsluitend via migraties.

supabase/migrations

Iedere wijziging wordt:

1. gecontroleerd
2. gemigreerd
3. geverifieerd
4. daarna pas gebruikt door de applicatie.

---

# Domeinmodel

Bedrijf

↓

Woning

↓

Verhuurperiode

↓

Kamers

↓

Bewoners

Daarnaast gekoppeld:

- Inspecties
- Meldingen
- Meterstanden
- Rapportages
- Certificeringen
- Documenten

---

# Historie

Historie is onderdeel van het ontwerp.

Nooit verwijderen:

- verhuurhistorie
- bewonershistorie
- inspecties
- meldingen
- meterstanden
- certificeringen
- documenten

---

# Soft delete

Productiedata wordt nooit fysiek verwijderd.

Gebruik:

- beëindigd
- gearchiveerd
- actief = false
- deleted_at

---

# Beveiliging

Row Level Security blijft leidend.

Rechten worden afgedwongen in:

- database
- services
- gebruikersinterface

---

# Repositorydocumentatie

De documentatie onder docs vormt de projecthandleiding.

Wanneer implementatie en documentatie verschillen:

1. implementatie controleren;
2. implementatie corrigeren of documentatie bijwerken;
3. repository weer synchroon maken.

