# Rozvrh z Bakalářů na iPhonu

Widget pro [Scriptable](https://scriptable.app), který ukáže rozvrh z Bakalářů
přímo na ploše telefonu.

**Proč:** Bakaláři se načítají nekonečně dlouho. Než se prokoukáš přes přihlášení
a rozklikáš se k rozvrhu, je po přestávce. Tohle je na ploše hned — koukneš
a víš, co máš další hodinu a kde.

- **na ploše** — widget s hodinami, které ten den ještě zbývají, a jejich učebnami
- **po ťuknutí** — celoobrazovková appka: swipe mezi dny, u každé hodiny učitel, téma a změny

Data si drží v cache, takže widget ukáže rozvrh i bez signálu. Přizpůsobuje se
světlému i tmavému režimu iOS.

## Instalace

1. Stáhni si **Scriptable** z App Storu (zdarma).
2. V něm dej **+** a vlož obsah `Rozvrh.js`.
3. Skript pojmenuj **`Rozvrh`**.
4. Spusť ho jednou tlačítkem ▶ — povolí se připojení a přihlásíš se (viz níž).
5. Na plochu přidej widget **Scriptable**, v jeho nastavení vyber skript
   `Rozvrh` a **When Interacting** nastav na **Run Script**.

Nepovinně přidej i `Rozvrh ucet.js` jako samostatný skript — slouží k přepnutí
nebo odhlášení účtu.

## Přihlášení

**Do kódu se nic psát nemusí.** Při prvním spuštění v aplikaci se objeví dialog
se třemi poli: adresa Bakalářů tvojí školy, uživatelské jméno a heslo.

Skript údaje hned ověří proti serveru — když jsou špatně, zeptá se znovu, když
sedí, uloží je do iOS Keychainu a **příště už se neptá**. Heslo se nikam jinam
neukládá a v kódu nefiguruje.

Adresa školy je obvykle ve tvaru `https://neco.bakalari.cz`. Najdeš ji v odkazu,
přes který se do Bakalářů hlásíš na počítači.

Heslem se skript přihlašuje jen poprvé. Pak si uloží tokeny a obnovuje si je
sám. Když ti ve škole heslo změní, řekne si o nové sám dalším dialogem.

Widget na ploše dialog zobrazit neumí, takže než se poprvé přihlásíš v appce,
píše *„Otevři skript Rozvrh v aplikaci Scriptable a přihlas se"*.

### Změna účtu / odhlášení

Spusť skript `Rozvrh ucet` — nabídne **Přihlásit jiný účet** a **Odhlásit
a smazat údaje**. Totéž umí hlavní skript, když mu do parametru widgetu napíšeš
`ucet`.

## Kolik dní dopředu

V nastavení widgetu je pole **Parameter**. Napíšeš do něj číslo a widget ukáže
o tolik **školních** dní dál:

| Parameter | ukazuje |
|---|---|
| prázdné nebo `0` | nejbližší den |
| `1` | + 1 školní den |
| `2` | + 2 dny |
| `ucet` | otevře přihlášení místo rozvrhu |

Počítají se školní dny, ne kalendářní — o víkendu ukáže `0` rovnou pondělí.

Chceš vidět víc dní najednou? Přidej na plochu víc widgetů, každému dej jiný
parametr a naskládej je na sebe do stacku (podrž → **Edit Stack** → vypni
**Smart Rotate**). Pak mezi dny listuješ swipem přímo na ploše.

## Widget

```
Dnes 21. 9.                      do 13:25
  8:00  Biologie                        B
  8:55  Zeměpis                        5p
 10:00  Tělesná výchova            odpadá
 10:55  Tělesná výchova               Tv1
 11:50  Český jazyk a literatura       3a
● za 30 min · M 204                    +1
```

Vlevo začátek hodiny, uprostřed předmět, vpravo učebna v pevném sloupci — ta se
nikdy nezkracuje, ukrojí se název předmětu. Hodina, která zrovna běží, má
**jemný modrý podklad, modrý čas a tučnější název**, ostatní sedí na sotva
znatelném průsvitném pruhu. Odpadlé hodiny
jsou vybledlé a místo učebny mají `odpadá`. Změněná učebna a suplování svítí žlutě.
`+1` v patičce znamená, že se do widgetu nevešla ještě jedna hodina.

Hodiny, které už skončily, widget vyhazuje — zbývá jen to, co tě ten den čeká.
Když ten den doučíš, přeskočí sám na další školní den; víkendy přeskakuje taky.

Velikosti:

- **malý** — 6 hodin, ale místo názvů **zkratky předmětů** (`Ge`, `ČJL`, `DeskG`).
  Na jednu kostku se celý název stejně nevejde a uřízne se, takže je lepší mít
  zkratku celou a vedle ní čas a učebnu. Většinou se tak vejde celý zbytek dne.
  Odpadlá hodina má kvůli místu jen `odp.` místo `odpadá`.
- **střední** — 5 hodin s plnými názvy (doporučeno)
- **velký** — **dva dny pod sebou**, u každého 6 hodin

Výšky jsou spočítané na 158 pt (malý/střední) a 354 pt (velký). Když budeš zvětšovat
písma nebo přidávat řádky, hlídej si to — iOS přetečení nezmenší, jen ořízne. Proto
má každý název `lineLimit = 1`.

Šest řádků na malém widgetu je napočítané s rezervou zhruba 12 pt. **Kdyby ti to
uřízlo patičku, sniž `maleHodin` v `CONFIG` na 5** — nic jiného měnit nemusíš,
počítadlo `+N` se dopočítá samo.

Widget si říká o překreslení buď za `obnovitPoMin`, nebo ke konci právě probíhající
hodiny — podle toho, co přijde dřív. iOS to bere jako přání, ne příkaz.

## Vzhled

Neutrální podklad a **jediná barva navíc** — akcentní modrá z loga Bakalářů.
Dřív bylo pozadí složené ze čtyř modrých faset a dvou hexagonů, což při
plné modré přes celý widget dělalo nepokojnou plochu; teď je to tiché pozadí,
na kterém svítí jen to podstatné.

Pozadí se nestahuje, skládá se ze dvou vrstev (proč zrovna takhle, viz
*Světlý a tmavý režim*):

- **Podklad** je `backgroundGradient` ze tří zastávek s výrazným spádem.
  Tmavě `#243343 → #121a23 → #030405`, tedy ze studené šedomodré skoro do
  černé, světle `#ffffff → #cadcef`. Zastávka uprostřed je na `0.48`, aby se
  přechod odehrál hlavně v dolní polovině.
- **Značka** je hexagon vpravo dole, složený ze čtyř vrstev:

  1. **Záře** — sedm tahů `hexagon()` od nejširšího k nejužšímu, každý
     v `#4aa0d9` s krytím `0.022`. `DrawContext` neumí stín ani rozostření,
     tohle je nejbližší náhrada. Sedm tahů je potřeba: při třech jsou na
     přechodu vidět soustředné stupně.
  2. **Výplň** na `r * 0.96` s krytím `0.05`, aby měl tvar tělo a nebyl to
     jen drátový obrys.
  3. **Vnější prstenec** linkou `r * 0.12` s krytím `0.34`.
  4. **Vnitřní hexagon** na `r * 0.6` linkou `r * 0.07` — motiv z ikony Bakalářů.

  Rohy jsou zaoblené. `DrawContext` nemá nic jako `lineJoin`, takže zaoblení
  musí být přímo v cestě: `hexagon()` se u každého vrcholu zastaví kousek před
  ním a místo hrotu udělá `addQuadCurve()`, která má vrchol jako řídicí bod.
  Parametr `zaobleni` je podíl délky strany, výchozí `0.25`, nula dá ostrý roh.
  Při `0.32` už tvar splývá do oblého flíčku a hexagon z něj není poznat.

  Umístění se liší podle tvaru widgetu. Čtvercové velikosti (1×1 a large) mají
  znak blíž k rohu, široká 2×1 kousek dovnitř — u nízkého širokého widgetu by
  z něj u rohu zbyl jen proužek. Rozhoduje `sirka / vyska < 1.4`.

Poloměr je `Math.min(vyska * 0.44, sirka * …)`. Kdyby se odvozoval jen ze
šířky, na široké střední velikosti by hexagon přerostl výšku widgetu a místo
tvaru by z něj byl jen šikmý pruh přes celou plochu.

Akcentní modrá znamená vždycky „tohle se tě týká teď" — probíhající hodina,
její čas a učebna, tečka v patičce. Žlutá je jediná další barva a znamená
vždycky „něco je jinak, než má být" (odpadá, suplování, změna místnosti).

Appka po ťuknutí drží stejný jazyk: průhledná hlavička s hexagonem v akcentu
místo modrého pruhu, karty na průsvitném panelu, probíhající hodina modře
podbarvená s modrým rámečkem.

## Appka (po ťuknutí na widget)

- **swipe doleva/doprava** mezi dny, nahoře lišta s dny (oranžová tečka = ten den je změna)
- u hodiny číslo, začátek, zkratka, učitel, plný název, téma a učebna
- odpadlé hodiny jsou přeškrtnuté, u suplování a změny místnosti svítí oranžový popis
- dole počet hodin a od kdy do kdy se ten den učíš

Appka nestahuje nic sama — data jí skript předá při otevření, takže se nečeká na síť
a widget i appka ukazují totéž.

## Jak funguje posun mezi dny

Parametr widgetu říká, o kolik **školních** dní dál než nejbližší den koukáš.
Ne kalendářních: o víkendu ukáže `POSUN = 0` rovnou pondělí. Nejbližší den je dnešek,
po poslední hodině zítřek.

Kolik dní dopředu jde nastavit, nic neomezuje — parametr je obyčejné číslo.
Chceš víc dní naráz bez swipování? Dej **velký** widget — má dva dny pod sebou.

## Nastavení

V bloku `CONFIG` nahoře:

| klíč | co dělá |
|---|---|
| `skola` | URL Bakalářů i s `https://` — výchozí, přepíše ji přihlašovací dialog |
| `jmeno` | přihlašovací jméno — nech prázdné, zeptá se |
| `heslo` | heslo — nech prázdné, zeptá se |
| `ukazovatOdpadle` | `false` odpadlé hodiny úplně schová |
| `maleHodin` | kolik hodin se vejde na malý widget (6) |
| `obnovitPoMin` | jak často si widget říká o překreslení |
| `vzhled` | `"auto"` podle iOS, nebo natvrdo `"tmavy"` / `"svetly"` |

## Světlý a tmavý režim

`vzhled: "auto"` (výchozí) se řídí systémovým nastavením iOS — **Settings →
Display & Brightness → Light / Dark**. Widget i appka se přebarví samy, nic
nastavovat nemusíš.

**Appka** nechává rozhodnout CSS `prefers-color-scheme` a překreslí se hned.

**Widget** narazí na dvě omezení Scriptable, která spolu zlobí:

1. `Device.isUsingDarkAppearance()` ve widgetu nefunguje („This API is not
   supported in widgets") a vrací pořád světlou. Použitelné je jen
   `Color.dynamic(světlá, tmavá)` — tu vyhodnotí samo iOS až při vykreslení.
2. Do nakresleného obrázku (`DrawContext`) se dynamická barva dostat nedá,
   obrázek je hotový v okamžiku, kdy skript doběhne.
3. `ListWidget` navíc kreslí buď `backgroundGradient`, **nebo**
   `backgroundImage` — ne obojí přes sebe. Kdo nastaví oboje, o obrázek přijde.

Pozadí je proto ve dvou vrstvách. Barevný podklad je `backgroundGradient`
z dynamických barev přímo na `ListWidget`, hexagon je `backgroundImage`
**vnořeného stacku** — ten má vlastní vrstvu, takže leží nad přechodem. Aby
jeden obrázek seděl na obě palety, kreslí se akcentní modrou s nízkým krytím
a barvu si bere zespodu.

Přepnutí Light/Dark tedy řeší iOS samo, jen widget překreslí, až se mu bude
chtít (nejpozději po `obnovitPoMin`). Kdo nechce čekat nebo chce jedno téma
napevno, nastaví si `vzhled`.

Když chceš jedno z nich napevno, přepiš `vzhled` na `"tmavy"` nebo `"svetly"`.

## Co v widgetu nejde (limity iOS, ne skriptu)

- **swipovat uvnitř jednoho widgetu** — widgety neumí gesta, jen ťuknutí.
  Swipe na ploše se dělá stackem (viz výš), horizontální swipe je v appce.
- **animovat cokoliv** — widget je statický snímek.
- **vynutit obnovení** — kdy se widget překreslí, rozhoduje iOS. Scriptable nemá
  přístup k `WidgetCenter.reloadAllTimelines()`.

## Na co si dát pozor při úpravách

Kód je bez komentářů, takže tyhle věci jsou popsané jenom tady.

**1. V `Rozvrh.js` nesmí být top-level `await`.** `importModule` by volajícím skriptům
vrátil Promise místo exportů a `rozvrh.spust` by bylo `undefined`. Proto se na konci
volá `spust(...)` bez `await` a běh ukončí `Script.complete()`.

**2. Globální proměnná se mezi moduly nepřenese.** Rozlišení „běžím sám vs. někdo mě
importoval" proto stojí na `module.filename` a `Script.name()`, ne na `globalThis`.

**3. `HTML_SABLONA` je template literal.** Uvnitř nesmí být zpětný apostrof ani `${`,
jinak se řetězec rozpadne. Proto JS v appce skládá texty přes `+` a ne přes šablony.
Data se dovnitř dostávají přes `__DATA__`, které se nahradí až za běhu.

**4. Přepínání dní v appce nesmí viset na scroll události.** `skoc()` proto přepíše
nadpis i aktivní pilulku hned a scroll dorovná v `setTimeout`, když se smooth scroll
neprovedl. Když to viselo jen na listeneru, nadpis zůstal na starém dni a appka
ukazovala něco jiného, než měla zvýrazněné.

**5. Sloupec s pevnou šířkou nesmí mít uvnitř `addSpacer()`.** Spacer si vezme
místo přednostně a text vedle něj se zkrátí na `B4…`, i když by se do sloupce
v pohodě vešel. Učebny se kvůli tomu na malém widgetu ořezávaly. Proto `casBox`
ani `ucebnaBox` spacer nemají a text v nich je zarovnaný doleva — zarovnání
doprava přes spacer se za to nevyplatí. Odsazuje se jen `row.addSpacer()` *mezi*
názvem a sloupcem učebny, ten je v pořádku.

**6. `Id` v odpovědi API má mezery** (`" 6"`, `"U  12"`). Nesmí se trimovat, jinak
`SubjectId` přestane sedět na `Subjects` a všechny předměty zmizí.

**7. `prekryv()` dostává pevné rozměry podle rodiny widgetu** (170, 360, 380), ne
skutečnou velikost — tu Scriptable neřekne. `backgroundImage` se roztáhne, takže
když se rozměry netrefí do poměru, hexagon zešikmí. Proto má large vlastní výšku.

**8. Odpadlé hodiny se počítají jinak než ostatní.** Rozhodnutí „doučil jsem" i
patička berou jen hodiny, které nejsou `Canceled` ani `Removed`. Kdyby se počítaly
všechny, widget by po poslední odpadlé hodině nepřeskočil na zítřek.

## API Bakalářů

[Dokumentace](https://github.com/bakalari-api/bakalari-api-v3), neoficiální.

```
POST /api/login                 client_id=ANDR&grant_type=password&username=…&password=…
                             -> {access_token, refresh_token, expires_in}
POST /api/login                 client_id=ANDR&grant_type=refresh_token&refresh_token=…
                             -> totéž
GET  /api/3/timetable/actual?date=YYYY-MM-DD    Authorization: Bearer …
                             -> {Hours, Days, Classes, Groups, Subjects, Teachers, Rooms, Cycles}
```

Skript si tahá dva týdny — ten aktuální a následující — a slepí je za sebe, aby
v pátek odpoledne měl na co přeskočit.

Jeden `Days[]` je jeden den, `Atoms[]` jsou jeho hodiny. Atom ukazuje do číselníků
přes `HourId`, `SubjectId`, `TeacherId`, `RoomId`. Učebna je `Rooms[].Abbrev`
(`Name` bývá prázdné).

`Change` je `null`, nebo objekt s `ChangeType`:

- `Canceled`, `Removed` — hodina není, důvod je v `Description`
- `Substitution` — suplování
- `RoomChanged` — jiná učebna, ale `RoomId` už ukazuje na tu novou
- `Added` — přidaná hodina, často bez `SubjectId`; pak se bere `Description`

O prázdninách a svátcích přijdou dny s prázdnými `Atoms` a `DayType` je `Holiday`,
`Celebration` nebo `DirectorDay`; jméno bývá v `DayDescription` („Mistr Jan Hus").
Když je volno celý týden, je prázdné všechno kromě `Hours`.

Na starý token vrací `401` a `{"Message":"Authorization has been denied for this request."}`.

## Licence

Copyright (c) 2026 Ondřej Novotný. Všechna práva vyhrazena.

Kód je zveřejněný, aby si ho šlo projít a poučit se z něj. Kopírování, úpravy,
šíření ani komerční použití bez předchozího písemného souhlasu autora dovolené
nejsou. Plné znění je v [LICENSE.md](LICENSE.md).

Projekt nemá s firmou Bakaláři software s.r.o. nic společného — jen používá
jejich veřejné API jménem uživatele, který se přihlásí svými údaji.
