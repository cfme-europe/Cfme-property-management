# CFME Control

CFME Control is het beveiligde property- en facilitymanagementplatform van Complete Facility Management Europe.

## Woningarchief

Woningen die niet meer operationeel worden gebruikt kunnen, na beëindiging van de actieve verhuur en controlesessie, met reden worden gearchiveerd. Het volledige dossier en een onveranderlijk statusauditspoor blijven bewaard. Gearchiveerde woningen verdwijnen uit operationele lijsten, planning en intelligence en kunnen gecontroleerd worden heractiveerd zonder automatisch oude planning of taken te heropenen.

## Productiescope

- bedrijven, woningen en verhuurperioden
- kamers, bewoners en bezettingshistorie
- inspecties, controlesessies en foto’s
- meldingen, taken en workflow
- meterstanden en energieanalyse
- certificeringen en compliance
- planning en rayons
- Woning-DNA, trends en controlebriefings
- maandrapportages met PDF-preview, PDF-download en Excel-export
- dashboard en managementinformatie
- gebruikers, rollen, RLS, auditlogging en historiebehoud

## Techniek

Next.js 16, React 19, TypeScript, Supabase/PostgreSQL en Vercel.

## Vereisten

- Node.js 22
- npm
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Controle

```bash
npm ci
npm test
npm run lint
NEXT_PUBLIC_SUPABASE_URL=https://buildtest.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=buildtest npm run build
```

## Documentatie

Zie `docs/` en `docs/PRODUCTIERELEASE-1.0.0.md`.
