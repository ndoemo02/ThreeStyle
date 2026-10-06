# ThreeStyle — checkpoint i wznowienie prac, 2026-10-06

## Cel checkpointu

Zachowanie pełnego bieżącego zakresu przed przerwą w subskrypcji. Root: `C:\ThreeStyle.ai`. Źródłowa gałąź: `feat/event-room-arena`, baza przed tym pakietem: `a28ddc8cf00591cf960948079fcef34b5ca362ff`. Docelowa gałąź: `main`.

Zdalny main wskazywał osobny root commit `9c63536` (clean snapshot), bez wspólnego przodka z gałęzią rozwoju. Promocja zachowuje aktualne, zweryfikowane drzewo gałęzi rozwoju oraz obie historie przez merge ze strategią ours, następnie fast-forward lokalnego main i zwykły push. Bez force-push. Archiwalne zasoby wycofane we wcześniejszych commitach nie są przywracane z dawnego snapshotu.

## Co jest gotowe

- Creator Room: kompaktowy media deck, sesyjny upload audio/wideo, odtwarzanie i reakcja ekranów, przywrócenie kursora klawiszem E oraz interakcja z laptopem z większej odległości.
- Mobile: poprawki ostrości, synchronizacja rozdzielczości postprocessingu z DPR, profile wydajności i ustawienia światła. Preferencje pokoju zapisywane lokalnie.
- Lobby/hol: ostrzejsze oznaczenia i oddzielna duża tablica; mural, plakaty, ławka i skrzynie we wnęce, strzałki oraz lekkie poświaty. Grafika powitalna Blok Trzech Pięter jest w atlasie. Bez nowych dynamicznych cieni/odbicia live.
- Winda: widoczna kabina i drzwi od strony pokoju, dostępny przycisk DOM, efekty jazdy w obu kierunkach, oczekiwanie na pierwszą klatkę docelowej architektury, timeout i powrót przy błędzie. Media preload ograniczony do metadata.
- Supabase ThreeStyle: projekt `dqefgvjzgpfuartuydmv`, aktywna migracja `20261005091247`, profile, metadane mediów, prywatny bucket `creator-media` i izolacja RLS. Startowy limit pliku: 50 MiB. Lokalny klient i adapter biblioteki są przygotowane.
- Nowe MP4 w bibliotece demo zapisane jako rzeczywiste pliki Git, nie wskaźniki LFS; uzupełniono wyjątek dla całego public/media, aby dało się je odtwarzać po wdrożeniu.
- Zachowane referencje właściciela, obrazy koncepcji windy i cztery źródłowe grafiki wejścia w `public/Entry screen IMG`. Zachowane podmiany referencji i mediów demo.

Bieżące zmiany nie rozwijają Areny, Stage 7, upper lounge, colliderów ani kotwic nawigacji. Main otrzymuje również wcześniejsze commity gałęzi, w tym wcześniej ukończone prace areny; nie są one nową implementacją tego checkpointu.

## Co jeszcze nie działa jako produkt

- `/` nadal przekierowuje na `/b3p`, a scena startuje w Creator Roomie.
- Nowy landing i rzeczywisty formularz logowania/rejestracji nie są zaimplementowane. Stary onboarding jest prototypem, jego przycisk nie uwierzytelnia użytkownika.
- Obecny upload HUD jest sesyjny. Nie przesyła jeszcze plików do prywatnej biblioteki konta; nie obiecywać trwałego zapisu ani synchronizacji urządzeń.
- Nie ma jeszcze transferu TUS, postępu/anulowania/wznowienia ani odnawiania podpisanych URL-i w odtwarzaczu.
- Nie wykonano pełnego testu GoTrue + rzeczywisty upload Storage + odtwarzanie dla dwóch zalogowanych kont.
- Auth Site URL/callbacki oraz zmienne Vercel wymagają konfiguracji przy wdrażaniu formularza. Lokalny config.toml nie konfiguruje automatycznie chmurowego Auth.
- MCP Supabase jest skonfigurowany, ale OAuth MCP ma błąd odczytu metadanych. CLI projektu działa na koncie ndoemo03, korzystając z osobnego prywatnego magazynu.

## Kierunek landing page — decyzja do wdrożenia

Zachować turkusowe drzwi, graffiti i miedziane światło. Desktop: `16.9b.png` jako baza tła, `16.9a.png` jako referencja formularza. Mobile: `9.16b.png` jako baza, `9.16a.png` jako referencja logo.

Usunąć namalowane pola logowania z drzwi oraz nagłówki/menu/stopki/teksty UI z tła. Logo graffiti oddzielić jako przezroczystą grafikę. Formularz i treść wykonać HTML-em, podpiętym do Supabase. Na mobile ograniczyć pustą podłogę i zapewnić miejsce na klawiaturę. Źródła mają 11–13 MB; nie stosować ich wprost jako finalnych assetów. Przygotować warianty WebP/AVIF.

Przejście: potwierdzona sesja → przygotowanie lobby pod zasłoną → gotowość pierwszej klatki → centrowanie windy i rozsunięcie warstw → sterowanie. Szczelina drzwi desktop nie leży w środku strony, więc zwykły podział bitmapy 50/50 wymaga korekty kadru. Motion przez transform/opacity, reduced motion przez krótkie przenikanie. Adobe przydatne do oczyszczenia i rozdzielenia warstw; interaktywna animacja kodem. Regeneracja tylko punktowa, jeżeli trzeba odtworzyć tło po usunięciu napisów.

## Weryfikacja

2026-10-06: wszystkie 70 testów `.test.ts`/`.test.mjs` przeszły. Build produkcyjny PASS (kompilacja, TypeScript, generowanie stron). Do pobrania fontów zastosowano systemowe certyfikaty przez zmienną środowiskową procesu; ustawień projektu/globalnych nie zmieniano.

Poprzednie checkpointy zawierają lokalne testy desktop/mobile windy, opóźnień i błędów ładowania, reduced motion oraz porównanie kosztu renderowania lobby. To emulacja Chromium/SwiftShader, nie pomiar FPS/temperatury fizycznego telefonu.

Zdalna baza 2026-10-05: migracja zastosowana, historia zgodna; SQL test izolacji dwóch kont i rollback danych PASS; anonimowy klient HTTP ma odmowę 42501; doradcy Supabase nie zgłosili ostrzeżeń. Ostatni TypeScript i scoped ESLint PASS.

## Wznowienie

1. Sprawdzić root, gałąź, HEAD i git status. Czytać najpierw ten checkpoint i raport Supabase.
2. `npm.cmd ci`, następnie `npm.cmd run dev` (port 3001). Nie używać starych numerów portów z historycznych checkpointów jako aktualnego stanu usług.
3. Przygotować warstwy landing desktop/mobile, potem formularz Auth i sesję/callback.
4. Podłączyć wejście do gotowego lobby, zachowując jeden Canvas i blokadę sterowania podczas animacji.
5. Podłączyć prywatny upload do HUD, użyć TUS, sprawdzić dwie sesje i izolację realnych plików. Dopiero potem trwałe ustawienia konta i dalsze efekty światła.

`npm.cmd run supabase -- whoami` sprawdza konto CLI; `npm.cmd run supabase -- migration list --linked --project-ref dqefgvjzgpfuartuydmv` sprawdza historię. Nie uruchamiać pierwszej migracji ponownie przez SQL Editor. Nie kopiować tokenów zarządzania do frontend/Vercel.

Lokalne `.env.local` i token CLI nie są wersjonowane. Nowa maszyna wymaga własnego `.env.local` według `docs/supabase.env.example`. Przy produkcyjnym Auth ustawić Site URL/callbacki, publikowalny klucz i URL w środowisku wdrożenia oraz SMTP przed otwartą rejestracją.

## Dokumenty szczegółowe

- `docs/lobby-elevator-checkpoint-2026-10-04.md`
- `docs/lobby-character-checkpoint-2026-10-05.md`
- `docs/supabase-accounts-media-2026-10-05.md`
- `docs/entry-login-direction-2026-10-05.md`
- `docs/design/owner-entry-references.md`

Historyczne zapisy „lokalne / bez commitu” opisują stan w dniu ich powstania; ten checkpoint zbiera je do publikacji na main. Nie deklaruje nowego wdrożenia Vercel ani jego wizualnej akceptacji. Push może uruchomić integrację Git/Vercel, jeśli jest aktywna.

Logi `.playwright-mcp`, output QA i dwa nieużywane GLB (`tests/mersh-kiwi-look.glb`, `tests/y7ybxj8p.glb`) pozostają lokalnie. Nie są zależnościami runtime ani testów automatycznych. Nie zostały usunięte.