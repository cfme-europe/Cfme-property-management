# CFME Control Bedrijfsregels

## Doel

Deze regels zijn leidend voor databaseontwerp, services, gebruikersinterface, rapportages en migraties.

## Bedrijven en woningen
1. Een woning wordt tijdens een actieve verhuurperiode door precies één bedrijf gehuurd.
2. Een bedrijf kan meerdere woningen huren.
3. Een woning heeft maximaal één actieve verhuurperiode.
4. Het hurende bedrijf wordt bepaald via de actieve verhuurperiode.
5. Verhuurhistorie blijft altijd behouden.
6. Een verhuurperiode wordt beåindigd en nooit fysiek verwijderd.

## Kamers en bewoners
1. Een woning bevat meerdere kamers.

2. Een woning bevat meerdere bewij�.
3. Een kamer behoort tot precies één woning.
4. Een bewoner kan aan maximaal één actuele kamer gekoppeld zijn.
5. De actuele kamer moet bij dezelfde woning horen als de verblijf- of verhuurperiode van de bewij�.
6. Verhuizen wordt historisch vastgelegd.
7. Uitchecken beéindigt het verblijf zonder de bewoner te verwijderen.
8. Bewoners- en kamerhistorie blijven behouden.

## Inspecties
1. Inspecties behoren tot een woning.
2. Een inspectie kan aan een verhuurperiode gekoppeld zijn.
3. De gekoppelde verhuurperiode moet bij dezelfde woning horen.
4. Inspecties en inspectiefoto's blijven behouden.
5. Afgeronde inspecties blijven zichtbaar.
6. Vastgestelde schades kunnen aan meldingen worden gekoppeld.

## Meldingen en schades
1. Meldingen behoren tot een woning.
2. Een melding kan aan een inspectie gekoppeld zijn.
3. De gekoppelde inspectie moet bij dezelfde woning horen.
4. Schades blijven altijd behouden.
5. Oplossen registreert status en oplosdatum.
6. Opgeloste meldingen worden niet verwijderd.
7. De factuurontvanger wordt expliciet vastgelegd.

## Meterstanden en energie
1. Meterstanden behoren tot een woning.
2. Meterstanden blijven altijd behouden.
3. Ondersteunde waarden zijn gas, water, dagstroom en nachtstroom.
4. Ontbrekende metercomponenten mogen leeg blijven.
5. Verbruik wordt berekend tussen twee geldige meterstanden.
6. Verbruik per persoon per week gebruikt het bewonersaantal van de meetperiode.
7. Negatief verbruik wordt niet stilzwijgend geaccepteerd.
8. Afwijkingen ten opzichte van eerdere perioden worden zichtbaar gemaakt.

## Certificeringen en documenten
1. Certificeringen behoren tot een woning of installatie.
2. Keuringshistorie blijft behouden.
3. Verlopen certificeringen worden niet verwijderd.
4. Documenten blijven behouden en worden gearchiveerd.
5. Nieuwe documentversies overschrijven geen bestaande historie.

## Rapportages
1. Rapportages gebruiken opgeslagen en herleidbare brongegevens.
2. Rapportages wijzigen geen historie.
3. Inspecties, meldingen, schades en energiegegevens blijven herleidbaar.
4. PDF- en Excel-export bevatten dezelfde kerngegevens als de applicatie.

## Verwijderen en archiveren
1. Productiecode verwijdert geen bedrijfsgegevens fysiek.

2. Gegevens worden beãindigd, gearchiveerd of gedeactiveerd.
3. Wnneer nodig worden `deleted_at` of `actief = false` gebruikt.
4. Alleen expliciet aangewezen testdata mag fysiek worden verwijderd.
