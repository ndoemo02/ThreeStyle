# Lobby / korytarz — checkpoint 2026-10-04

## Stan

Root: `C:\ThreeStyle.ai`. Branch: `feat/event-room-arena`.
Baza: `94c72f8cfa2a8413939122354189306b3e3199e0`.
Walidację pakietu zakończono lokalnie przed commitem i wdrożeniem. SHA i adres opublikowanej wersji podaje podsumowanie wydania.
Podgląd produkcyjny: http://127.0.0.1:3005/b3p (startuje w Creator Roomie; do lobby prowadzi winda).

## Zmiany

- Spokojniejszy tynk, grafitowe drzwi/sufit i drewno; podłoga zachowuje stałą skalę kafli zamiast rozciągać atlas na cały pokój.
- Tablica ThreeStyle, kierunkowskaz, oznaczenia sześciu pokoi, windy i wejścia Event Room. Statyczny atlas WebP w dwóch rozdzielczościach zastępuje osobną etykietę HTML Event Room.
- Delikatna poświata istniejących listew LED przez wspólną teksturę gradientu. Bez dodatkowych dynamicznych świateł, cieni ani Bloom.
- Jeden obszar światła w niskim profilu nadal obejmuje lobby i korytarz. Liczby świateł w profilach pozostają takie jak wcześniej.
- Pomiar wydajności pomija początkowe sześć sekund i przerwy związane z ukryciem karty. Dopiero utrzymujący się spadek uruchamia istniejący niski profil.
- Canvas zachowuje wybrany DPR po obrocie telefonu. Rozdzielczość kompozytora i SMAA odpowiada rzeczywistemu rozmiarowi canvasa w lobby.
- Creator Room zapamiętuje nastrój, parametry światła i głośność w localStorage. Dane są walidowane; uszkodzony zapis i niedostępny storage nie blokują działania. Pliki, autoplay i uprawnienia kamery nie są zapisywane.
- Dekoracyjne tablice i ramy nie przechwytują raycastów interakcji z drzwiami.

Arena, Stage 7, upper lounge, collidery, kotwice drzwi/windy i logika nawigacji nie zostały zmienione.
Wcześniejsze usunięcia i zamiany obrazów referencyjnych oraz testowe GLB pozostawiono bez ingerencji.

## Walidacja

| Sprawdzenie | Wynik |
| --- | --- |
| Testy lobby, geometrii, assetów, widoczności, preferencji, światła, mediów i interakcji | 40/40 PASS |
| TypeScript całego projektu | PASS |
| ESLint zmienionych plików | PASS, 0 ostrzeżeń |
| Końcowy produkcyjny build Next.js | PASS |
| Desktop: zgodność canvas / composer podczas zmian DPR | PASS |
| Produkcja, mobile-low: obrót poziomo → pionowo → poziomo | PASS; DPR 0,75 przez cały test |
| Produkcja, mobile-low: canvas / composer / oba bufory SMAA | 633×292 → 292×633 → 633×292; zgodne |
| Produkcja, mobile-low | 1 RectAreaLight, 0 aktywnych normalMap, GL error 0 |
| Drzwi Room 2: patrzenie na tablicę i E | PASS po usunięciu przechwytywania raycastu przez dekoracje |
| Winda | Przycisk do studia i powrót E do lobby przeszły test z diagnostycznym ustawieniem kamery |
| HUD: zmiana światła/głośności, reload, reset, uszkodzony zapis | PASS; odtworzona głośność trafia do elementu audio, media pozostają zatrzymane |

Test windy nie potwierdza pełnego przejścia pieszo ani obsługi dotykiem. Przy diagnostycznym ustawieniu kamery i zmianie viewportu przycisk powrotny znalazł się poza widocznym obszarem; powrót sprawdzono klawiszem E. Fizyczny telefon, pełna trasa dotykowa i odbiór wizualny pozostają do akceptacji właściciela.
Emulacja przeglądarki nie stanowi pomiaru FPS telefonu.

## Koszt wizualnego odświeżenia

Porównanie z bazą, dla atlasów pobieranych przez lobby:

| Wariant | Poprzednie trzy mapy | Nowe trzy mapy + tablice | Różnica |
| --- | ---: | ---: | ---: |
| Mobile | 113 346 B | 135 214 B | +21 868 B |
| Desktop | 646 166 B | 573 608 B | −72 558 B |

Nowy atlas tablic zajmuje szacunkowo dodatkowe 6,67 MiB GPU na mobile / 26,67 MiB desktop (RGBA z mipmapami). To oszacowanie, nie pomiar pamięci sterownika.
Przy tej samej kamerze i viewportcie bazowy przebieg 3D wzrósł z 25 do 33 draw calls w lobby oraz z 18 do 22 w korytarzu. Odpowiednio 3388 → 4328 i 2072 → 2420 trójkątów. Pomiary wykluczają przebiegi postprocessingu; widoczność wpływa na wartości.
Nie deklarujemy wzrostu FPS na telefonie. Poprawki ograniczają niepotrzebne obciążenie i błędne przełączanie jakości; dekoracje mają mały, ale rzeczywisty koszt.

## Podglądy

- `output/lobby-refresh-2026-10-04-production-lobby.png`
- `output/lobby-refresh-2026-10-04-production-corridor.png`
- `output/lobby-refresh-2026-10-04-production-mobile-low.png`

Zrzuty pochodzą z końcowego builda produkcyjnego. Kamerę ustawiono diagnostycznie do oceny materiałów i tablic. Mobile-low celowo pokazuje profil awaryjny DPR 0,75, nie domyślną jakość wszystkich telefonów.

## Odtworzenie / następny checkpoint

Atlasy: `npm run assets:lobby`.
Testy: `node --experimental-strip-types --test tests/lobbyConfig.test.ts tests/lobbyGeometry.test.ts tests/lobbyAssets.test.ts tests/lobbyVisibility.test.ts tests/lobbyRefresh.test.ts tests/creatorPreferences.test.ts tests/creatorLighting.test.ts tests/creatorMedia.test.ts tests/sceneInteractions.test.ts`.
Podgląd gotowego builda: `node node_modules/next/dist/bin/next start -p 3005`.

Następny krok: ocena lobby/korytarza i przejścia windą na telefonie, potem commit i wdrożenie tego pakietu po poleceniu właściciela. Dopiero kolejny etap: ewentualne drobne korekty proporcji tablic, jasności i ergonomii HUD-u według tej oceny.
