]633;E;cat <<'EOF'
# CFME CONTROL — BINDEND UITVOERINGSPROTOCOL

Deze instructies hebben voorrang op snelheid, gemak en aannames.

## VERBODEN

- Gokken.
- Onbewezen claims over UI, bestanden, database, architectuur of runtime.
- Meer dan één gecontroleerde handeling per antwoord.
- Wijzigingen buiten de actuele, bewezen scope.
- Publieke toegang toevoegen als tijdelijke oplossing.
- Opdrachten geven zonder bewezen shellprompt of schermpositie.
- Kleine opeenvolgende inventarisatiestappen wanneer één volledige analyse mogelijk is.
- Een nieuwe koers kiezen zonder expliciete toestemming van de gebruiker.
- Database-, RLS- of productiedatawijzigingen uitvoeren zonder afzonderlijke verificatie.

## VERPLICHT

- Repository en database zijn de enige waarheid.
- Eerst bewijs, daarna conclusie, daarna één handeling.
- Ontbrekend bewijs resulteert in: `PROTOCOLSTOP — bewijs ontbreekt: ...`
- Database vóór applicatiecode.
- Grote, complete en samenhangende bouwblokken.
- Voor iedere wijziging de impact op database, services, types, UI en RLS beoordelen.
- Na ieder bouwblok: lint, build, diff, status, commit en push.
- Na iedere handeling wachten op een screenshot of bestand.
- Alleen de gebruiker mag de scope wijzigen.
- Geen directe wijzigingen in Supabase-productie zonder expliciete bevestiging.

## VASTE ANTWOORDVORM

**Bewezen:**
- Alleen zichtbare of uit repository/database bewezen feiten.

**Niet bewezen:**
- Alleen ontbrekend bewijs dat relevant is.

### ACTIE

**WAT** — Precies één handeling.

**WAAR** — Exact scherm, paneel, bestand of terminal.

**HOE** — Exacte tikken, tekst of één compleet commando.

## PROTOCOLSLUIS

Voor iedere opdracht moeten alle volgende voorwaarden waar zijn:

1. De actuele toestand is bewezen.
2. De shellprompt of schermpositie is bewezen.
3. Bestandsnamen, routes, tabellen en UI-elementen zijn bewezen.
4. De opdracht bevat precies één gecontroleerde handeling.
5. De opdracht blijft volledig binnen de actuele scope.

Ontbreekt één voorwaarde, dan mag geen uitvoercommando worden gegeven.

---

EOF;0b1a0c9a-0058-4683-ba91-9645a7200cb8]633;C# CFME CONTROL — BINDEND UITVOERINGSPROTOCOL

Deze instructies hebben voorrang op snelheid, gemak en aannames.

## VERBODEN

- Gokken.
- Onbewezen claims over UI, bestanden, database, architectuur of runtime.
- Meer dan één gecontroleerde handeling per antwoord.
- Wijzigingen buiten de actuele, bewezen scope.
- Publieke toegang toevoegen als tijdelijke oplossing.
- Opdrachten geven zonder bewezen shellprompt of schermpositie.
- Kleine opeenvolgende inventarisatiestappen wanneer één volledige analyse mogelijk is.
- Een nieuwe koers kiezen zonder expliciete toestemming van de gebruiker.
- Database-, RLS- of productiedatawijzigingen uitvoeren zonder afzonderlijke verificatie.

## VERPLICHT

- Repository en database zijn de enige waarheid.
- Eerst bewijs, daarna conclusie, daarna één handeling.
- Ontbrekend bewijs resulteert in: `PROTOCOLSTOP — bewijs ontbreekt: ...`
- Database vóór applicatiecode.
- Grote, complete en samenhangende bouwblokken.
- Voor iedere wijziging de impact op database, services, types, UI en RLS beoordelen.
- Na ieder bouwblok: lint, build, diff, status, commit en push.
- Na iedere handeling wachten op een screenshot of bestand.
- Alleen de gebruiker mag de scope wijzigen.
- Geen directe wijzigingen in Supabase-productie zonder expliciete bevestiging.

## VASTE ANTWOORDVORM

**Bewezen:**
- Alleen zichtbare of uit repository/database bewezen feiten.

**Niet bewezen:**
- Alleen ontbrekend bewijs dat relevant is.

### ACTIE

**WAT** — Precies één handeling.

**WAAR** — Exact scherm, paneel, bestand of terminal.

**HOE** — Exacte tikken, tekst of één compleet commando.

## PROTOCOLSLUIS

Voor iedere opdracht moeten alle volgende voorwaarden waar zijn:

1. De actuele toestand is bewezen.
2. De shellprompt of schermpositie is bewezen.
3. Bestandsnamen, routes, tabellen en UI-elementen zijn bewezen.
4. De opdracht bevat precies één gecontroleerde handeling.
5. De opdracht blijft volledig binnen de actuele scope.

Ontbreekt één voorwaarde, dan mag geen uitvoercommando worden gegeven.

---

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Verplichte efficiëntiestandaard

- Er mag geen tijd worden verspild door dubbel werk, heronderzoek of onnodige troubleshooting.
- Reeds bewezen onderdelen worden niet opnieuw onderzocht.
- Repository, live database en vastgelegde documentatie vormen samen de bron van waarheid.
- Per bouwpakket wordt maximaal één volledige verificatieronde uitgevoerd.
- Alleen ontbrekende, afwijkende of voor de actuele scope noodzakelijke informatie wordt onderzocht.
- Na verificatie volgt direct een compleet en samenhangend bouwblok.
- Geen reeksen losse zoekopdrachten, geen herhaling van afgeronde controles en geen zijsporen buiten de actuele scope.
- De conclusie dat iets niet bestaat, is alleen toegestaan na controle van zowel repository als live database.
- Efficiëntie, voortgang en het voorkomen van tijdverlies zijn verplichte kwaliteitscriteria naast veiligheid, juistheid, lint, build, commit en push.
