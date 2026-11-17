# Energie: compact scherm en informatief voorschotsaldo

## Functioneel

Eén tijdlijn met klant/pandkeuze, stroom/gas/water, historische vergelijking en maandbereik. Meerdere panden blijven afzonderlijke gekleurde lijnen; alle producten krijgen ieder een eigen schaal. De zichtbaarheid van samenvatting, piekmelding en saldo wordt lokaal onthouden. Ontbrekende metingen blijven zichtbaar als ontbrekend.

Jaarprijzen en voorschotafspraken staan onder Beheer gegevens. Prijzen zijn inclusief btw. Lege invoer is onbekend, nul is een expliciete nulprijs. Iedere wijziging maakt een nieuwe versie. Voorschotten zijn afspraken, geen bevestigde betalingen.

## Rekening

Alle actieve producten tellen mee in de financiële kosten, onafhankelijk van de grafiekselectie. Bij dubbel tarief worden dag en nacht afzonderlijk gewaardeerd. Vaste jaarkosten worden per kalenderdag verdeeld (365/366); voorschotten per kalenderdag van de betreffende maand. Een wijziging van het voorschot werkt vanaf de opgegeven datum. Verhuur en afspraak begrenzen beide de periode, einddatum exclusief.

Maandverschil = afgesproken voorschot − geschatte volledige kosten. Saldo = startsaldo + alle maandverschillen sinds de afspraakstart. Een ander zichtbaar jaar of maandbereik reset het saldo niet. Ontbreekt een noodzakelijke prijs, meetperiode, voorschot of startsaldo, dan blijft het betreffende totaal onbekend. Het bekende kostendeel blijft beschikbaar. Een onvolledige eerdere maand verhindert een betrouwbaar cumulatief saldo.

Startmeterstanden worden waar mogelijk afgeleid uit omringende bestaande meteropnames, met bronperiode en vermelding van schatting. Dit schrijft geen fictieve meteropname in de database.

## Klantrapportage

Een optionele bijlage gebruikt een onveranderlijke energie-snapshot van dezelfde berekening. De server bepaalt klant en pand vanuit de gekoppelde rapportage/verhuurperiode. De klantprojectie bevat geen bewonersnamen of interne opmerkingen. PDF: één aanvullende A4 met maximaal drie grafieken en twaalf maandregels. Excel bewaart de maandwaarden en het bekende kostendeel. Vergelijking met een ander pand wordt niet automatisch gedeeld met de klant.

## Database en uitrol

Migratie: `20261117143139_energie_informatieve_jaarprijzen_voorschotten.sql`.
Nieuwe tabellen `energie_jaarprijzen` en `energie_voorschotafspraken`, expliciete grants, RLS, immutable versies, controle van voorganger en verhuurgrenzen. Geen wijziging van bestaande meterstanden of bewoners.

Zonder deze migratie blijft verbruik beschikbaar; nieuwe financiële invoer kan nog niet worden opgeslagen. Preview en productie gebruiken dezelfde Supabase-database: de migratie is NIET live toegepast. Afzonderlijke toestemming voor toepassing en productie-uitrol blijft vereist.

## Verificatie

- Gerichte financiële, migratie/RLS- en rapporttests: 9/9 geslaagd.
- Volledige testaanroep: 260 geslaagd; één testbestand stopte door een native Node/V8-WASM-crash. Dat bestand afzonderlijk: 10/10 geslaagd.
- TypeScript, ESLint en Next-productiebouw geslaagd.
- PDF met drie producten en twaalf maandregels gerenderd en visueel gecontroleerd: één aanvullende pagina, geen afgesneden tabel.
- Geen claim van live browser/iPad-verificatie: lokale Chromium kon door de uitvoeromgeving niet starten.
- Niet op de echte database gemigreerd; lokale PGlite-test verifieert rechten en versiebeheer, geen bewijs van live PostgREST/RLS-werking.

## Presentatie volgens goedgekeurde foto 2 (17 november)
- Eén paneel met gestapelde stroom/gas/watergrafieken, gedeelde legenda en maandstrook.
- Product- en eenheidsknoppen direct bereikbaar; klant/pand/periode/vergelijking bovenaan.
- Geen grote samenvattingskaarten boven de grafieken. Broninformatie ingeklapt.
- Financieel blok direct onder de grafieken; alle producten onafhankelijk van grafiekfilter.
- Presentatietotalen vanaf geselecteerde beginmaand t/m geselecteerde maand, uitsluitend afgesloten maanden. Cumulatief saldo blijft de bestaande waarde uit de afspraakketen; beginsaldo van de weergegeven periode wordt apart aangegeven.
- Ontbrekende afspraak/prijs/metingen worden niet als nul weergegeven.
- Geen wijziging in database, RLS, opslag of onderliggende verbruiksberekening.
- Verificatie: 11 gerichte tests, TypeScript, ESLint en Next-build geslaagd. PDF op één extra pagina visueel gecontroleerd. Browser/iPad niet visueel getest: lokale Chromiumstart geblokkeerd (socket Operation not permitted).

## Activatie en invoercontext 17 november
Na expliciet gebruikersakkoord is de bestaande SQL-migratie toegepast op lorimlzpadrsckgjvshy via MCP; remote migratieversie 20261117154549 (lokale bron 20261117143139). Beide tabellen, RLS en management-insertpolicies gecontroleerd. Geen anonieme SELECT en geen authenticated UPDATE. Geen klantbedragen ingevoerd. Houd bij toekomstige CLI-migratievergelijking rekening met dit versieverschil; niet blind db push uitvoeren.
De invoerlink neemt geselecteerde pand-IDs, klant en prijsjaar mee. Server beperkt panden en huurkeuzes tot deze context; lege selectie valt niet terug op Test pand. Het fysieke testpand wordt niet gewijzigd/verwijderd.
