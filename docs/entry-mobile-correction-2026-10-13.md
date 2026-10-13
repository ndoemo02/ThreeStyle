# ThreeStyle — korekta intro i obrazu mobile, 2026-10-13

Root `C:\ThreeStyle.ai`, branch publikacji `codex/entry-lobby-transition`, baza `4407a9232b904d9e2b1e12f8a5d6c7944ec34d6b`. Właściciel 13 października zlecił commit i push całego gotowego zakresu wejścia oraz poprawek mobile na tę gałąź. Nie zmieniono main ani produkcyjnego aliasu. Ten raport uzupełnia checkpoint z 12 października.

## Podgląd

https://three-style-nv8rxlcz2-freeflow-build.vercel.app

Deployment `dpl_9VVRnE6Fm36PSNjAmAdec3y2ujeY` READY; build produkcyjny i TypeScript na Vercel PASS. Jest to snapshot niecommitowanego katalogu, nie nowy commit. Konkretny podgląd otrzymuje tylko publiczne ustawienia Supabase. Własne zmienne coacha nadal nie są skonfigurowane w preview. Lokalny podgląd: http://localhost:3010. Końcowa akceptacja wyglądu/płynności na telefonie pozostaje po stronie właściciela.

Callback i recovery tego podglądu dopisano i zweryfikowano w Supabase, zachowując wcześniejsze adresy i Site URL. Nie dodano wildcardów.

## Zgłoszenie i korekta

Właściciel potwierdził poprawne logowanie na telefonie, ale zgłosił boczny dryf przed rozsunięciem drzwi oraz niewyraźny i wyblakły ekran lobby.

- Zbliżenie odbywa się wokół fotograficznej szczeliny. Jej pozycja pozioma pozostaje stała; kamera 3D używa tego samego przesunięcia projekcji. Dopiero po otwarciu, podczas fizycznego wejścia, kamera kieruje się na lobby i zeruje przesunięcie. Formularz i układ landingu pozostają osobnymi warstwami HTML.
- Wspólna kalibracja wyznacza rozmiar, środek, pionowe dopasowanie i odległość kamery. Zbliżenie nie może zamienić się w oddalenie na bardzo szerokim ekranie. Minimalna korekta proporcji fotografii odpowiada rozmiarom fizycznych drzwi.
- Pionowa fotografia i drzwi 3D korzystają z tej samej grafiki mobile. Po obrocie wybierają ten sam wariant; geometrię/tekstury należące do poprzedniego wariantu zwalniamy. Natychmiastowy handoff usuwa nakładanie dwóch różnych obrazów drzwi.
- Mobile w lobby startuje z DPR 1,25, ograniczonym natywnym DPR urządzenia; minimum wynosi 1. Adaptacja opiera się na kilkusekundowych próbkach, ignoruje intro, ukrytą kartę i duże przerwy. Po zdrowej próbce wraca ostrość do maksymalnie 1,5 w bezruchu / 1,25 podczas ruchu. Nie ma supersamplingu do pełnego DPR 3 telefonu.
- Lżejszy profil nadal usuwa normal mapy i jedną donicę, ale zachowuje dwa istniejące źródła światła. Obniżenie jakości nie zmienia teraz tak mocno palety. Ekspozycja lobby 1,1 ogranicza rozjaśnienie; po przejściu do Creator Roomu wraca dotychczasowe 1,55.
- Tablica powitalna mobile: 1536×768 zamiast 1024×512; większy, pogrubiony podpis i mocniejszy miedziany akcent. Pozostałe tablice nadal mieszczą się w atlasie. Materiał tablicy zachowuje sRGB i `toneMapped=false`.

Nie dodano postprocessingu, cieni, nowych lamp ani modeli. Arena/Stage 7/upper lounge/collidery/kotwice istniejącej windy bez zmian. Ustawienia pokoju nie zostały zmienione.

## Koszt i granice

Plik mobile welcome ma 59 964 B, wcześniej 35 530 B; dodatkowa pamięć tekstury RGBA8 z mipmapami to około 3,33 MiB. DPR 1,25 oznacza około 56% więcej pikseli niż DPR 1; DPR 1,5 około 125% więcej. Wyższa wartość jest dopuszczana dopiero przy zapasie czasu klatki. Utrzymanie minimum DPR 1 poprawia czytelność kosztem większej pracy GPU niż dawny profil 0,75. Weryfikacja temperatury, baterii i FPS na rzeczywistych słabszych telefonach nadal pozostaje do wykonania.

## Auth — domknięcie testu

13 października właściciel zezwolił na wcześniejszy test administracyjny. Klucz został odczytany wyłącznie do pamięci procesu testowego, bez zapisania w repo, frontendzie lub logach. Jedno tymczasowe konto naraz, automatycznie potwierdzone bez wysyłki e-mail; po próbie usunięte wraz z profilem. Pierwsza próba przeglądarkowa nie zakończyła się podczas równoległego rozgrzewania sceny; cleanup został potwierdzony. Powtórka po rozgrzaniu zakończyła się sukcesem, również z potwierdzonym cleanupem.

Rzeczywisty Supabase: odrzucenie błędnego hasła → poprawne logowanie → wejście z kontem → powrót → sesja po reload → wylogowanie → brak sesji po kolejnym reload: PASS. Właściciel niezależnie potwierdził logowanie na publicznym podglądzie. Nie traktować tego jako testu dostarczania maili/resetu hasła; własny SMTP nadal wymaga konfiguracji przed otwartą rejestracją.

## Weryfikacja

- Test dryfu najpierw FAIL na starej implementacji: poziome przesunięcie 577 px dla desktopu. Po poprawce PASS.
- 76/76 testów Node PASS; TypeScript i scoped ESLint PASS; `git diff --check` PASS.
- Playwright: desktop, pion/poziom mobile, reduced motion i rzeczywiste kliknięcie demo PASS. Dodatkowa kalibracja w viewportach 844×390 i 390×844 z DPR urządzenia 2,5: szczelina 2D/3D zgodna poniżej 1 px CSS, poziome przesunięcie fotografii 0. Ekspozycja i zakres DPR odczytane z działającej sceny.
- Anulowanie i ponowienie przy opóźnieniu, obrót w trakcie intro, błąd tekstury z retry i callback odrzucający obcy redirect PASS.
- Przejazd istniejącą windą z lobby/korytarza do Creator Roomu: PASS, ekspozycja wraca do 1,55; 0 pageerror.
- Klient develop-web-game uruchomiony, screenshot oraz stan odczytane. Artefakty: `output/entry-qa/skill-20261013`, `alignment-report.json`, `auth-report.json`, `auth-cleanup.json`, `error-report.json`, `cabin-report.json` i screenshoty `*-20261013.png`.
- Zatrzymanie klatki tuż przy zmianie DOM dawało czarny capture headless, choć normalne intro się renderowało. Sonda czeka teraz na paint; opcja zachowania bufora działa wyłącznie w przeglądarce QA. W kodzie produkcyjnym nie włączono `preserveDrawingBuffer` ani zatrzymywania animacji. Końcowe screenshoty obejrzane.

## Wznowienie

1. Właściciel sprawdza podgląd na Redmi i przynajmniej jednym słabszym telefonie: dryf, płynność otwarcia, czytelność tablicy po chwili bezruchu i po obrocie.
2. Commit/push gałęzi zatwierdzony przez właściciela 13 października. Promocja na main/produkcyjny alias pozostaje osobnym krokiem. Przed promocją ustawić stabilny Site URL i callbacki, zachowując istniejące adresy.
3. Następny zakres: trwała biblioteka/upload konta w HUD; obecne pliki w HUD są nadal sesyjne. Dostarczanie e-mail/reset hasła i SMTP pozostają osobnym sprawdzeniem.
