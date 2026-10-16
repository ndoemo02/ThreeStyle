# ThreeStyle — Lobby Polish (Premium lightweight), 2026-10-16

Branch `codex/entry-lobby-transition`, baza `9505eed`. Zmiany lokalne, bez commitu/pusha. Referencje: `assets/Review/Lobby/Lobby.A.jpg` (stan wyjściowy), `Lobby.B.png` (kierunek nastroju — nie kopiowany 1:1).

## Zakres

Bez zmian geometrii świata, przejść, drzwi, korytarza, windy, Event Roomu i Creator Roomu. Zmieniono wyłącznie wyposażenie, światło i materiały lobby oraz dodano kolizje mebli w hubie (za zgodą właściciela).

- **Światło:** hemisphere 0.85/0.95 → 0.42/0.5, ambient 0.24/0.3 → 0.08/0.12, cieplejsze area lights (`#ffd6a8`). Liczba świateł bez zmian (test `lightCount`).
- **Materiały (tylko parametry, atlas bez regeneracji):** ciemniejsza, półpołyskowa podłoga (`roughness` 0.52 × ORM), neutralniejszy tynk, ciemniejsze drewno lameli. Nowe materiały bez tekstur: `counter`, `fabric` (ciemny teal), `rug`, `pool` (addytywny), `softShadow`.
- **Recepcja / community desk** w istniejącej niszy: lada z zaokrąglonymi końcami, front z drewna, mosiężna listwa, LED u dołu, podświetlone logo ThreeStyle na nadprożu. Kafle rhythm/voice/mark zostały jako tło. **BLENDER CANDIDATE** (docelowa lada hero).
- **Lounge** w tylnym prawym narożniku: sofa narożna (RoundedBox), stolik ze świecą, dywan, lampa stojąca. Ławka z niszy usunięta. **BLENDER CANDIDATE** (sofa).
- **Akcenty:** 19 downlightów między baflami (w istniejącym batchu LED — 0 draw calli), glow pod ekranem i przy lamelach, plamy światła na podłodze (desktop 5, mobile 3, `-low` 0), miękkie cienie kontaktowe. Donice okrągłe, liście w 3 kępach. **BLENDER CANDIDATE** (rośliny).
- **Wayfinding:** directory przy wejściu do korytarza (pokoje twórców, winda, Event Room, recepcja). Atlas `wayfinding.webp` generowany proceduralnie: `node scripts/build-lobby-wayfinding.mjs` (SVG + istniejące logo właściciela `textures/branding/logo3s.jpeg`).
- **Kolizje:** `src/3d/navigation/hubCollision.ts`, ślizganie po osiach jak w Event Roomie, ruch dzielony na podkroki ≤ 0,25 m (długa klatka nie przeskakuje lady — błąd wykryty w teście w aplikacji i naprawiony). Donice celowo bez kolizji (liczba zależy od tieru). Brak clampu ścian — zachowanie poza meblami bez zmian.

## Pomiary (Playwright, SwiftShader, `renderer.info` samej sceny po ≥120 klatkach)

Skrypt: `output/lobby-polish-qa.mjs <label> <port> <viewports> [full]`. SwiftShader wymusza tier `-low`; tryb `full` blokuje governor przez `document.hidden`. FPS nie jest mierzony (software GL); fizyczny telefon do oceny przez właściciela.

| Tier `-low`, ujęcie | draw calls przed → po | trójkąty przed → po |
|---|---|---|
| desktop arrival | 40 → 50 | 4 275 → 8 361 |
| desktop lounge | 22 → 30 | 2 181 → 6 239 |
| mobile arrival | 47 → 47 | 4 425 → 7 845 |
| mobile reception | 56 → 57 | 4 587 → 5 677 |
| mobile lounge | 17 → 23 | 1 861 → 5 537 |
| portrait arrival | 15 → 18 | 1 847 → 2 851 |
| korytarz (wszystkie) | 44 → 44 | 4 261 → 4 545 |

Pełny tier po zmianach: desktop 30–59 calls, 4.5–8.7 tys. trójkątów; mobile 30–60 calls. Bazowego pomiaru pełnego tieru nie ma (przerwał go przeładowanie HMR), więc porównanie przed/po dotyczy tylko tieru `-low`; tam liczba programów shaderów się nie zmieniła (desktop-low 25–29 → 26–29, mobile-low 16–17 → 15–17).

Nowe tekstury: zmierzony licznik obiektów tekstur +2 (mobile, ten sam widok: 22 → 24) — wayfinding ładowany przez `useLoader`, bez podwójnego uploadu źródła. VRAM (RGBA8 z mipmapami, **estimate**): `wayfinding.webp` desktop 1024² ≈ 5.6 MB, mobile 512² ≈ 1.4 MB; proceduralna radialna 64² ≈ 22 KB. Pliki: 39 KB / 20 KB.

## Weryfikacja

- Testy Node 91/91 PASS (`tests/*.test.ts` + `tests/*.test.mjs`), w tym nowe `tests/lobbyFurniture.test.ts`: pasy ruchu, linia wzroku intro→ekran, pokrycie bryła/collider, ślizganie, brak tunelowania, downlighty w szczelinach baffli, budżet tierów, atlas.
- Kolizja w aplikacji (`output/lobby-collision-qa.mjs`, rzeczywista ścieżka joysticka `BaseNavigationControls`, mobile 844×390): marsz na ladę zatrzymuje się na x = −8,17; trasa do korytarza otwarta. PASS.
- Intro landing → lobby (`output/entry-qa.mjs`, desktop/mobile/reduced motion): PASS, kamera końcowa [4, 2.05, 6.2]. Poprzednie artefakty zachowane w `output/entry-qa-before-lobby-polish/`.
- `tsc --noEmit` PASS; ESLint zmienionych plików PASS (2 błędy w nieużywanym, niezmienionym `GalaxyCeilingMaterial.tsx` — sprzed tej pracy).
- `npm run build` PASS z `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1` (bez niej lokalnie pada pobieranie fontów Google — problem środowiska).
- Zrzuty: `output/lobby-polish/{baseline,s3-full,s3-low}/`. Jednorazowo wystąpiło 15× `Failed to fetch` na mobile przy pracującym serwerze dev; nie odtworzyło się w powtórce (jedynie przerwane `day-cycle.mp4` media decka). W trakcie pracy zewnętrzny serwer dev na porcie 3010 zakończył działanie; dalsze testy na nowo uruchomionym `next dev -p 3010`.

## Do zrobienia / decyzje

1. Ocena na fizycznym telefonie (portrait/landscape), szczególnie plamy światła i glow (fill-rate).
2. Ewentualny etap Blender dla lady, sofy i roślin — wymaga manifestu licencji, budżetu GLB i `check-gltf.mjs`.
