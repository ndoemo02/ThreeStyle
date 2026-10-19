# Winda i lobby — przegląd i plan etapu C (2026-10-19)

Gałąź `codex/entry-lobby-transition` @ `6505d4f`. Bez zmian w kodzie — tylko przegląd, pomiary i plan do zatwierdzenia przez właściciela.

Referencje:
- `assets/Review/Lobby/Lobby.A.jpg` — stan sprzed polishu z 16.10, ten sam kadr co dziś (`?zone=hub&qa=signage`).
- `assets/Review/Lobby/Lobby.B.png` — docelowe ustawienie i nastrój lobby (wg właściciela: „weź pod uwagę ustawienie”).
- `assets/Review/CreatorRoom/Room.B.png` — jedyna referencja drzwi windy: szczotkowany szampański brąz, ciemna rama z ciepłą obwódką LED, ciemne nadproże, panel przywołania obok.
- Zrzuty z telefonu właściciela (19.10): winda „dramat”, lobby „najbardziej ujmuje efekt” poza pokojem.

## 1. Pomiary — stan wyjściowy

`renderer.info` samej sceny po ≥120 klatkach (Playwright, SwiftShader, `FULL=1` — governor lobby nie spada do `-low`). Skrypt: `measure.mjs` z etapu A (scratchpad). FPS nie mierzony (software GL).

| Ujęcie | Desktop calls / trójkąty | Mobile calls / trójkąty |
|---|---|---|
| lobby — przyjazd (`signage`, kadr Lobby.A/B) | 52 / 8 711 | 57 / 8 657 |
| lobby — recepcja (`bench`) | 60 / 6 383 | 60 / 6 037 |
| lobby — mural (`mural`) | 30 / 6 495 | 32 / 6 209 |
| korytarz (`corridor`) | 44 / 4 545 | 44 / 4 545 |
| kabina windy od lobby (`zone=hub&qa=elevator`) | 26 / 3 365 | 28 / 3 569 |
| kabina windy od pokoju (`qa=elevator`) | 35 / 6 558 | 20 / 6 565 |

Światła w lobby: desktop 5, mobile 4 (hemisphere, ambient, 3/2 area). Dla porównania Creator Room: 128–155 calli, do 225 tys. trójkątów — i właściciel potwierdził płynność na telefonie. **Lobby i winda mają duży zapas budżetu**; ograniczeniem jest fill-rate (przezroczyste plamy/poświaty) na telefonie, nie liczba obiektów.

## 2. Winda — diagnoza (`src/3d/world/elevators/ElevatorA.tsx`)

1. **Wszystko nieoświetlone, płaskie kolory.** Kabina, listwy i drzwi to `MeshBasicMaterial` (`#303840` ściany, `#bd976e` listwy, `#4b6667` drzwi). Brak jakiegokolwiek cieniowania — stąd wrażenie makiety.
2. **Rozmyta, rozciągnięta tekstura.** Jedna tekstura szumu 128×128 (`useTransitionSurface`, `repeat 3×2`) na jednostkowym boxie skalowanym do 5 m — UV nie zależą od rozmiaru, więc szum rozciąga się na metry („rozmyte tekstury ścian i podłogi”).
3. **Sufit to jeden kremowy prostokąt** (`planeGeometry 2.8×3.6`, `#f7d8b4`) — „płaski sufit bez detalu”.
4. **Drzwi turkusowe w beżowej ramie** — odstają od ceglanej ściany Creator Roomu i od Room.B (szczotkowany brąz, ciemna rama, LED).
5. **Fioletowe pasy przy drzwiach w pokoju** — `PortalEffect` w ścianie frontowej jest wyłączony (zakomentowany); fiolet na zrzucie z 19.10 to światło palety LED pokoju na ościeżach muru. Nie wymaga poprawki.
6. Panel z napisem (canvas 1024×448, anisotropy 4) jest ostry; problemem jest otoczenie, nie tekst.

Kabina pojawia się w dwóch strefach o różnym świetle (lobby jasne, pokój ciemny), więc nieoświetlone materiały z „wypieczonym” cieniowaniem są dobrym założeniem (stabilny wygląd, brak nowych świateł) — zawodzi wykonanie, nie podejście.

## 3. Lobby — różnice względem Lobby.B (od największego wpływu)

| # | Lobby.B | Dziś | Uwagi |
|---|---|---|---|
| 1 | Ciepłe pasy światła przy suficie (cove) z poświatą na ścianach, krzywa linia LED w suficie | Równomiernie jasny krem ścian, kropkowane linie LED pod sufitem | Największa zmiana nastroju; samo światło/emisja, bez nowych świateł |
| 2 | Posadzka z dużych ciemnych płyt z połyskiem i odbiciami świateł | Matowa, wygląda jak szara wykładzina z kropkami | Atlas podłogi z `granite_tile` (licencja **unconfirmed**) — nie regenerujemy; nowa płyta proceduralna w kodzie |
| 3 | Recepcja „hero”: ciemna ściana z lamelami, duże podświetlone logo ThreeStyle, jasny blat (marmur) z LED | Drewniana nisza z 3 kafelkami, ciemna lada, logo na nadprożu | Logo z istniejącego brandingu właściciela |
| 4 | Dwie okrągłe wyspy lounge: zakrzywione sofy, okrągłe dywany z LED na krawędzi, stoliki ze świecami | Jedna sofa narożna (teal) w rogu | Proceduralnie (jak dziś) lub Blender z manifestem |
| 5 | Duże drzewka w czarnych donicach przy wyspach i ścianach | 2–3 kule liści na pniu | |
| 6 | Ekran z grafiką + ławka pod ekranem, osobny ekran wayfinding (MAIN STAGE / STUDIOS / LOUNGE …) | Ekran powitalny + tablica „KIERUNKI” przy korytarzu | Jest odpowiednik; do ewentualnego dopracowania |
| 7 | Akcent fioletowo-śliwkowy (tapicerka, dywany, grafika ekranu, korytarz) | Teal + bursztyn | **Decyzja właściciela** (pytanie 1) |
| 8 | Kilka postaci (ludzie przy ladzie, na sofach) | Jedna postać lobby | **Decyzja właściciela** (pytanie 2) |

## 4. Rozmyte napisy na telefonie

- Tablica powitalna ma własną teksturę (`welcome.webp` 2048×1024 desktop / 1536×768 mobile) — rozdzielczość wystarczająca.
- Pozostałe tablice (kierunki, drzwi pokojów) dzielą atlas `signage.webp` 2×5: na telefonie kafel ma **512×256 px**.
- Render na telefonie startuje z DPR 1 i podnosi do 1,25 w ruchu / 1,5 w spoczynku, gdy klatka < 20 ms (oba governory: pokój i lobby). Przy ekranie DPR 3 tekst zawsze będzie miękki — to świadomy koszt płynności.
- Napisy są generowane w kodzie (`scripts/build-lobby-signage.mjs`, SVG → webp), więc **można je bezpiecznie przegenerować** w wyższej rozdzielczości lub grubszym krojem.

## 5. Zasady na etap C (z etapów A/B)

- Liczby wydajności tylko zmierzone (`renderer.info` przed/po); VRAM zawsze jako oznaczony estimate.
- Bez nowych prawdziwych świateł; emisja, tekstury proceduralne, przezroczystość tylko tam, gdzie mierzalnie tanio (fill-rate na telefonie).
- Atlas lobby (`albedo/normal/orm.webp`) i tekstury źródłowe granite/oak — licencja **unconfirmed**: nie regenerować; nowe powierzchnie proceduralnie w kodzie.
- Modele z Blendera (lada, sofy, drzewka) tylko z manifestem licencji i `check-gltf.mjs`.
- Każdy podetap: testy, tsc, eslint, build, pomiar przed/po, zrzut z tego samego kadru, push po zgodzie, ocena na telefonie.

## 6. Plan etapu C (do zatwierdzenia)

Koszty to **estimate z kodu** — zostaną zmierzone przy każdym podetapie.

**C1. Winda — drzwi i kabina** (największy „dramat”)
- Drzwi jak w Room.B: szczotkowany szampański brąz (tekstura proceduralna, UV w metrach), ciemna rama z ciepłą obwódką LED, ciemne nadproże ze wskaźnikiem, panel przywołania obok drzwi (od strony pokoju i lobby).
- Kabina: ściany z paneli w ciemnym brązie z pionowymi fugami i wypieczonym cieniem w narożnikach, listwy LED przy suficie i podłodze, sufit z downlightami zamiast kremowego prostokąta, kamienna posadzka, poręcz. Panel z napisem zostaje.
- Estimate: +3–6 draw calli, 2–3 tekstury proceduralne 256–512 px (VRAM ≈ 0,5–1,5 MB, estimate).

**C2. Lobby — światło i posadzka** (największa zmiana nastroju)
- Pasy cove przy suficie z ciepłą poświatą na górze ścian, ściany ciemniejsze u dołu (gradient zamiast równego kremu), krzywa linia LED w suficie.
- Posadzka: duże ciemne płyty (proceduralnie) z połyskiem; „odbicia” świateł jako tanie plamy pod źródłami (bez SSR/odbić w czasie rzeczywistym).
- Estimate: +2–5 draw calli; główny koszt to fill-rate poświat — tierowane jak dziś (`-low` bez nich).

**C3. Lobby — recepcja „hero”**
- Ciemna ściana z lamelami za ladą, duże podświetlone logo ThreeStyle, jasny blat (marmur proceduralny), LED pod ladą.
- Estimate: +3–5 draw calli.

**C4. Lobby — wyspy lounge i zieleń**
- Dwie okrągłe wyspy: zakrzywione sofy, okrągłe dywany z LED na krawędzi, stoliki ze świecami; większe drzewka w czarnych donicach; kolizje mebli jak dziś.
- Estimate: +4–8 draw calli, +10–20 tys. trójkątów.

**C5. Napisy i ekrany**
- Przegenerowanie atlasu napisów w wyższej rozdzielczości na telefonie (lub osobne tekstury dla najważniejszych tablic), grubszy krój; ewentualnie ekran wayfinding w stylu Lobby.B.
- Estimate: VRAM +1–3 MB (estimate), 0–2 draw calle.

Proponowana kolejność: C1 → C2 → C3 → C4 → C5 (C1 i C2 dają najwięcej na telefonie przy najmniejszym ryzyku).

## 7. Decyzje właściciela (2026-10-19)

1. Paleta: **teal + bursztyn** — z Lobby.B bierzemy układ i nastrój światła, kolory zostają nasze.
2. Postacie: **zostaje jedna** postać.
3. Meble: **proceduralnie w kodzie**.
4. Start: **C1 — winda**.

## 8. Pytania (zadane właścicielowi)

1. **Paleta akcentów:** fiolet/śliwka jak w Lobby.B czy zostajemy przy teal + bursztyn (spójne z muralem 3S i Creator Roomem)?
2. **Postacie w lobby:** dodać kilka sylwetek (ludzie przy ladzie, na sofach) czy zostać przy jednej postaci?
3. **Meble:** proceduralnie w kodzie (jak dziś, od razu) czy etap Blender (lada, sofy, drzewka) — wymaga manifestu licencji i budżetu GLB?
4. **Kolejność:** czy zaczynamy od C1 (winda)?
