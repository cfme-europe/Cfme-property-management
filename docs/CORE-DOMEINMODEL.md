# CFME Core-domeinmodel

## Doel

CFME Control ondersteunt de volledige bedrijfsvoering rond verhuurde woningen,
controles, onderhoud, kostenbewaking en verantwoording.

Elke functie wordt ontworpen volgens drie uitgangspunten:

1. minimale noodzakelijke handelingen;
2. één keer registreren en meervoudig gebruiken;
3. aantoonbare toegevoegde waarde voor de klant.

## Hoofddomeinen

### Organisatie

- Gebruiker
- Profiel
- Rol
- Recht
- Controleur
- Planner
- Rayon
- Vaste taaktoewijzing
- Vervangende controleur

### Vastgoed

- Woning
- Kamer
- Installatie
- Certificering
- Keuring
- Eigendomssituatie
- Verhuurperiode
- Hurend bedrijf
- Bewoner
- Kamerbezetting
- Bewonershistorie

### Uitvoering

- Controleplanning
- Controlesessie
- Inspectie
- Constatering
- Observatie
- Foto
- Meterstand
- Melding
- Taak
- Werkpunt
- Herstelactie

### Intelligentie

- Woningprofiel
- Trend
- Risicosignaal
- Energieafwijking
- Huurdersignaal
- Controlebriefing
- Intern advies
- Gemiddelde controletijd

### Rapportage

- Rapportblok
- Rapporttemplate
- Doelgroep
- Zichtbaarheidsregel
- Templateversie
- Rapportbibliotheek
- Gegenereerd rapport
- Auditexport

## Centrale procesketen

Constatering
→ Observatie
→ Beoordelingsregels
→ Melding, taak, werkpunt, trend of huurdersignaal
→ Controlebriefing
→ Rapportage en managementinformatie

De controleur legt feiten vast. CFME Control verzorgt waar mogelijk automatisch
de administratieve en analytische verwerking.

## Controlesessie

Een controlesessie koppelt minimaal:

- woning;
- inspectie;
- controleur;
- geplande taak;
- starttijd;
- eindtijd;
- gemiddelde controletijd;
- status.

Een locatiepoging mag automatisch worden geregistreerd, maar is nooit verplicht
en mag een controle nooit vertragen of blokkeren.

## Constatering en observatie

Een constatering is een objectief feit dat tijdens een controle wordt vastgelegd.

Een observatie bevat de gestructureerde betekenis en context van dat feit.

Voorbeelden:

- keuken vervuild;
- elektrische kachel aangetroffen;
- brandblusser verlopen;
- rookmelder ontbreekt;
- lekkage vastgesteld;
- meterstand opgenomen.

Vanuit een observatie kan CFME Control automatisch vervolgacties voorstellen of
aanmaken. De professionele beoordeling blijft bij de bevoegde medewerker.

## Scheiding van informatie

### Feitelijke informatie

Geschikt voor klanten, eigenaren en certificeringsinstanties.

### Interne informatie

- Advisor;
- waarschijnlijkheden;
- interne werkpunten;
- conceptsignalen;
- interne opmerkingen;
- risicoscores.

Interne informatie komt nooit automatisch in een externe rapportage.

## Rapportarchitectuur

Rapportages bestaan uit:

1. rapportblokken;
2. rapporttemplates;
3. doelgroepen;
4. zichtbaarheidsregels;
5. templateversies;
6. rapportbibliotheek.

De gebruiker kiest normaal alleen doelgroep of opgeslagen rapportkeuze, periode
en woning(en). De software bepaalt de inhoud, volgorde en zichtbaarheid.

## Ontwerpregels

- Niet-essentiële functies blokkeren nooit het primaire werk.
- GPS, QR en aanvullend bewijs zijn ondersteunend en standaard niet verplicht.
- Geen dubbele invoer.
- Geen keuze vragen waarvan het systeem het antwoord al kent.
- Automatisering moet herleidbaar en controleerbaar blijven.
- Feiten, adviezen en automatische voorstellen blijven afzonderlijk opgeslagen.
- Nieuwe modules sluiten via herbruikbare services op het Core-domein aan.
- Bestaande operationele tabellen worden stapsgewijs geïntegreerd en niet
  onnodig vervangen.

## Bouwvolgorde

1. BP-CORE-00 — Domeinmodel
2. BP-CORE-01 — Observatie Engine
3. BP-CORE-02 — Trend Engine
4. BP-CORE-03 — Controlebriefing
5. BP-CORE-04 — Huurdersignalen en Advisor
6. BP-PLAN-01 — Rayon- en taaktoewijzing
7. BP-REPORT-01 — Modulaire rapportarchitectuur
8. BP-REPORT-02 — Rapportgenerator en rapportbibliotheek
