# ThreeStyle — wejście, konto i przejście do 3D

Kierunek wskazany przez właściciela, 2026-10-05. Bez implementacji i zmian dotychczasowego checkpointu.

## Kierunek: strona główna otwiera się jak drzwi windy

Normalna strona główna z formularzem, informacjami i grafiką, podzielona pionowo na dwie połowy. Lewa połowa: logo i czytelny formularz logowania/rejestracji. Prawa: opis ThreeStyle oraz grafika lub nieruchomy kadr lobby. Grafit, ciepła miedź, jasna typografia; delikatna linia pośrodku podkreśla miejsce rozwarcia. Formularz jest widoczny od początku, bez etapu rozwijania karty.

Robocze hasło: **Twój rytm. Twoja przestrzeń.** Opis przedstawia pokój, media i odkrywanie muzyki. Przyciski formularza: „Zaloguj się” / „Załóż konto”. Po potwierdzeniu dostępu lub dla osoby z ważną sesją: **Wejdź do ThreeStyle**. Słuchacz korzysta z tej samej drogi; nie wybiera trwałej roli artysta/słuchacz przy rejestracji. Ewentualne wejście gościnne to osobne, jawnie opisane demo; zwykły przycisk Start nie zastępuje uwierzytelnienia.

## Formularz konta

Przełącznik „Logowanie / Rejestracja”, oznaczone pola i czytelne błędy bezpośrednio przy formularzu. Dokładną metodę konta (hasło, kod/link e-mail, Google) ustalamy przy wyborze dostawcy. Interfejs przewiduje stan wysyłania, odzyskanie dostępu i anulowanie logowania zewnętrznego. Walidacja ani błąd nie uruchamiają animacji wejścia.

Nie zbieramy awatara, gatunku muzyki ani biografii przed pierwszym wejściem. Opcjonalną nazwę sceniczną można ustawić później. Do czasu rzeczywistego backendu prototyp musi jawnie oznaczać symulację konta.

## UI → ThreeStyle 3D

1. Użytkownik kończy zakładanie/logowanie konta lub naciska przycisk wejścia z potwierdzonym dostępem. Wczytujemy jeden Canvas z lobby pod nadal widoczną stroną. Pierwszy ekran nie wymaga pełnego WebGL ani automatycznego pobierania filmu.
2. Czekamy na gotowość architektury lobby i jej pierwszą wyrenderowaną klatkę. Przy oczekiwaniu na stronie jest komunikat „Przygotowujemy lobby…”. Błąd pozostawia dostępny formularz/ponowienie, bez rozsunięcia na pusty ekran.
3. **Cała lewa połowa strony wraz z formularzem odsuwa się w lewo, cała prawa z grafiką w prawo.** Pionowa szczelina rozszerza się i odsłania działające lobby 3D. Proponowany czas 0,8–1,2 s z łagodnym startem i zatrzymaniem. Kamera lobby stoi stabilnie — bez dodatkowego lotu.
4. Po zakończeniu usuwamy warstwę wejścia i dopiero włączamy sterowanie. Dźwięk i pointer lock wymagają odpowiedniego działania użytkownika. Użytkownik jest w lobby; stamtąd korzysta z windy do Creator Roomu.

Na telefonie treść układa się w czytelny, przewijany układ z formularzem jako priorytetem; nie ściskamy go w połowie szerokości. Efekt odsłonięcia nadal ma dwa skrzydła. Realizacja nie powinna dublować aktywnych formularzy lub przenosić ich pól podczas pisania. Reduced motion: krótkie przenikanie. Po otwarciu nie pozostają niewidoczne warstwy blokujące dotyk.

## Podział pracy

**A — makieta wejścia:** desktop/mobile, logowanie, rejestracja i przygotowanie lobby. Najpierw ocena proporcji obu połówek i formularza.

**B — prototyp przejścia:** dwa rozsuwane skrzydła strony, jeden Canvas z lobby, prawdziwy sygnał gotowości, błędy ładowania, obsługa resize i reduced motion. Bez integracji kont. Nowe wejście wymaga zmiany obecnego startu sceny: B3P w produkcji inicjalizuje dziś Creator Room. Nie wolno zasłonić tego samą animacją, która odsłoni niewłaściwą strefę.

**C — konta:** wybór dostawcy, sesja, callback, wylogowanie oraz ochrona danych użytkownika. Dopiero potem zapis biblioteki i ustawień na koncie; obecne uploady są sesyjne. Dane gościa nie mogą być obiecane jako automatycznie przeniesione, zanim powstanie mechanizm migracji.

## Zweryfikowana baza

- `next.config.ts`: `/` przekierowuje do `/b3p`.
- `src/components/ui/Onboarding.tsx`: przycisk nazwany logowaniem uruchamia tylko `onComplete()`.
- `src/app/page.tsx`: wcześniejszy onboarding i świat 3D nadal istnieją jako prototyp.
- W przeszukanym `src` i zależnościach projektu brak gotowej integracji auth. Nowe wejście wymaga świadomej zmiany routingu oraz oddzielnej integracji kont.

Arena, Stage 7 i collidery pozostają poza zakresem. Ta notatka nie autoryzuje wdrożenia ani nie zmienia trwającego pakietu windy.
