# Energie-intelligence v2 — implementatie en vrijgave

## Doel en akkoord

Akkoord opdrachtgever op 13 oktober 2026: betrouwbare energieanalyse, historische prijzen, opvolging en resultaatmeting; optionele extra rapportagepagina. Geen toestemming voor productiemigratie, backfill of merge. Gebouwd op main `3933f4c4711b783adfed5b875a7e9cbbe3a17d80`, branch `feat/energie-intelligence-v2`.

De energiepagina staat standaard **uit**. Bestaande klantversie blijft één/twee pagina's afhankelijk van onderdelen. Het energiesupplement voegt precies één pagina toe. Aanwezige snapshots worden nooit automatisch geselecteerd voor opname in het rapport. De gebruiker vinkt het onderdeel aan en kiest een versie. Voorbeeld, PDF en bijbehorende Excel gebruiken dezelfde snapshot-ID, rapport-ID en woning-ID.

## Bestaande keten behouden

- `portfolio-analyse.ts`: uitgebreid met dezelfde publieke functies, bronintervallen, kwaliteitsmeldingen, kalenderdekking en strikte benchmarktoelating.
- `rekenregels.ts`, `metingen.ts`: gedeelde datums en meteraritmetiek; verbruiksservice gebruikt dezelfde registercontrole.
- Rapportagemotor v2 gebruikt de portefeuille-engine voor elektriciteit/gas/water. Oude opgeslagen rapporten blijven v1; niet achteraf aangepast.
- Predictive-engine gebruikt nu de nieuwste periode; geen omgekeerde tijdsvolgorde.
- Dashboard en analysequeries pagineren. Dashboardnormalisatie gebruikt de gedeelde intervalmotor met gedateerde bewoners-/huurbronnen. Detailrapportage haalt meterhistorie gepagineerd; persoonsnormalisatie gebruikt alle gedateerde huur-/bewonersbronnen van het pand.
- Historische opnameanalyse wordt begrensd op de opname die daadwerkelijk wordt geanalyseerd. Geen terugval naar een oudere meting als laatste opname geen bruikbaar interval heeft.
- Bestaande correcties, verklaringen, meterstanden, bewoners, verhuur, rapportages, taken en objecten blijven behouden.
- De nieuwe maatregel verwijst optioneel naar een bestaande taak; geen tweede takenmotor. Meterconfiguratie kan verwijzen naar bestaande `woning_objecten`.

## Rekenen en betrouwbaarheid

1. Kalenderintervallen zijn `[vanaf, tot)`; 1 september → 1 oktober is 30 dagen. Ongeldige ISO-datums en ambigue URL-parameters worden afgewezen.
2. Exacte modus accepteert alleen volledig ingesloten gemeten intervallen. Werkelijk gebruikte meetdatums blijven zichtbaar. Dekking telt de unie van gedekte kalenderdagen, inclusief ontbrekende panden in de portefeuillenoemer.
3. Schattingsmodus verdeelt een gemeten verschil evenredig over kalenderdagen tussen twee beschikbare standen. Geen extrapolatie. De oorspronkelijke grensstanden en allocatie blijven in de snapshot; schattingen heten nooit exact.
4. Bewonersadministratie is de primaire normalisatiebron, begrensd door verhuurdatums. Wisseldagen worden één keer geteld. Afwijkende opnameaantallen blokkeren de definitieve norm/benchmark. Bij nul bewoners blijft verbruik behouden.
5. Dag/nacht moet volledig zijn, tenzij een bevestigde meterconfiguratie één register toestaat. Afgeleide totaalkolom geldt niet als onafhankelijk bewijs van volledigheid. Dubbele kolomfamilies, afwijkend totaal, terugloop, dubbele opname en meterwissel worden gemeld/uitgesloten. Een expliciet onafhankelijke totaalmeter heeft eigen configuratie.
6. Verbruiksanomalie is niet hetzelfde als ongeldige meting. `kritiek`/`verhoogd` zijn signalen, geen automatische uitsluiting. `onwaarschijnlijk` per drager vraagt controle. Globale gasstatus mag elektriciteit niet automatisch uitsluiten. Geen bewijs van misbruik op basis van meterstanden alleen.
7. Benchmark standaard 100% dekking, ten minste vijf geschikte panden. Lagere grens is verkennend en vereist nog steeds identieke meetvensters. Geen stilzwijgende menging met geschatte waarden. De referentie is de portefeuille binnen de klantselectie; pandfilter bepaalt welke panden worden getoond. Mediaan per pand; portefeuillenorm gewogen op persoonsdagen. Kwartielen: positie `(n-1)*p`, IQR-grens `Q3+1,5*(Q3-Q1)`; geen automatische uitschieter bij nul-IQR.
8. Trend toont werkelijke meetvensters, niet de volledige hoeveelheid in de maand van de eindstand. Kalendermaandallocatie kan alleen geschat of met exacte grenzen.
9. Vorige periode heeft dezelfde duur en populatie en moet volledig betrouwbaar zijn. Geen vergelijking bij nulreferentie. Gebouwgebruik, klimaat en seizoenen zijn niet automatisch gecorrigeerd.
10. Maatregelresultaat kan een genormaliseerd verbruiksverschil tonen. Het wordt nooit automatisch geverifieerde/causale besparing. Ook maatregelen zonder resultaat blijven historisch zichtbaar.

De portefeuillepagina toont voor bruikbare gedeeltelijke meetvensters ook verbruik per persoon per week en een periodewaarde die naar de geselecteerde duur is omgerekend. Dit is een afzonderlijke presentatieberekening: de strikte normvelden voor benchmarks, snapshots en kosten blijven ongewijzigd. De periodewaarde is nadrukkelijk een raming op basis van de gemeten tijdsdekking, geen volledig gemeten periodeverbruik. Ontbrekende meetintervallen blijven ongedekt. Een onwaarschijnlijke grensopname blijft uitgesloten totdat een geldige bronstatus de waarschuwing onderbouwd wijzigt; het bestaan van een opvolgingsmarkering wist de waarschuwing niet.

## Tarieven

- Productcatalogus met eenheid en dimensie; kostenmotor accepteert productcodes/eenheden en intervallen onafhankelijk van de drie bestaande meteradapters. Nieuwe meterproducten vragen een adapter/invoerpad, geen nieuwe kostenmotor. kW is geen verbruikscomponent.
- Water m³ × 1000 = liter. Gas en water tellen niet samen op ondanks gelijke basiseenheid.
- Tariefplan: scope pand > klant > algemeen, valuta, leverancier/bron, begin/einde, auteur/tijd en componenten. Een plan erft als geheel; geen willekeurige mix. Overlap binnen dezelfde scope verboden.
- Variabel, dag/nacht, vast/dag, vast/maand, belasting en toeslag per eenheid; btw per component incl./excl. Kern kan verschillende percentages per component verwerken. Het eenvoudige invoerformulier gebruikt één opgegeven percentage voor de ingevoerde componenten.
- Teruglevertarief kan worden vastgelegd; verrekening blijft geblokkeerd zonder afzonderlijk exportvolume. Negatief meterverloop is geen teruglevering.
- Tariefwijziging zonder grensstand levert geen volledig exacte variabele kosten op. Schattingsmodus verdeelt aantoonbaar in dagen. Een onveranderde prijs over een maandgrens behoeft geen geschatte verbruikskosten; vastrecht kan afzonderlijk per kalendermaand worden verdeeld.
- Geldaritmetiek gebruikt gehele decimale schaal (9 decimalen) en expliciete halve-naar-boven afronding per componentregel. Btw wordt op de ongeronde grondslag berekend; zichtbare centregels tellen op tot het totaal.
- Ontbrekende tarieven leveren `totaal=null`, met bekende deelregels, nooit een fictief €0-totaal. Verschillende valuta worden niet tot één bedrag opgeteld.
- Versies zijn append-only: wijzig een tarief door een nieuwe versie met `voorganger_id`; oude snapshots bewaren oude tariefwaarden.

## Snapshot en klantveiligheid

`energie_snapshots` bewaart klantprojectie, interne bronnen/waarden, filters, toegepaste tariefversies, tussenwaarden, rekenregelsversie, codeversie, gebruiker/tijd en SHA-256 van de interne payload. Alleen bron-ID's zouden onvoldoende zijn omdat meterstanden kunnen worden gecorrigeerd. Productiebuild gebruikt `VERCEL_GIT_COMMIT_SHA` wanneer aanwezig, anders de expliciete rekenregelsversie; bij releases moet de commit beschikbaar zijn.

Nieuwe energiesnapshots veranderen `maandrapportages.rapport_data` niet. Het opnieuw samenstellen van reeds vastgelegde maandrapporten is geblokkeerd om historie te behouden. Een oude rapportage kan wel een nieuwe afzonderlijke energiesnapshot krijgen. Klantprojectie selecteert velden expliciet; geen bewonersnamen, interne bronpayload of andere pandnamen. Maatregeltitel en klanttekst vereisen expliciete vrijgave. Dat is een menselijke inhoudelijke controle, geen automatische garantie dat vrije tekst geen persoonsgegevens bevat.

Oudere klant-PDF-onderdelen bevatten vrije melding-/oplossingstekst. De bronhistorie wordt niet herschreven: de klantprojectie toont standaard neutrale afhandelingsinformatie en neemt alleen expliciet vrijgegeven klantvelden over. Interne vrije tekst blijft intern. Het nieuwe supplement gebruikt alleen de vrijgegeven klantprojectie. Met supplement gekozen wordt de oudere kleine energievergelijking onderdrukt om twee verschillende versies van cijfers naast elkaar te voorkomen.

## Beveiliging

De bestaande interne rollenfuncties worden hergebruikt. Nieuwe tabellen hebben expliciete grants en RLS. Alleen managementinformatie-rollen lezen; administratiebevoegdheden maken snapshots/maatregelen; alleen admin/management maken tarief- en meterconfiguratieversies. Alle nieuwe versies zijn onveranderlijk. Cross-property relaties naar taak, meterobject en rapport worden gecontroleerd. `created_by` moet `auth.uid()` zijn; tijdstip wordt door de database gezet.

Migratie trekt publieke/anon/authenticated uitvoerrechten van de bestaande schrijvende definer `bereken_energie_bezetting_trends(bigint,date)` in. De nieuwe engine rekent read-only in de app. Bestaande interne eigenaar-/service-uitvoering is niet verwijderd. Bestaande brede authenticated SELECT-policies op legacy tabellen zijn NIET ongericht aangepast: klantaccounts mogen daarmee nog niet rechtstreeks toegang tot die tabellen krijgen.

## Migratie en databehoud

Enige nieuwe migratie: `20261013151053_energie_intelligence_v2.sql`, via Supabase CLI aangemaakt, **niet op productie uitgevoerd**.

- Nieuwe tabellen: producten, tariefversies, meterconfiguratieversies, maatregelversies, rapportmomentopnames.
- Alleen drie productdefinities worden toegevoegd; geen historische businessdata gewijzigd, geen backfill.
- Nieuwe geschiedenis is beschermd tegen UPDATE/DELETE, ook wanneer later onbedoeld schrijfrechten worden gegeven.
- SQL is opnieuw uitvoerbaar; lokale herhaling getest. Voor bestaande productie-schema-afwijkingen blijft expliciete DDL-vergelijking nodig.

### Read-only controles vóór afzonderlijke vrijgave

```sql
begin read only;
select version,name from supabase_migrations.schema_migrations order by version desc limit 20;
select table_name from information_schema.tables where table_schema='public' and table_name like 'energie_%';
select has_function_privilege('anon','public.bereken_energie_bezetting_trends(bigint,date)','EXECUTE') as anon_execute;
select count(*) as meterstanden from public.meterstanden;
select count(*) as correcties from public.meterstand_correcties;
select count(*) as rapporten from public.maandrapportages;
commit;
```

Pas GEEN volledige reeks ongecontroleerde “pending” migraties toe: repository en productie hebben verschillende tijdstempels voor eerdere migraties. Controleer deze ene migratie en haar afhankelijkheden. Maak reguliere versleutelde databaseback-up en noteer aantallen vooraf. Geen productie-opdracht is al geautoriseerd door dit document.

### Controle na expliciet goedgekeurde toepassing

```sql
begin read only;
select tablename,rowsecurity from pg_tables where schemaname='public' and tablename like 'energie_%';
select tablename,policyname,roles,cmd from pg_policies where schemaname='public' and tablename like 'energie_%';
select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name like 'energie_%';
select count(*) from public.energie_producten;
select has_function_privilege('anon','public.bereken_energie_bezetting_trends(bigint,date)','EXECUTE');
commit;
```

Controleer ongewijzigde aantallen bestaande meterstanden/correcties/rapporten, behoudens verklaarde normale gebruikersmutaties. Test de daadwerkelijke Supabase-rollen en PostgREST-endpoints op een veilige omgeving, inclusief foutmeldingen en opt-in exports. Lokaal zijn synthetische rolhelpers gebruikt; dat is geen bewijs voor alle productiepolicies.

### Terugval

Vorige applicatieversie herstellen of nieuwe ingangen uitschakelen. Nieuwe tabellen/versies behouden, niet droppen. Geen reverse backfill. Herstel geen onveilige publieke EXECUTE-grant. Rechtenwijzigingen worden apart beoordeeld. Als later een backfill nodig is: eerst read-only impactrapport en afzonderlijke toestemming.

## Tests en bewezen grenzen

Golden tests leggen tussenwaarden vast:764kWh,128pd,41,78125 en16/30 dekking; bewonersconflict99 versus77; expliciete allocatie70/40; kosten26+5,50+6,62=38,12; btw-inclusief10+2,10; nulbewoners; archief; klantwissel; registerconflicten; n<5/IQR; >1500 gepagineerde bronregels; snapshotbehoud; opt-in PDF en klantprojectie.

Migration/RLS-tests draaien met PGlite (PostgreSQL in WASM) en synthetische bestaande tabellen/rolhelpers. Ze controleren herhaalbaarheid, bevoegdheden, overlap en onveranderlijkheid. Productie is niet gemuteerd voor tests.

### Grenzen die zichtbaar blijven

- Werkelijke bezetting Heirstraat en ambigue fysieke meterconfiguraties vragen inhoudelijke verificatie; geen automatische correctie.
- Zonder voldoende grensmetingen kan de standaard exacte benchmark leeg zijn. Dat is een correct kwaliteitsresultaat.
- De bestaande opnamegrafieken en predictive-verkenning behouden hun indicatieve normalisatie op opnamebezetting; dit staat expliciet in de weergave/toelichting. Centrale analyse, dashboardnormalisatie en v2-rapportagenormen gebruiken bewonershistorie.
- Geen slimme-metertelemetrie, exportregisters, weer-/graaddagcorrectie of automatische bewezen-misbruikdetectie toegevoegd. Tarief-/maatregelmodel is hierop uitbreidbaar; huidige data ondersteunt deze claims niet.
- Meterreset over verschillende fysieke meters wordt niet overbrugd. De bestaande opname-trigger blijft beschermd; eventuele nieuwe metergebonden invoer vereist een afzonderlijk gecontroleerde uitbreiding.
- Eén extra pagina is een samenvatting. Volledige gebruikte perioden, tariefregels, meldingen en vrijgegeven maatregelen staan in de bijbehorende Excel-snapshot.
