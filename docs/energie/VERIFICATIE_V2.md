# Verificatie — 13 oktober 2026

- Node 22.23.3 (project vereist >=22 <23).
- Volledige testsuite: 171 tests, 171 geslaagd, 0 mislukt, 0 overgeslagen.
- ESLint: geslaagd zonder fouten of waarschuwingen.
- TypeScript `tsc --noEmit`: geslaagd.
- Next.js 16.2.11 productiebuild (Turbopack): geslaagd.
- `git diff --check`: geslaagd.
- Additieve migratie tweemaal uitgevoerd op geïsoleerde PGlite/PostgreSQL-engine; grants/RLS, onveranderlijkheid, scope en overlap met synthetische gegevens gecontroleerd.
- Eén A4-energiepagina gegenereerd met de daadwerkelijke PDF-renderer en visueel gerenderd/gecontroleerd. Embedded lettertypen voorkomen afwijkende fontsubstitutie; bronmeetdatums staan op de kaarten.
- PDF-regressietest: twee pagina's blijven twee totdat het supplement wordt toegevoegd; toevoegen levert precies drie pagina's.
- Klantprojectie getest met ingezaaide interne tekst/persoonsnamen; deze worden niet geëxporteerd.
- Main vóór publicatie opnieuw opgehaald: ongewijzigd op 3933f4c4711b783adfed5b875a7e9cbbe3a17d80.

Geen productiegegevens gemuteerd, geen productiemigratie/backfill uitgevoerd, geen merge. Geen ingelogde browseracceptatietest of volledige Supabase/PostgREST-stagingtest geclaimd: de nieuwe tabellen zijn niet in productie aanwezig. De precieze productievoorwaarden en terugval staan in ENERGIE_INTELLIGENCE_V2.md.
