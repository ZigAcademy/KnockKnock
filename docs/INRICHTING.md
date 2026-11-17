# Inrichting woonkamers (fase 4b)

Eén herbruikbaar kamersjabloon (`src/world/interior.ts`), per woning ingevuld met data (`src/world/interiors.ts`): plek van de binnendeur, ramen, meubels, licht en de hotspots. De inrichting volgt uit wat `scenarios.json` over de huurder en het probleem zegt; er komt geen nieuwe inhoud of tekst in beeld. Geen stereotypen op basis van naam of afkomst: de spullen passen bij het verhaal (kraan, dakgoot, fiets), niet bij een achtergrond.

Vrije zones (in code gecontroleerd, `src/world/vrijeZones.ts`, plus test `tests/inrichting.spec.ts`): vóór elke deur 1 m vrij, onder elk raam niets hoger dan de vensterbank, een looproute van de deur naar de huurder, en geen meubel dat een hotspot vanuit de camera verbergt.

## Lindelaan 14 – de heer Farouk (lekkende keukenkraan, nieuw telefoonnummer)
- **Sfeer:** opgeruimde, warme woonkeuken bij daglicht; het leven speelt zich af rond de eettafel.
- **Kleuren:** zandkleurige muren, eiken vloer, olijfgroene keukenkastjes, rond kleed in gedempt roestbruin.
- **Indeling:** keukenblok met koelkast en oven langs de achterwand links (de kraan met emmer valt meteen op), ronde eettafel in het midden met de telefoon en het briefje, bureautje met laptop tegen de rechterwand, dressoir tegen de linkerwand. Binnendeur links vóór.
- **Persoonlijk:** fruitschaal op tafel, radio en ingelijste prints op het dressoir, planten in de vensterbank, hanglamp boven de tafel.
- **Huurder:** staat tussen keuken en tafel, met zicht op de kraan.

## Lindelaan 16 – de heer Mensah (lekkende dakgoot, drie keer gebeld)
- **Sfeer:** praktisch en wat grauw: regenlicht door het raam waarlangs het water loopt.
- **Kleuren:** koel lichtgrijze muren, donkere vloer, blauwgrijze bank, rechthoekig kleed in leisteen.
- **Indeling:** anders dan nr 14: binnendeur in de achterwand links, compacte kitchenette ernaast, zithoek met bank en salontafel tegen de linkerwand, bijzettafel naast de bank met de vaste telefoon en het notitieblok, werkplek met laptop tegen de rechterwand, raam rechts achter helemaal vrij.
- **Persoonlijk:** kapstok bij de deur, boekenplank, plant, kussens op de bank.
- **Huurder:** staat midden in de kamer, tussen zithoek en werkplek.

## Lindelaan 18 – mevrouw Hansen (harde muziek bij de buren, donkere fietsenstalling)
- **Sfeer:** avond: knus lamplicht binnen tegenover het donkere raam naar de stalling.
- **Kleuren:** zachte crème muren, licht houten vloer, saliegroene bank, gedempt blauw kleed.
- **Indeling:** binnendeur links achter; bank tegen de linkerwand met leeslamp en salontafel; boekenkast langs de achterwand; ronde tafel met laptop vóór het raam; de muur naar de buren (rechts) blijft helemaal vrij, zodat het trillende schilderij en de geluidsgolven opvallen.
- **Persoonlijk:** kapstok met fietshelm bij de deur (zij zet haar fiets in de stalling), mok op de salontafel, boeken, planten.
- **Huurder:** staat tussen bank en tafel.

## Lindelaan 20 – de heer Mulder (bezwaar huurverhoging: berging weg)
- **Sfeer:** licht en opgeruimd, daglicht via het raam naar de achtertuin.
- **Kleuren:** lichte saliegroene muren, warme vloer, blauwgrijze keuken, saliegroene bank.
- **Indeling:** keuken met koelkast links achter (de afloop noemt de koelkast), eettafel in het midden met de brief, raam rechts achter met zicht op de tuin en de betonplaat waar de berging stond, bank en salontafel rechts, binnendeur links.
- **Huurder:** staat links bij de tafel.

## Lindelaan 22 – de heer Van Dijk (achterstand, betalingsregeling)
- **Sfeer:** compact en wat vol, gewone doordeweekse woonkamer.
- **Kleuren:** warm crème, middenbruine vloer, bruine keuken en bank.
- **Indeling:** binnendeur links in de achterwand met een kastje ernaast waarop de stapel post ligt, werkplek met laptop tegen de linkerwand, kitchenette achterin, ronde tafel, zithoek met tv rechts.
- **Huurder:** staat midden-links, tussen werkplek en tafel.

## Lindelaan 24 – de heer Volkov (tweede toilet boven)
- **Sfeer:** hoge kamer met een open trap en een overloop, zodat je ziet wat er boven is.
- **Kleuren:** warm wit, middenbruine vloer, grijsviolette bank en kleed.
- **Indeling:** trap langs de linkerwand naar de overloop achterin (lage balustrade); boven de badkamerdeur en de lege hoek ernaast (hotspot); beneden een eettafel met de folder, een bank tegen de rechterwand en de binnendeur rechts.
- **Huurder:** staat beneden aan de voet van de trap.

Het sjabloon kreeg hiervoor een optionele `verdieping` (overloop + trap); de trap telt mee in de controle op vrije zones.

## Hergebruik
Een nieuwe kamer is alleen data: `kamer` (deur, ramen, kleuren, licht), `meubels` (model + maat + plek) en `hotspots`. De zonecontrole meldt botsingen in de console en in de test.
