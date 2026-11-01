# Creator Room — etap A: wygląd wg Room.B (2026-10-17)

Branch `codex/entry-lobby-transition`. Referencja: `assets/Review/CreatorRoom/Room.B.png` (lokalnie, untracked). Dwa commity: światło (`f68cc3b`) i reszta etapu A.

## Co się zmieniło

**Światło (commit `f68cc3b`)**
- LED pod sofą i szafką RTV, świecąca obwódka ramy windy (po stronie pokoju; sama winda jest wspólna z lobby i nietknięta), smuga światła spod sufitu po cegle.
- Światło tych akcentów liczą shadery cegły i podłogi (albedo × kolor LED × spadek), więc widać fakturę i nie ma przezroczystych warstw. Pierwsza wersja z płaszczyznami addytywnymi wyglądała w Nocy jak płaskie płachty — odrzucona.
- „Kolory do muzyki” (panel Światło): listwa pod sufitem przechodzi przez paletę na beat, z gradientem wzdłuż ścian; akcenty biorą kolor listwy nad ceglaną ścianą. Domyślnie włączone w Nocy.
- Jeden odczyt basu na klatkę; uderzenia światła i zmiany koloru twardo ograniczone do 2/s (poniżej progu 3 błysków/s). Ograniczony ruch: bez błysków, tylko powolny dryf.
- Kabina: reflektor nad gospodarzem zamiast światła punktowego (liczba świateł bez zmian); kabina zostaje w wybranym kolorze.

**Podłoga, sufit, meble (ten commit)**
- Proceduralna ciemna posadzka z łupka (płyty 1 m, ton per płyta, fugi z antyaliasingiem) i bordowy dywan (chmurkowy wzór, runo, ciemniejsza bordiura) — w shaderze, bez tekstur. Zastępują teksturę „diamond” (licencja niepotwierdzona; pliki zostają w `public/`, nieużywane przez pokój).
- Plamy światła z 6 downlightów rysuje shader podłogi i dywanu (kanał „Jasność pokoju”; w Nocy gasną).
- Sufit: ciemna płyta, orzechowe lamele z ramą (jedna siatka) odsunięte od LED-ów, downlighty jako świecące krążki (instancje).
- Sofa: ciemna skóra na orzechowej podstawie (przebarwienie klonów materiałów w kodzie; `sofa.glb` bez zmian — licencja niepotwierdzona).
- Dekoracje z prostych brył, bez zewnętrznych assetów: 6 poduszek (2 czerwone), pufa, lampa z kopułą i światłem na blacie i ścianie, roślina na szafce i duża przy sofie (liście rysowane w kodzie), książki, dwa autorskie abstrakcyjne obrazy (rysowane w kodzie) z lampkami.
- Kolizje mebli (biurko, zwrot biurka, krzesło, sofa, szafka, pufa, roślina) — ten sam mechanizm co w lobby (`constrainHubMovement` z listą przeszkód); obrysy z mapy zajętości promieniami w przeglądarce.

## Pomiar

`renderer.info` samej sceny po 120 klatkach, SwiftShader, po ustabilizowaniu się ładowania (`output/creator-a-qa/room.mjs`). Ujęcia: `qa=room` (w stronę windy, jak Room.A/B) i `qa=room-back` (w stronę biurka).

| | przed | po |
|---|---|---|
| światła | 9 | 9 |
| draw calls `room` desktop / mobile | 53 / 37 | 62 / 46 |
| draw calls `room-back` desktop / mobile | 175 / 154 | 186 / 164 |
| trójkąty `room` | 30,4 tys. | 36,8 tys. |
| tekstury (pamięć) `room` desktop / mobile | 68 / 54 ¹ | 61 / 47 |

¹ Po commicie świetlnym (`f68cc3b`, +1 mała tekstura palety), zmierzone tą samą metodą z czekaniem na koniec ładowania. Pomiar sprzed etapu (67 / 53) był robiony bez tego czekania, więc liczby tekstur z niego nie są porównywalne; draw calle i trójkąty są (zależą od tego, co widać, nie od postępu ładowania).

Programy shaderów różnią się między przebiegami (kolejność ładowania), więc nie są porównywane. Przyrost draw calli (+9) to małe siatki zbiorcze: podłoga i dywan, sufit (płyta, lamele, downlighty), dekoracje (bryły, liście, świecące elementy, obrazy, światło lampy), listwy LED akcentów. SwiftShader nie mierzy FPS urządzenia — płynność ocenia właściciel na telefonie.

Uwaga na przyszłość: widok w stronę biurka kosztuje ~4× więcej draw calli niż reszta pokoju (meble przy biurku) — to pierwszy kandydat do odchudzenia, jeśli telefon przytnie.

## Poprawka detekcji beatu (po `f68cc3b`)

Test w przeglądarce na zapętlonym WAV 120 BPM pokazał, że po ~4 s kolory przestawały się zmieniać. Przyczyna: analizator podaje bajty obcięte przy −30 dB, a głośny bas siedzi w nasyceniu (0,8–1,0), więc warunek „stopa ponad średnią” gasł, gdy średnia dogoniła poziom. Test jednostkowy podawał ostre uderzenia i tego nie łapał. Teraz oświetlenie w tym samym jedynym odczycie bierze dB bez obcinania (`getFloatFrequencyData`), a beat to narastanie o ≥3,5 dB ponad dołek. Offline (ten sam WAV, FFT 512, Blackman, wygładzanie 0,8, odczyt 30 Hz): 21 z 24 uderzeń w 12 s; limit 2/s bez zmian. W przeglądarce (SwiftShader, ~12 klatek/s) kolory zmieniają się przez cały utwór i stoją w pauzie. Twarz/Lucky mają osobny, starszy detektor na bajtach (maskowany wymuszoną zmianą miny co 1,3 s) — do ujednolicenia w etapie B (wspólny odczyt audio).

## Weryfikacja

- Testy Node: 98/98 TS + 13/13 MJS. Nowe: wykrywanie stopy w głośnym masterze (bas ponad progiem bajtów) i brak fałszywych uderzeń przy równym basie, limit błysków przy 90–240 BPM i podwójnej stopie, ograniczony ruch, płynne przejścia, paleta, preferencja `ledCycle`; kolizje (przejście od windy, tablet i plakietka w zasięgu 3 m, miejsce przed biurkiem, okno kabiny, brak przenikania, wyjście z wnętrza mebla, przejście przy windzie wolne).
- TypeScript i ESLint zmienionych plików PASS.
- Zrzuty (`output/creator-a-qa/`): Ciepło i Noc, desktop i mobile, oba ujęcia, ściany z obrazami, Lucky w kabinie (`qa=lucky`, `qa=lucky-close`) — zero błędów strony.

## Nie ruszone

- Drzwi windy (płaskie, zielonkawe; Room.B ma szczotkowaną stal) — winda jest wspólna z lobby.
- Tylna ściana z ekranem i logo, biurko.
