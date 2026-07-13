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

## Volgende bouwblok

### 0.4A Huurdersbeheer

Bouw:
- huurder aan actieve verhuurperiode koppelen;
- persoonsgegevens opslaan;
- contactgegevens;
- geboortedatum;
- nationaliteit;
- ID- of paspoortnummer;
- opmerkingen;
- volledige CRUD;
- bereikbaar vanuit woningdossier.

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
