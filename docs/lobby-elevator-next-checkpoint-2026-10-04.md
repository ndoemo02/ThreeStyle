# Ostrość tablic i przejazd windą — plan 2026-10-04

Baza: a28ddc8cf00591cf960948079fcef34b5ca362ff, feat/event-room-arena, C:\ThreeStyle.ai.
Analiza bez zmian kodu. Potwierdzony kierunek właściciela: loading room jest etapem przejazdu ukrywającym ładowanie następnego pokoju, nie osobną przestrzenią.

## Potwierdzone w kodzie

- Tablice mobile mają po 512×256 px w atlasie 1024×1280; desktop po 1024×512. Drobny opis SVG ma 26–27 px w bazowym projekcie 1024 px, czyli około 13 px w źródle mobile, jeszcze przed pomniejszeniem perspektywą. LobbySignage używa mipmap, anizotropii 2/4. Profile mobile renderują DPR 1 lub 0,75.
- ElevatorA deklaruje shaftGroupRef i animuje go w useFrame, ale nie podpina ref do żadnego JSX. Ruch szybu jest więc niewidoczny.
- Przy wejściu w moving useNavigationStore zmienia activeZone, a ElevatorA przenosi kamerę do kabiny docelowej. Dwie strefy korzystają z różnych wersji wnętrza kabiny.
- Drzwi otwiera stały timer 3000 ms; gotowość ładowania nie jest warunkiem otwarcia.
- Widoczność windy w Creator Roomie zależy od roomShellReady. StageReadySignal jest wewnątrz jednego z zagnieżdżonych Suspense; nie jest dowodem gotowości wszystkich granic ani pierwszej wyrenderowanej klatki.
- GroundedHub ma fallback Suspense, ale obecnie nie zgłasza gotowości sceny docelowej.

## Kolejność realizacji

1. Ostrość: większe główne napisy, wyższy kontrast, krótsze opisy. Dla dużej tablicy wydzielić wyższą rozdzielczość zamiast mnożyć pamięć całego atlasu mobile. Porównać z dotychczasowym atlasem przy tej samej kamerze i DPR. Zwiększenie całego DPR pozostawić jako osobną decyzję po pomiarach, bo dotyczy całej sceny.
2. Kabina: ta sama lekka, trwała wizualizacja przejazdu w obu kierunkach, niezależna od aktualnie montowanej sceny. Po rozpoczęciu przejazdu zamknąć HUD i pozostawić sterowanie przejściem w jednym miejscu. Zachować kotwice wejścia/wyjścia i collidery.
3. Efekt jazdy: widoczne pionowe pasma w bocznych wnękach kabiny. Przy zjeździe pasma przesuwają się w górę; przy powrocie kierunek odwrócony. Delikatna zmiana jasności istniejących LED, czytelny wskaźnik kierunku/celu. Bez dużej liczby świateł, Bloom, cząsteczek i mocnego trzęsienia kamery. Reduced motion pozostawia spokojną zmianę światła i informację o stanie.
4. Ładowanie: po zamknięciu drzwi zmienić scenę pod osłoną kabiny; drzwi otworzyć po zakończeniu minimalnego efektu jazdy i uzyskaniu sygnału gotowości widocznej architektury/docelowej pierwszej klatki. Nie czekać na wszystkie opcjonalne dekoracje. Dłuższe ładowanie pokazuje rzeczywisty komunikat przygotowywania pokoju, bez fikcyjnego procentu. Błąd/timeout ma kontrolowany powrót lub ponowienie, nie wieczne zamknięcie w kabinie.
5. Testy i akceptacja lokalna przed kolejnym commitem/wdrożeniem.

## Koszt i granice

Ostrość: mały zakres. Przejazd ukrywający loading: średni zakres, ponieważ dotyka animacji, cyklu życia kabiny i gotowości scen. Wizualne pasma można renderować jednym instancedMesh; docelowy koszt wymaga pomiaru draw calls i klatek przed/po. Brak deklaracji FPS telefonu na podstawie kodu lub emulacji.
Nie zmieniać Areny/Event Roomu, Stage 7, upper lounge, fizyki, colliderów ani położenia windy. Istniejące niepowiązane obrazy referencyjne i GLB zachować.

## Umiejętności

- develop-web-game: małe iteracje; test rzeczywistych wejść, zrzutów i stanów przejazdu. Dostępny lokalnie. Projekt nie ma render_game_to_text/advanceTime; przy implementacji dodać minimalną diagnostykę testową, nie przebudowę pętli gry.
- threejs-fundamentals: instancing, materiały, geometria i budżet renderowania.
- threejs-interaction: klik/E/touch w kabinie.
- improve-animations / review-animations: dostępne, przydatne odpowiednio do osobnego audytu i oceny końcowej; ich reguł czasów animacji DOM nie przenosić mechanicznie na przejazd 3D.
- agent-browser: lokalny katalog zaktualizowany 2026-10-04; sprawdzono plik umiejętności, nie potwierdzono instalacji CLI. Data lokalna nie dowodzi daty publicznej premiery.
- playwright-interactive: dostępny plik, lecz wymagany js_repl nie jest obecnie udostępniony w tym wątku. Nie zmieniać konfiguracji globalnej ani sandboxa dla tego zadania.

## Scenariusze QA

- Mobile/desktop: tablice z wejścia i z bliska, te same kamery przed/po, zwykły i niski profil, obrót.
- Creator → lobby i lobby → Creator: wejście, E/przycisk dotykowy, zamknięcie, widoczny ruch, otwarcie, wyjście; brak podwójnego uruchomienia i skoku kamery.
- Zimny cache/wolna sieć: kabina pozostaje widoczna, drzwi czekają na gotowość.
- Błąd ładowania: informacja i dostępna droga wyjścia/retry.
- Reduced motion, tło/powrót do karty i obrót podczas jazdy.
- Draw calls, czas klatki i brak nowych błędów konsoli; fizyczny telefon osobno od emulacji.