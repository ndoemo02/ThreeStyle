# ADR-004: Event Room — owalna arena, wspólny geometry spec, kanałowy light rig

- **Status:** Zaakceptowany (decyzja architektoniczna; implementacja rozłożona
  na etapy 1–10 osobnego planu wykonawczego)
- **Data:** 2026-07-29
- **Kontekst planu nadrzędnego:** `Event Room — audyt decyzjo-kompletny i plan
  przebudowy (FINAL, rev. 3)`, sekcje 1–13

## Kontekst

Event Room (`/b3p?zone=event-room`) jest dziś prostopadłościenną salą
kinową: płaska podłoga 27×25.4, cztery płaskie ściany, płaski sufit z
równoległymi lamelami, dwa proste banki lounge i zakrzywiony ekran
„przyklejony” do tylnej ściany. Referencja jakości pokazuje owalną arenę z
radialnym sufitem, jednym pierścieniem neonu, dwoma koncentrycznymi łukami
ciągłych kanap i mocnym kontrastem światła.

Audyt architektury obecnego kodu ujawnił dwanaście defektów (D1–D12), z
których dwa mają charakter strukturalny, a nie kosmetyczny:

- **D4 — rozjazd geometria↔kolizja.** Footprinty kolizji
  (`eventRoomLayout.ts`) są dziś pisane ręcznie, obok geometrii renderowanej
  (`EventRoomLoungeBanks.tsx`), i już się rozjeżdżają (front lounge z=−2.46,
  footprint z=−3.05, collider z=−3.4). Przejście na elipsę **zwielokrotniłoby**
  ten błąd, jeśli nie zostanie usunięty klasowo.
- **Brak sterowalnego oświetlenia.** `EventRoomLighting.tsx` to statyczna
  tabela 4 skalarów na fazę show. Nie da się zgasić sali
  (`gl.toneMappingExposure = 1.55` ustawione globalnie w `page.tsx`), nie ma
  stanów `blackout`/`reveal`/`finale` niezależnych od fazy show, przejścia są
  skokowe, a ekran (`meshBasicMaterial`, `toneMapped={false}`) jest całkowicie
  odporny na wygaszanie.

Pełna lista D1–D12 wraz z dowodami (plik:linia) znajduje się w planie
nadrzędnym, sekcja 2.

## Decyzja

**Wariant B: nowy czysty moduł `eventRoomGeometrySpec.ts` jako jedno źródło
prawdy dla bryły i kolizji, plus osobne renderery czytające ten spec.**

Światło jest rozdzielone na dwie odpowiedzialności: `EventRoomLightRig.tsx`
(driver, `useFrame`, przejęcie ekspozycji) i `eventRoomLightStates.ts`
(czysta tabela 10 kanałów × 5 stanów). Materiały są partycjonowane **po
kanale światła**, nie po wyglądzie — jedna klamka `emissiveIntensity` steruje
setkami instancji bez re-renderu Reacta.

### Warianty rozważone i odrzucone

| | A — Refit in-place | **B — Spec + renderery (wybrany)** | C — Bake w Blenderze |
|---|---|---|---|
| Podejście | Rozbudowa istniejących plików | Nowy moduł-spec jako jedyne źródło prawdy dla bryły **i** kolizji | Bryła + sufit autorowane w Blenderze, lightmapa wypalona, 1 GLB |
| Ryzyko | Średnie — D4 skaluje się z elipsą | Niskie — D4 znika klasowo; spec testowalny bez WebGL | Wysokie — sprzeczne z zakazem ciężkich modeli, LFS/Vercel, ryzyko licencyjne |
| **Blokada** | — | — | **Lightmapa = jeden stan światła.** 5 stanów (`blackout`/`reveal`/`finale`/...) staje się niemożliwe do zrealizowania. |

**Wariant A odrzucony:** największy ukryty defekt (D4 — footprinty pisane
ręcznie obok generowanej geometrii) **skalowałby się z elipsą**, pogłębiając
rozjazd zamiast go usuwać.

**Wariant C odrzucony:** wymóg oświetleniowy (5 niezależnych stanów światła
z płynnymi przejściami) jest niemożliwy do spełnienia z jedną wypaloną
lightmapą. Dodatkowo `docs/blueprint project.md` zabrania ładowania ciężkich
modeli binarnych, a PMREM + 1–4 MB HDR środowiskowej mapy to zły kompromis
kosztowy.

**Świadomie odrzucone również:** atlas UV wzorem `hub/lobbyGeometry.ts` —
wymusza `ClampToEdge` i remap UV per geometria (utrata tilingu: floor repeat
5.2×, wood 1.1×3.2), przy zerowym zysku, ponieważ draw calle są zdominowane
przez liczbę siatek, nie liczbę materiałów.

## Ograniczenia i inwarianty (obowiązujące przez wszystkie etapy)

- `EVENT_ROOM_EYE_HEIGHT` i `constrainEventRoomMovement` pozostają
  **bit-identyczne** sygnaturowo — `eventRoomLayout.ts` staje się cienką
  warstwą re-eksportu nad `eventRoomGeometrySpec.ts`, nigdy odwrotnie.
  `BaseNavigationControls.tsx` (wspólny dla Hub, Creator Room i Event Roomu)
  pozostaje nietknięty.
- Footprinty są **wyliczane** z finalnej geometrii (assert: footprint
  zawiera każdy sampling geometrii + margines promienia kamery), nigdy
  wpisywane ręcznie jako stałe obok renderera.
- Zakaz `TorusGeometry` skalowanego niejednorodnie dla pierścieni (dawałby
  zmienny przekrój rurki wzdłuż elipsy) — wyłącznie `TubeGeometry` po
  analitycznej `ArenaEllipseCurve`, lub instancjonowane segmenty o stałym
  przekroju.

## Zakres architektoniczny — arena

- **Proporcja stylu:** ~70% układu luksusowej referencji (owalna arena,
  radialny sufit, jeden pierścień-bohater, dwa koncentryczne łuki ciągłych
  kanap) + ~30% motywu spodka (pionowe żebra ścian z magentowymi szczelinami
  neonu w wizualizacji koncepcyjnej).
- **Geometria proceduralna wyłącznie** — zero nowych assetów binarnych.
  Cała arena (powłoka, sufit, lounge, scena, runway, ekrany) generowana
  kodem; jedyne pliki tekstur to 10 istniejących webp na wariant, bez
  regeneracji (zablokowane do manifestu licencyjnego, patrz
  `docs/asset-licenses.md`).
- **Kanałowy light rig:** 10 kanałów (`house`, `screenKey`, `ceilingRing`,
  `ceilingAccents`, `sideWash`, `runway`, `loungeGlow`, `exitSafety`,
  `bloom`, `exposure`) × 5 stanów (`house`, `focus`, `blackout`, `reveal`,
  `finale`), z przejściami wykładniczymi o różnych stałych czasowych
  (0.10–0.60 s), sterowane jednym `useFrame` bez re-renderów Reacta.
- **Ciągłe kanapy o pojemności 32** — cztery ciągłe przebiegi (sweep po
  krzywej, bez segmentacji z zakładem), nie 32 indywidualne fotele.
  Pojemność (9 inner + 7 outer, mirror lewo/prawo) to zatwierdzone metadane,
  nie funkcja liczby segmentów geometrii.
- **Lounge pozostaje `blocked`** (niedostępny do chodzenia) w tym przejściu.
  Aktywacja jako walkable to osobny, przyszły etap ("Walkable Lounge").
- **Brak schodów i wielopoziomowej nawigacji** w tym przejściu — pola pod
  przyszłe schody są zarezerwowane w typach (`EventRoomSurfaceId`), ale bez
  geometrii, footprintów i wpisów w `getEventRoomSurfaces()`.
- **Scena: 3 płytkie koncentryczne poziomy** w niezmienionym footprincie
  (środek `(0, −7)`, `rx 5.46 × rz 2.34`, najwyższa powierzchnia
  `surfaceTopY = 0.46`) — dolny top ≈ Y=0.16, środkowy top Y=0.30 (połączony
  wysokościowo z runwayem), górny top Y=0.46. Rozkład rzędnych ponad te trzy
  twarde ograniczenia jest decyzją Etapu 6 tego planu, nie tego ADR.
- **Bez deploymentu.** Ten ADR i cały plan wykonawczy nie autoryzują żadnego
  wdrożenia na Vercel ani zmiany w CI/CD.

## Konsekwencje i trade-offy

**Zyski:**
- Cała klasa błędów typu D4 (rozjazd geometria↔kolizja) znika strukturalnie
  — footprinty nie mogą się rozjechać z geometrią, bo pochodzą z tego samego
  wywołania funkcji.
- Spec (`eventRoomGeometrySpec.ts`) jest testowalny bez WebGL (czyste funkcje
  matematyczne na elipsach/krzywych), co pozwala na testy jednostkowe
  krzywizny, długości łuku i zawierania footprintów bez uruchamiania
  renderera.
- Kanałowy light rig pozwala na blackout niemal pełny (D2 rozwiązany przez
  przejęcie `gl.toneMappingExposure` na mount i przywrócenie na unmount) i
  usuwa całą klasę przyszłych błędów typu "zmiana fazy show wymaga
  przepisania logiki oświetlenia".

**Koszty:**
- Jedna dodatkowa warstwa abstrakcji (`eventRoomGeometrySpec.ts` jako
  pośrednik między `eventRoomLayout.ts` a rendererami) — świadomie przyjęta.
- Dyscyplina wymagana: geometria musi być **zawsze** czytana ze spec, nigdy
  nie wyprowadzana ponownie lokalnie w komponencie renderującym.
- Migracja rozłożona na 10 etapów z osobną walidacją każdego (patrz plan
  nadrzędny, sekcje 10–11), co wydłuża czas do pełnego wdrożenia w zamian za
  rewertowalność każdego kroku pojedynczym `git revert`.

**Trigger rewizji:** jeśli arena zacznie wymagać autorowanego,
nieparametrycznego detalu (rzeźbiarski ornament, nieregularna fascia), warto
rozważyć wariant C wyłącznie dla samej powłoki wizualnej — ale nie dla
geometrii nośnej kolizji ani dla elementów wymagających sterowania
oświetleniem per-stan.

## Status implementacji (na dzień tego ADR)

Ten ADR dokumentuje **decyzję**, nie stan wdrożenia.

**Etap 0 (baseline + manifest assetów): ACCEPTED WITH LIMITATIONS**
(2026-07-29). Szczegółowa kronika pomiarów, metodologii i diagnostyki
(korekta sondy `renderer.info`, test na fizycznym Androidzie, próby
fixed-camera, blokada automatyzacji przeglądarki) pozostaje w
`output/stage0-baseline-notes.md` — nie jest powielana w tym ADR.

| Kombinacja | Wynik (calls / tris / geo / tex / prog) | Status |
|---|---|---|
| Hub desktop | 25 / 3228–3388 / 24 / 4 / 7–12 | zmierzone, reprodukowalne |
| Hub mobile (fizyczny Android, 406×804 DPR3) | 15 / 1487 / 12 / 10 / 9 | single-run baseline |
| Creator Room desktop | 300 / 522115 / 147 / 141 / 82 | **provisional** — brak fixed-camera confirmation z powodu blokady hosta |
| Creator Room mobile (fixed-camera) | 44 / 31827 / 43 / 52 / 31 / mesh 200 | reprodukowalny 2/2 fixed-camera |
| Event Room desktop | 69 / 35449 / 53 / 39 / 10 | reprodukowalny 2/2 |
| Event Room mobile | 91 / 32603 / 41 / 30 / 13 | reprodukowalny 2/2, potwierdza podwójny composer D1 |

### Bramka do dalszych etapów

- **Etap 1 może rozpocząć się teraz.**
- **Przed Etapem 2** należy: (a) potwierdzić fixed-camera Creator Room
  desktop, (b) wykonać drugi fixed-camera odczyt Hub mobile.
- Zatrzymywanie się mobile camera-look przy działającym joysticku
  pozostaje osobnym, nienaprawianym problemem — poza zakresem Etapu 0.

Etapy 1–10 (spec geometrii, mechanizm i strojenie światła, powłoka, sufit,
lounge, scena/runway/ekran, footprinty, governor/budżet, weryfikacja
końcowa) pozostają do wykonania w osobnych, zatwierdzanych krok po kroku
sesjach, zgodnie z planem nadrzędnym.

Etapy 1–10 (spec
