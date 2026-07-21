# CFME Control — back-up- en herstelbeleid

## Doel

Dit beleid beschermt database, migratiegeschiedenis en bedrijfsinformatie tegen verlies, beschadiging en ongewenste wijzigingen.

## Beschermde onderdelen

- PostgreSQL-schema, data en rollen;
- Supabase-migraties in Git;
- document- en fotometadata;
- bestanden in Supabase Storage;
- auditlog en historische bedrijfsgegevens.

## Back-uplagen

### Migratiegeschiedenis

Alle databasewijzigingen staan in `supabase/migrations` en worden via Git bewaard. Migraties vervangen geen gegevensback-up.

### Logische databaseback-up

`scripts/supabase-backup.sh` maakt `schema.sql`, `data.sql`, `roles.sql`, `metadata.txt` en `SHA256SUMS`.

Back-upbestanden worden onder `backups/` geplaatst en mogen nooit naar Git worden gepusht.

### Fysieke Supabase-back-ups

De Supabase CLI ondersteunt `supabase backups list` en `supabase backups restore` voor PITR-herstel.

Een fysieke restore mag alleen na expliciete managementgoedkeuring en nadat een actuele logische back-up is gemaakt.

### Supabase Storage

Een PostgreSQL-dump bevat Storage-metadata, maar geen zelfstandige kopie van alle opgeslagen bestanden. Storage-objecten moeten afzonderlijk worden veiliggesteld.

## Frequentie

- vóór iedere productierelease;
- vóór risicovolle datamigraties;
- maandelijks een integriteitscontrole;
- minimaal ieder kwartaal een hersteltest in een geïsoleerde testomgeving.

## Bewaartermijnen

- dagelijkse of releaseback-ups: minimaal 30 dagen;
- maandelijkse back-ups: minimaal 12 maanden;
- back-ups vóór grote migraties: minimaal 12 maanden;
- hersteltestrapporten: minimaal 24 maanden.

## Uitvoering

Back-up maken:

```bash
scripts/supabase-backup.sh
```

Back-up controleren:

```bash
scripts/supabase-backup-controleren.sh backups/supabase/<tijdstempel>
```

## Herstelprocedure

1. Incident en gewenst hersteltijdstip vastleggen.
2. Schrijfactiviteiten stoppen.
3. Actuele database en Storage veiligstellen.
4. Beschikbare fysieke back-ups controleren.
5. Eerst herstellen in een geïsoleerde testomgeving.
6. Dataconsistentie, rollen, RLS, auditlog en kernprocessen controleren.
7. Alleen na expliciete goedkeuring productie herstellen.
8. Incident en herstelresultaat documenteren.

## Minimale herstelcontrole

Controleer bedrijven, woningen, verhuurperiodes, kamers, bewonershistorie, inspecties, meldingen, taken, meterstanden, rapportages, documenten, certificeringen, Storage-verwijzingen, gebruikersrollen, RLS, auditlog, audittriggers en migratiegeschiedenis.
