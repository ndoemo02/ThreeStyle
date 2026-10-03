# Creator Room — E i kliknięcie urządzenia, 2026-10-03

Root: `C:\ThreeStyle.ai`. Branch: `feat/event-room-arena`. HEAD: `5e5ebdce3e132203d172a1c8b5d3259ce5db87b4`.

## Zgłoszenie i reprodukcja

Przed poprawką rzeczywista blokada myszy na CANVAS pozostawała po E bez celu; HUD był zamknięty. Osobno kliknięcie widocznego tabletu z odległości 7,800 m nie otwierało panelu. Dotychczasowy kontrakt Package 1 celowo blokował zwalnianie kursora bez zaakceptowanej interakcji. Właściciel poprosił o przywrócenie tej możliwości w Creator Roomie.

## Zmiana

- W `room1` E uruchamia bliską interakcję; przy braku zaakceptowanego celu zwalnia rozglądanie i pokazuje kursor. Poprawna interakcja z windą nadal zachowuje blokadę myszy. Autorepeat, wpisywanie tekstu i otwarty HUD nadal blokują interakcje świata.
- Kliknięcie/tap widocznego tabletu otwiera deck do 20 m. Zasięg E pozostaje 3 m. Przesłonięcie obiektu nadal jest sprawdzane przez istniejący raycast.
- Przeciągnięcie ponad 8 px nie otwiera decka. Kliknięcie urządzenia nie uruchamia ponownie blokady myszy za panelem.
- Wykrywanie blokady obejmuje canvas i jego element nadrzędny. Kontroler Drei może blokować DIV otaczający canvas.
- W Creator Roomie kliknięcia sceny przy wolnym kursorze używają faktycznych współrzędnych kursora. Podczas rozglądania używają środka widoku. Jest to konieczne, ponieważ domyślny compute kontrolera Drei wymusza środek także przy wolnym kursorze.

Obsługa E bez celu jest włączona wyłącznie dla Creator Roomu. Nie zmieniono kodu areny, Stage 7, colliderów ani upper lounge.

## Weryfikacja

- Node: 17/17 PASS (4 media, 13 interakcji, w tym 3 nowe przypadki E).
- Browser: 12/12 sprawdzeń PASS: dalekie E bez otwierania panelu, kliknięcie z 7,8 m, kursor po otwarciu, close, drag, bliskie E, Escape, kliknięcie obok tabletu, kliknięcie tabletu poza środkiem widoku oraz 3 przypadki rzeczywistego Pointer Lock.
- Rzeczywisty Pointer Lock na DIV: E bez celu zwalnia kursor bez HUD-u; bliskie E otwiera HUD; daleki klik podczas rozglądania otwiera HUD. Dowody: `output/creator-room/2026-10-03/cursor-native-checks.js` i `cursor-native-results.json`.
- Początkowe odmowy blokady przez automatyczną przeglądarkę nie zostały zaliczone jako PASS. Po przeniesieniu przeglądarki na pierwszy plan testy z rzeczywistą blokadą przeszły.
- TypeScript: PASS. Celowany ESLint: 0 błędów, 10 wcześniejszych ostrzeżeń CreatorRoomMVP/page; pliki systemu interakcji bez ostrzeżeń. `git diff --check`: PASS.
- Lokalny podgląd najnowszego kodu działa przez `next dev` na `http://localhost:3001/b3p`. Build opisany w poprzednim raporcie dotyczy wcześniejszego pakietu mediów; po tym uzupełnieniu nie ponawiano buildu produkcyjnego.

Bez commit/push/deploy. Wcześniejsze zmiany właściciela pozostawiono w working tree.
