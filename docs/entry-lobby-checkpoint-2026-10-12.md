# ThreeStyle — landing, Auth i przejście do lobby, 2026-10-12

Aktualizacja: [korekta mobile i domknięcie testu Auth, 2026-10-13](entry-mobile-correction-2026-10-13.md). Poniższy raport zachowuje stan historyczny z 12 października; brak zgody na test admina został później rozstrzygnięty przez właściciela, test wykonano i konto usunięto.

Root C:\ThreeStyle.ai, gałąź `codex/entry-lobby-transition`, baza `4407a9232b904d9e2b1e12f8a5d6c7944ec34d6b`. Implementacja lokalna i podgląd Vercel, bez commitu/pusha/promocji produkcyjnej.

## Podgląd

https://three-style-i4vorlp2l-freeflow-build.vercel.app

Vercel deployment `dpl_HeQJBHH5sERLbGqCaWgwbuuwFCyY`, READY; remote build, TypeScript i generowanie stron PASS. Lokalnie http://localhost:3010. Podgląd jest snapshotem niecommitowanego katalogu; metadata bazy Git nie jest SHA zmian tej implementacji. Akceptacja wizualna na prawdziwym telefonie pozostaje po stronie właściciela. Nie wykonywano automatycznego pobierania publicznej strony po deployu.

## Efekt

- `/` jest nowym responsywnym landingiem z czystymi grafikami właściciela, formularzem HTML, logowaniem/rejestracją, odzyskiwaniem hasła i jawnym demo.
- Konto jest weryfikowane przez `getUser`; callback PKCE wymienia kod na sesję, proxy odświeża cookies z weryfikacją `getClaims`. Brak service-role/sekretów w frontendzie. Brak zmiany modelu uprawnień DB.
- Najpierw weryfikacja sesji albo jawne demo, potem montaż jednej sceny WebGL. HUD ma osobny canvas 2D — nie jest drugim światem WebGL.
- Lobby przygotowuje architekturę pod zasłoną; otwarcie zaczyna się po istniejącym sygnale pierwszej wyrenderowanej klatki. Kolejność: preparing → approaching (1 s) → opening (1,1 s) → entering (0,8 s) → complete.
- Zbliżenie centruje szczelinę drzwi niezależnie od viewportu i background-cover. Dwa fizyczne skrzydła 3D odsuwają się symetrycznie; przejście poszerzone z 2 do 3,8 m. Kamera przechodzi przez próg i kieruje się na tablicę lobby. Końcowa pozycja [4,2.05,6.2].
- Inert formularz i wyłączone sterowanie podczas intro; pointer lock wymaga późniejszego gestu użytkownika. Anulowanie, timeout 25 s, błąd i ponowienie. Reduced motion pomija ruch przestrzenny po gotowości, nie ładowanie.
- Fotograficzne powierzchnie dwóch skrzydeł oraz grafitowych ścian zewnętrznych korzystają z jednej tekstury clean desktop i UV. Otoczenie od wewnątrz zachowuje dotychczasowy wygląd lobby.
- Oddzielna winda korytarz → Creator Room dostała małą, deterministyczną teksturę szczotkowania; kotwice, geometria jazdy i logika recovery bez zmian. Brak nowych świateł, cieni lub postprocessingu.
- `/b3p` nadal uruchamia bezpośrednie demo Creator Roomu. Arena/Stage 7/upper lounge/collidery bez zmian.

Grafiki `public/Entry screen IMG/clean-v1` mają PNG masters, WebP (około 430 KB każda) i prompty. WebP desktop 1672×941 daje około 8 MiB RGBA8 z mipmapami na GPU dla portalu; mały plik HTTP nie oznacza takiej samej pamięci GPU. Dodatkowe powierzchnie materiałów kabiny/ramy mają 128×128. Nie deklarujemy FPS fizycznego telefonu.

## Supabase i ograniczenia kont

Projekt ThreeStyle `dqefgvjzgpfuartuydmv` był INACTIVE po przerwie. Standardowe wznowienie projektu zakończone ACTIVE_HEALTHY, bez zmiany planu i bez odtwarzania backupu/PITR. Uzupełniono zachowaną listę dokładnych callbacków `/auth/callback` i `/auth/recovery` dla localhost/127.0.0.1 portów 3001 i 3010 oraz powyższego konkretnego podglądu Vercel. Nie dodano wildcarda wszystkich domen vercel.app.

Rejestracja włączona, potwierdzanie e-mail włączone. Nie ma własnego SMTP; otwarta rejestracja/dostarczanie wiadomości do innych osób wymaga konfiguracji wysyłki. Dotychczasowy Site URL nadal `http://localhost:3000`; UI przekazuje jawne, dopuszczone redirectTo/emailRedirectTo. Przy promocji na stabilny publiczny alias ustawić właściwy Site URL i dodać jego oba callbacki. Zmiana `.env.local` nie aktualizuje istniejących deploymentów; podgląd otrzymał tylko publiczny URL/klucz w build/runtime.

Auth UI działa z SDK; poprawne logowanie, potwierdzenie e-mail, odnowienie/reload i wylogowanie rzeczywistego konta wymagają próby właściciela. Nie utożsamiać konta w panelu zarządzania Supabase z kontem Auth aplikacji. Automatyczny test sukcesu na tymczasowym koncie nie został wykonany: klucz admina był ukryty, a kontrola automatyczna odrzuciła jego ujawnienie i tworzenie konta. Nie zastosowano obejścia. Żadne konto testowe ani maile nie powstały w tym teście. Potwierdzono natomiast rzeczywistą odpowiedź Auth 400 / invalid_credentials po wznowieniu i brak otwarcia sceny dla błędnych danych.

Oddzielna pomocnicza próba zastąpienia listy callbacków dwoma adresami została odrzucona przez kontrolę; nie wykonano jej. Finalna konfiguracja zachowuje wcześniejsze wpisy i dodaje wyłącznie konkretne adresy.

Biblioteka konta/Storage 50 MiB jest przygotowana, lecz HUD nadal używa sesyjnych plików. Nie wdrożono trwałego transferu, TUS, wznowienia uploadu ani odnawiania signed URL.

## Weryfikacja

- 74/74 testów Node PASS, w tym readiness-gate, reduced motion, kolejność etapów i matematyczne dopasowanie szczeliny w kilku viewportach.
- TypeScript + scoped ESLint PASS; produkcyjny build lokalnie i na Vercel PASS. Przegląd React: ciężka scena dynamiczna, brak WebGL przed wejściem, cleanup subskrypcji/cookies, focus/labels/inert i zgodność JSX.
- develop-web-game client: rzeczywisty przycisk demo → lobby; stan kamery i screenshot odczytane. Diagnostyka pozostaje wyłącznie development.
- Playwright desktop 1440×900, mobile 390×844, landscape/reduced motion 844×390: pełna sekwencja stanów, symetryczne skrzydła, jedna scena, brak automatycznego pointer lock, powrót do formularza i walidacja niezgodnych haseł PASS. 0 pageerror w zwykłych scenariuszach.
- Opóźniona tekstura: drzwi pozostają zamknięte; anulowanie zwalnia scenę. Obrót telefonu podczas intro PASS. Celowy błąd tekstury: dostępny komunikat i retry. Callback z niepoprawnym kodem/obcym next: lokalny redirect, brak open redirect.
- Oddzielny rzeczywisty przejazd windy z lobby/korytarza do Creator Roomu i E po wyjściu PASS; 0 pageerror.
- Nie podmieniano Auth na udawany backend ani nie traktowano testów demo jako potwierdzenia poprawnego logowania.
- Artefakty i skrypty QA: `output/entry-qa`, `output/entry-qa.mjs`, `output/entry-error-qa.mjs`, `output/entry-cabin-qa.mjs`. Początkowe screenshoty etapów mogą przedstawiać wcześniejszą iterację; końcowe landing/lobby i raport są nadrzędne.

Pierwszy upload Vercel zawierał duże lokalne artefakty i zakończył się limitem pliku 100 MB. `.vercelignore` uzupełnione: lokalne konfiguracje, output QA, dependencies/build, scratch GLB, źródłowe referencje/PNG poza paczką. Poprawiony deploy pobrał 373 pliki i ukończył build. Preview nie ma GEMINI_API_KEY; AI coach nie był częścią tego etapu i wymaga osobnej konfiguracji środowiska.

## Dalsze kroki

1. Obejrzeć intro na fizycznym telefonie, najlepiej portrait i landscape; ocenić zoom, próg i materiały kabiny.
2. Przetestować własną rejestrację/potwierdzenie i logowanie, reload, odzyskanie hasła i wylogowanie. Skonfigurować SMTP przed zapraszaniem innych użytkowników.
3. Po akceptacji: commit/push gałęzi i świadoma promocja na main/produkcyjny alias, wraz ze stabilnym Site URL.
4. Następny pakiet: trwały upload i biblioteka konta w HUD. Arena nadal osobno.

Po wznowieniu dodatkowy zdalny odczyt verify.sql PASS: obie tabele mają RLS; bucket prywatny 50 MiB; anon bez odczytu, konto bez zmiany właściciela/rozmiaru i bez dostępu do schematu wewnętrznego. Końcowy rerun QA po poprawie mobile i kamery PASS.
