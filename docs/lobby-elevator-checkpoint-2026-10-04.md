# Lobby i winda — checkpoint lokalny 2026-10-04

Baza: `C:\ThreeStyle.ai`, branch `feat/event-room-arena`, HEAD `a28ddc8cf00591cf960948079fcef34b5ca362ff`. Zmiany tego pakietu pozostają lokalne, bez commita, push i wdrożenia.

## Efekt

- Creator Room: widoczna kabina, obramowanie i dwuskrzydłowe drzwi, które otwierają się przy podejściu. Przyciski „Zjedź do lobby” / „Wjedź do Creator Roomu” są w interfejsie DOM poza Canvas. Stary przycisk miał y=1085 przy wysokości ekranu 945; nowy na emulacji mobile mieści się w 844×390: x=348, y=318, 148×52. Wejście joystickiem i uruchomienie klawiszem E sprawdzone.
- Ta sama kabina pozostaje widoczna w obu kierunkach. Zamknięte drzwi i boczne panele zasłaniają ładowanie sceny. Pasma w oknach drzwi poruszają się przeciwnie do kierunku jazdy; ciepły panel sufitowy lekko zmienia jasność. Reduced motion wyłącza ruch pasm i pulsowanie.
- Drzwi otwierają się po minimum 2,4 s jazdy oraz sygnale pierwszej wyrenderowanej klatki architektury. Opcjonalne dekoracje nie blokują przejazdu. Dłuższe oczekiwanie pokazuje „Przygotowujemy pokój…”. Błąd lub 30 s bez gotowości udostępnia powrót do poprzedniego pokoju.
- Tablice lobby/holu: większy tekst, wyższy kontrast, krótsze opisy, anizotropia do 4. Główna tablica ma osobną teksturę: mobile 1024×512, desktop 2048×1024. Atlas drzwi zachowuje wcześniejsze rozmiary.
- Media HUD: wstępne pobieranie audio/wideo ograniczone do metadanych. W kontrolnym teście produkcyjnym blokada pobierania domyślnego klipu usuwała zastój ładowania lobby. Po zmianie na preload metadata oba przejazdy przeszły bez blokowania klipu (test zakończony 2026-10-05).

## Koszt i granice

Pasma to jeden instancedMesh, kabina korzysta z dwóch instancjonowanych partii brył. Bez nowych dynamicznych świateł, cieni, Bloom ani cząsteczek. Duża tablica dodaje jedno wywołanie rysowania i około 2,67 MiB pamięci tekstury mobile z mipmapami. Pliki oznaczeń rosną łącznie o około 76 KiB mobile / 146 KiB desktop. DPR całej sceny nie podnoszony.

Arena/Event Room, Stage 7, upper lounge, kotwice nawigacji, collidery i fizyka pozostają bez zmian. Niepowiązane podmiany obrazów referencyjnych i pliki GLB zachowane.

## Weryfikacja

- 46/46 testów zakresu: lobby, Creator media/preferences/lighting, interakcje i polityka windy. TypeScript oraz ESLint zmienianych plików: PASS.
- Build produkcyjny: PASS po ograniczeniu lokalnych wątków Tokio/Rayon do 2. Pierwszy build miał błąd Windows 1450 (brak zasobów); nie było błędu źródeł. Ustawienia wyłącznie w środowisku procesu, bez zmiany konfiguracji projektu.
- Klient umiejętności develop-web-game: zjazd, wjazd, tablice lobby i holu; zrzuty oraz stan odczytane. Kopia klienta w ignorowanym output używa istniejącego Playwright i Chromium; oryginalna umiejętność niezmieniona, zależności nieinstalowane.
- Uzupełniające testy mobile: wejście joystickiem/E, oba kierunki, 9 s opóźnienia sieci, zamknięte drzwi podczas oczekiwania, wymuszony błąd tekstury i powrót, obrót podczas jazdy, reduced motion: PASS. Jedyny pageerror tego scenariusza dotyczy celowo przerwanego pobierania tekstury.
- Diagnostyka render_game_to_text i ustawianie kamer QA działają wyłącznie w development. Produkcja nie wystawia tego hooka. Test produkcyjny ustawia kamerę przez instrumentację przeglądarki, następnie używa rzeczywistego joysticka/przycisków.
- Końcowy test produkcyjny bez blokowania mediów: HTTP 200, wejście joystickiem, przycisk w widocznym obszarze, oba kierunki jazdy i wyjście na zachowanych kotwicach — PASS; 0 pageerror. Zrzuty `output/elevator-production-room-entry.png` i `output/elevator-production-down.png`.
- Artefakty: `output/elevator-runtime-qa.json`, `output/elevator-accessibility-qa.json`, `output/elevator-production-qa.json`, `output/elevator-final-client-qa`, `output/signage-mobile-qa`, `output/corridor-mobile-qa`.

Emulacja Chromium/SwiftShader nie dowodzi FPS, temperatury ani jakości na fizycznym telefonie. Ocena na Redmi oraz przeciętnym Androidzie pozostaje manualna. Pełna droga z początkowej kamery do windy nie była automatycznie przechodzona; test rozpoczyna się w okolicy wejścia, dalej korzysta z istniejącego joysticka.

## Następne kroki

Lokalny podgląd: `http://127.0.0.1:3005/b3p`. Po akceptacji wizualnej: commit wyłącznie plików pakietu i wdrożenie. Następnie manualne wejście/wyjście na telefonie oraz pomiar klatek i pamięci na urządzeniu przed dalszymi efektami świetlnymi.
