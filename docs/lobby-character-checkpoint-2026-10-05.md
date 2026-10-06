# Lobby — charakter, checkpoint lokalny

Root `C:\ThreeStyle.ai`, branch `feat/event-room-arena`, baza `a28ddc8cf00591cf960948079fcef34b5ca362ff`. Pakiet nałożony na wcześniejsze lokalne zmiany ostrości ekranów i windy. Bez commitu, push ani wdrożenia Vercel.

## Efekt

- Ławka i dwie skrzynie muzyczne we wnęce po lewej, trzy plakaty na drewnianym tle. Bryły mebli kończą się za dawną wewnętrzną linią ściany x=-9,82; przejście do korytarza przy z=-5 pozostaje wolne.
- Malowany mural 3S na prawej ścianie, krem/grafit/miedź/turkus. Niewielkie strzałki na podłodze prowadzą w stronę korytarza.
- Ciepła listwa pod ławką i turkusowy akcent przy muralu. Krótkie powitanie przez zmianę przezroczystości poświaty; reduced motion zachowuje stały wygląd. Efekt nie reaguje jeszcze na muzykę.
- Poświaty oraz cienie mebli są płaskimi imitacjami; nie dodano lamp, dynamicznych cieni, Bloom ani odbić live. Tablice lobby i holu zachowują poprzednią poprawę ostrości.
- Projekty właściciela skopiowane bez obróbki do `docs/design/owner-entry-mobile-v1.png` i `owner-entry-desktop-v1.png`; notatka `owner-entry-references.md`. Logowanie/rejestracja i rozjazd landing page pozostają osobnym etapem.

## Koszt i pomiar

Jedna nowa tekstura RGBA 1024×1024, 94 836 B WebP. Profil low: 512×512, 38 930 B. Przy RGBA8 i pełnym łańcuchu mipmap to około 5,33 MiB lub 1,33 MiB GPU. Mały WebP określa pobieranie, nie kompresję pamięci GPU.

`useLoader` i własna skonfigurowana kopia unikają dodatkowego uploadu źródła przez `useTexture`. Jednostronne lokalne poświaty/cienie unikają podwójnego rysowania płaskich dekoracji. Nowy pakiet: sześć scalonych partii, 226 trójkątów geometrii wraz ze zmianą wnęki.

Porównanie Chromium/SwiftShader mobile 844×390, DPR 1, ten sam kadr `[4,2.05,6]`, normalny profil:

| Pomiar | Przed | Po |
|---|---:|---:|
| Wywołania rysowania całej klatki | 43 | 49 |
| Renderowane trójkąty całej klatki | 4465 | 4693 |
| Trójkąty geometrii sceny | 4478 | 4704 |
| Tekstury na GPU | 18 | 19 |

Różnica renderowanych trójkątów wynosi 228; poświaty istniejących listew mogą rysować obie strony. Geometria liczy 226 dodatkowych trójkątów. Desktop: również +226 trójkątów geometrii i +1 tekstura; próbka bazowa licznika klatki była niepełna, dlatego nie podajemy porównania draw calls desktop.

Bazę mierzono z wersją `HubShell` z HEAD, zachowując wcześniejszy checkpoint ekranów/windy; bieżący plik odtworzono z kopii w `finally`. Artefakty `output/lobby-character-baseline.json` i `lobby-character-optimized.json`. Nie ma nowych przełączników testowych w produkcji.

## Weryfikacja

- 49/49 testów zakresu PASS; TypeScript i ESLint zmienianych plików PASS; build produkcyjny PASS.
- Skill develop-web-game: klient w `output/web-game-client.mjs`, istniejący Playwright/Chromium, bez instalacji zależności. Zrzuty wnęki i muralu oraz stan kamery odczytane i obejrzane.
- Uzupełniająca emulacja: desktop i mobile, wnęka/mural/tablica, przełączenie przez rzeczywisty callback governor do mobile-low, tekstura 512, DPR 0,75 po obrocie do portrait, reduced motion ze stałą opacity 0,2, shadowMap wyłączony; 0 pageerror.
- Kontrola windy w końcowym buildzie produkcyjnym: PASS, HTTP 200, wejście joystickiem, przycisk mieści się w viewport, zjazd/wjazd i otwarcie na zachowanych kotwicach, 0 pageerror, bez blokowania pobierania mediów. Diagnostyka QA nie jest wystawiana w produkcji. Artefakt: `output/lobby-character-production-qa.json`.

Podgląd produkcyjny: `http://127.0.0.1:3006/b3p`. Start pozostaje w Creator Roomie; do lobby prowadzi istniejąca winda. To nie jest publikacja Vercel.

## Granice

Arena, Stage 7, upper lounge, collidery i kotwice nawigacji niezmienione. Lobby nadal nie ma blokowania ruchu przez ściany/meble; wnęka usuwa przeszkody z głównej trasy, ale nie wprowadza fizyki siedziska. Nie deklarujemy pełnego testu przejścia pieszo z początkowego kadru.

Emulacja nie dowodzi FPS ani temperatury fizycznego telefonu. Do akceptacji: wygląd na telefonie, cała trasa do windy i kilka minut z odtwarzanymi mediami. Kolejny etap: dopracowana grafika wejścia bez namalowanych pól, formularz HTML, rzeczywiste auth, a następnie rozjazd dwóch połówek po gotowości lobby.
