# CFME Control Roadmap

## Gereed

- 0.2A Basis Supabase-services
- 0.2B Bedrijven CRUD
- 0.2C Bedrijfsdossier
- 0.2D Bedrijf bewerken
- 0.3A Woningenoverzicht per bedrijf
- 0.3B Nieuwe verhuurperiode starten
- 0.3C Actieve verhuur en huurhistorie
- 0.3D Verhuurperiode beëindigen
- 0.4A Huurdersbeheer
- 0.4B Bewoners- en kamerbeheer
- 0.5A Inspecties
- 0.5B Meldingen en schade-opvolging
- 0.5C Meterstanden en energieverbruik
- 0.6A Maandrapportages
- 0.6A-4 PDF-generatie maandrapport
- 0.7A Managementdashboard

## Volgende bouwblok

Nog te bepalen.

## Vaste werkwijze

1. Controleer eerst:
   - git log --oneline -5
   - git status
2. Bouw één compleet terminalblok.
3. Voer uit:
   - npm run lint
   - npm run build
4. Daarna:
   - git add .
   - git commit
   - git push
5. Werk uitsluitend op branch develop.
6. Gebruik alleen actuele terminaluitvoer en screenshots.
7. Nooit uitgaan van /mnt/data of een eigen terminalomgeving.
8. De gebruiker werkt in GitHub Codespaces via Safari op een iPad.
