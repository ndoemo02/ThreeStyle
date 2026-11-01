# Przekazanie do sesji w chmurze — Creator Room, etap B (2026-10-18, jeden dzień)

Dla sesji Claude Code w chmurze. Właściciel wraca jutro do sesji lokalnej (`/resume`), która przejrzy tę pracę, zrobi wizualne QA i pomiary, i scali. Rozmawiaj z właścicielem po polsku, z pełnymi polskimi znakami.

## Gałąź — najważniejsze

- Start: `codex/entry-lobby-transition` (HEAD `adb9016` lub nowszy z tym plikiem).
- Pracuj na nowej gałęzi **`claude/creator-stage-b`** utworzonej z niej. Pushuj tylko tam. Nie merguj, nie rób force-push, nie ruszaj `codex/entry-lobby-transition` ani `main`.
- Jeden commit na podetap (lista niżej), stage tylko jawnie wymienionych ścieżek (bez `git add -A` / `git add .`), bez `git stash` / `reset` / `clean`; wycofanie tylko przez `git revert <sha>`.
- Zakończenia commitów: linie `Co-Authored-By` / `Claude-Session` zgodnie z ustawieniami sesji.
- Bez deployów (Vercel) — właściciel uruchamia je sam.

## Stan wyjściowy (potwierdzony)

- Etap A zrobiony: `f68cc3b` (światło: akcenty LED w shaderach, „Kolory do muzyki”, reflektor w kabinie) i `adb9016` (podłoga, sufit, dekoracje, kolizje). Opis i pomiary: `docs/creator-room-stage-a-2026-10-17.md`.
- **Właściciel przetestował podgląd na telefonie: płynnie, nic nie tnie, także z Luckym.** 60 fps na telefonie to twardy próg — nic z etapu B nie może go ruszyć.
- Lucky (gospodarz w kabinie): `docs/lucky-checkpoint-2026-10-17.md`. Licencje: `docs/lucky-licensing-2026-10-17.md`.

## Czego chmura NIE ma (i co z tego wynika)

- Pliku modelu Lucky'ego (`public/models/lucky/` jest w `.gitignore`). Bez niego kabina po 404 wczytuje zastępczą twarz (`AudioReactiveFace`) — to normalne. Testy assetu w `tests/lucky.test.ts` same się pomijają.
- Referencji `assets/Review/`, skryptów QA i pomiarów z `output/` (ignorowane), serwera dev i przeglądarki testowej właściciela.
- Dlatego: **nie podawaj liczb wydajności** (draw calls, FPS, VRAM) jako zmierzonych. Możesz napisać „estimate z kodu: +N draw calli”, wyraźnie oznaczone. Pomiar `renderer.info` zrobi sesja lokalna.
- Nie generuj, nie pobieraj i nie podmieniaj assetów 3D/tekstur (zasada: bez manifestu pochodzenia nie ma assetu). Wszystko proceduralne w kodzie, jak w etapie A.

## Co robić w chmurze, a co zostawić lokalnie

Chmura (logika + testy, bez potrzeby oglądania): podetapy B1–B5 niżej.
Lokalnie jutro (wymaga przeglądarki, modelu lub pomiaru): wygląd VU i ON AIR na zrzutach, reakcja Lucky'ego na żywo, pomiary `renderer.info`, test na telefonie, deploy podglądu.

## Zakres etapu B — sesja z muzyką (bez mikrofonu i nagrywania)

Kolejność według wartości. Jeśli dzień się skończy, lepiej mniej podetapów, ale domkniętych z testami.

**B1. Jeden wspólny detektor rytmu (commit 1)**
- Dziś są dwa: oświetlenie (`src/lib/creatorLighting.ts`: `kickLevelFromDecibels`, `stepLedRhythm` — dB bez obcinania, beat = narastanie ≥ `LED_BEAT_RISE` ponad dołek, twardy limit `LED_MIN_BEAT_INTERVAL` = 0,5 s) i twarz (`src/lib/creatorFace.ts` `directFace`: bajty `getByteFrequencyData`, beat = `kick − bassAverage > 0.06`). Detektor twarzy ma ten sam błąd, który naprawiono w świetle: przy głośnym basie bajty są nasycone i beat znika (maskuje to wymuszona zmiana miny co 1,3 s). Szczegóły: sekcja „Poprawka detekcji beatu” w `docs/creator-room-stage-a-2026-10-17.md`.
- Cel: twarz i Lucky (`src/3d/modules/fx/AudioReactiveFace.tsx`, `src/3d/world/rooms/LuckyHost.tsx`) korzystają z beatu z jednego odczytu na klatkę (dostawca w `src/3d/world/rooms/CreatorLighting.tsx` już czyta widmo raz, 30 Hz, w dB). Zachowaj zachowanie min (testy `tests/creatorFace.test.ts` muszą przejść; dopisz test głośnego mastera jak w `tests/creatorLighting.test.ts`).
- Uwaga: przełącznik „Reaguj na muzykę” wyłącza dziś odczyt w dostawcy — miny gospodarza mają działać niezależnie od niego.

**B2. Automat stanów sesji (commit 2)**
- `src/lib/creatorSession.ts`: `idle → ready → live → paused → ended`, czysta funkcja przejść + testy (`tests/creatorSession.test.ts`). Wejścia: `playbackStatus` z `useHudStore` (`'idle' | 'loading' | 'playing' | 'paused' | 'error'`, typ w `src/lib/creatorMedia.ts`), obecność w Creator Roomie.
- Uwaga: `<audio>` i `<video>` w `src/components/HudOverlay.tsx` mają `loop`, więc dziś utwór nigdy się nie kończy. Stan `ended` zostaw w automacie, ale nie zmieniaj zapętlania bez decyzji właściciela (zapisz to jako pytanie w raporcie).

**B3. ON AIR i światło kabiny (commit 3)**
- Napis ON AIR: `src/3d/world/rooms/VocalBooth.tsx` (komentarz „ON AIR neon strip”, `meshBasicMaterial #cc0000`). Stany: zgaszony (idle), przygaszony (ready/paused), świeci i pulsuje na beat w `live`, z tym samym limitem 2/s; przy ograniczonym ruchu świeci równo bez pulsu.
- Kabina jaśniejsza w `live`: kanał `booth` w `creatorLightingLevels` (`src/lib/creatorLighting.ts`) — mnożnik, test.
- Zasady światła z etapu A: **żadnych nowych prawdziwych świateł**, nie montuj i nie odmontowuj świateł w trakcie działania (rekompilacja shaderów = zacięcie); zmieniaj tylko kolor i intensywność. Uderzenia światła zawsze przez limit 2/s.

**B4. Wskaźnik VU na ramie szyby (commit 4)**
- ~16 słupków jako jeden `InstancedMesh` (jeden draw call), macierze aktualizowane z tego samego odczytu widma (30 Hz), nie z nowego `getByteFrequencyData`.
- Rama szyby kabiny: w `src/3d/world/rooms/CreatorRoomMVP.tsx` grupa z `boothControls` (`posX -6.7, posY 2.2, posZ -2.5, width 4.4, height 1.4`), ramy `TechnicalTrim`. Słupki na dolnej ramie od strony pokoju, nie zasłaniają twarzy gospodarza (twarz na ~2,05 m — szyba ma pozostać czysta; wcześniej właściciel odrzucił „mglistą szybę”).
- Bez muzyki słupki opadają do zera; w pauzie stoją nisko.

**B5. Interakcje i ujęcia (commit 5, jeśli starczy czasu)**
- Klik/tap w szybę lub mikrofon → kamera płynnie na kabinę; tap w ON AIR → odtwarzanie/pauza. Wzorzec: `useSceneInteraction` (jak tablet i plakietka w `CreatorRoomMVP.tsx`), podpowiedzi po polsku.
- Ujęcia w HUD: Biurko / Kabina / Sofa — sprawdź `src/3d/navigation/navigationConfig.ts` (`CameraPreset`) i kolizje `src/3d/navigation/creatorRoomCollision.ts` (kamera nie może stanąć w meblu).
- Lucky kiwa i uśmiecha się przy przejściu do `paused`/`ended` — logika w `src/lib/lucky.ts` (`luckyBodyPose`) z testem; wygląd sprawdzi sesja lokalna.

## Weryfikacja przed każdym commitem

```
node --experimental-strip-types --test tests/*.test.ts
node --test tests/*.test.mjs
npx tsc --noEmit
npx eslint <zmienione pliki>
npm run build
```
Lokalnie build wymaga `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` (fonty Google przez TLS systemu); w chmurze spróbuj najpierw bez, a przy błędzie fontów z tą zmienną. Stan na start: 98/98 TS + 13/13 MJS, TypeScript, ESLint i build PASS.

Uwaga: to Next.js 16 z nowymi konwencjami — przed kodem związanym z Next czytaj `node_modules/next/dist/docs/`. Kod 3D to R3F + three 0.183, stany w Zustand.

## Na koniec dnia

1. Raport `docs/creator-stage-b-cloud-2026-10-18.md`: co zrobione (commit SHA), czego nie zweryfikowano (wszystko wizualne i wydajnościowe), estimate draw calli z kodu (oznaczony jako estimate), otwarte pytania do właściciela (np. zapętlanie utworu).
2. Commit raportu i push `claude/creator-stage-b`.
3. Krótko po polsku: link do gałęzi, lista commitów, co sprawdzić jutro lokalnie.
