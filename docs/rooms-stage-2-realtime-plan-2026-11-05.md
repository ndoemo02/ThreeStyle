# Pokoje — plan etapu 2: obecność i aktualizacje na żywo (2026-11-05)

Status: **plan, bez kodu.** Etap 1 (`docs/rooms-stage-1-2026-11-05.md`) działa bez połączeń na żywo. Gość czyta pokój raz, przy otwarciu linku. Ten dokument opisuje, co trzeba ustalić, zanim powstanie etap 2. Liczby o Supabase pochodzą z dokumentacji (linki i data odczytu niżej). Nie mierzyłem niczego w aplikacji, więc nie podaję liczb wydajności.

Kontrakt HUD (`docs/threestyle_hud_room_contract.md`, sekcje 2 i 16) wyklucza „multiplayer rooms” i „live multiplayer” z MVP. Właściciel zaznaczył, że ta część jest nieaktualna. Etap 2 wymaga więc aktualizacji kontraktu.

## Zakres etapu 2 (propozycja)

1. **Obecność:** w pokoju widać, ile osób go ogląda i czy jest w nim właściciel. Nie ma awatarów ani pozycji w 3D, bo kontrakt (sekcja 16) wyklucza awatary użytkowników.
2. **Zmiany właściciela na żywo:** gdy właściciel zmienia światło, goście widzą to bez odświeżania.
3. **Poza zakresem:** pozycje i kursory gości, czat, wspólne sterowanie odtwarzaniem i udostępnianie plików właściciela. Pliki zostają prywatne, a ewentualne publiczne odtwarzanie to osobna decyzja o Storage.

## Mechanizm Supabase Realtime

| Potrzeba | Mechanizm | Dlaczego |
| --- | --- | --- |
| kto jest w pokoju | **Presence** | Dokumentacja zaleca Presence dla wolno zmiennego stanu (online/offline, bieżąca strona) i ostrzega, że każda zmiana trafia do **wszystkich** subskrybentów. |
| zmiana światła przez właściciela | **Broadcast** (zalecane) albo Postgres Changes na `rooms` | Dokumentacja zaleca Broadcast dla częstych, jednorazowych aktualizacji. Postgres Changes jest liczony jako jedna wiadomość na każdego słuchającego klienta przy każdej zmianie wiersza. |
| stan początkowy | dalej jeden odczyt `rooms` (etap 1) | Kanał przenosi tylko zmiany. Po ponownym połączeniu ponowny odczyt wyrównuje stan. |

Kanał prywatny `room:<owner_id>` z `config: { private: true }`. Autoryzacja przez RLS na `realtime.messages`:

- **odbiór** (`select`): gdy `rooms.visibility = 'public'` dla danego tematu albo czytający jest właścicielem;
- **wysyłanie Broadcast** (`insert`, `extension = 'broadcast'`): tylko właściciel;
- **Presence** (`insert`, `extension = 'presence'`): każdy, kto może czytać.

Dokumentacja podaje dwie rzeczy ważne dla nas:

- Prywatne kanały wymagają wyłączenia „Allow public access” w ustawieniach Realtime. Zmienia to cały projekt, więc to decyzja właściciela.
- Polityki są cache'owane na czas połączenia. Przełączenie pokoju na prywatny nie odetnie obecnych gości do ich ponownego połączenia albo nowego JWT. Trzeba więc dodatkowo wysłać zdarzenie „pokój zamknięty” i rozłączać klienta po stronie UI.

**Gość bez konta:** klucz publishable bez sesji to rola `anon`. Polityki dla `anon` na `realtime.messages` trzeba zaprojektować i przetestować tak samo jak w etapie 1 (gość, obce konto, właściciel). Niepotwierdzone w dokumentacji: czy Presence dla `anon` wymaga osobnej konfiguracji. Sprawdzić na projekcie testowym.

## Częstotliwość aktualizacji (propozycja do decyzji)

- Światło: wysyłać **stan końcowy**, nie każdy krok suwaka. Najwyżej jedna wiadomość na 250–500 ms podczas przeciągania i jedna po puszczeniu. Etap 1 zapisuje do bazy po 800 ms bezczynności i to może zostać.
- Presence: `track()` raz po wejściu i przy zmianie roli (np. właściciel wszedł lub wyszedł). Nie na ruch kamery. Limit z dokumentacji to 5 wywołań Presence na klienta na 30 s, więc częstsze aktualizacje są niemożliwe niezależnie od planu.

## Limity Supabase Realtime (z dokumentacji)

Źródło: [Realtime Limits](https://supabase.com/docs/guides/realtime/limits), odczyt 2026-11-05.

| Limit | Free | Pro | Pro (bez limitu wydatków) | Team |
| --- | --- | --- | --- | --- |
| Równoczesne połączenia | 200 | 500 | 10 000 | 10 000 |
| Wiadomości na sekundę | 100 | 500 | 2 500 | 2 500 |
| Dołączenia do kanału na sekundę | 100 | 500 | 2 500 | 2 500 |
| Kanały na połączenie | 100 | 100 | 100 | 100 |
| Klucze Presence na obiekt | 10 | 10 | 10 | 10 |
| Wiadomości Presence na sekundę | 20 | 50 | 1 000 | 1 000 |
| Wywołania Presence na klienta / 30 s | 5 | 5 | 5 | 5 |
| Rozmiar wiadomości Broadcast | 256 KB | 3 000 KB | 3 000 KB | 3 000 KB |

Limity są **na projekt**, nie na pokój. Na Free 200 równoczesnych połączeń to suma wszystkich otwartych pokoi.

## Koszt (z dokumentacji)

Źródła, odczyt 2026-11-05:

- [Realtime Pricing](https://supabase.com/docs/guides/realtime/pricing): rozliczane są wiadomości i szczytowe połączenia.
  - Free: 2 mln wiadomości i 200 szczytowych połączeń, bez możliwości dokupienia.
  - Pro i Team: 5 mln wiadomości i 500 połączeń w cenie.
  - Ponad limit: **2,50 USD za 1 mln wiadomości**, **10 USD za 1 000 szczytowych połączeń**.
- [Manage Realtime Messages usage](https://supabase.com/docs/guides/platform/manage-your-usage/realtime-messages): sposób liczenia wiadomości.
  - **Broadcast:** 1 wysłana + 1 na każdego odbiorcę.
  - **Postgres Changes:** 1 na każdego słuchającego klienta przy każdej zmianie.
  - **Presence:** strona nie podaje osobnej reguły liczenia. **Niepotwierdzone.** Do sprawdzenia w panelu Usage na projekcie testowym.
- [Broadcast](https://supabase.com/docs/guides/realtime/broadcast): wysyłka do siebie (`self: true`) jest liczona jako odebrana wiadomość. Subskrybowanie kanału tylko po to, żeby wysyłać z serwera, mnoży rachunek. Do wysyłki z serwera służy `httpSend`/REST.

Przykład rachunku z powyższych reguł, nie z pomiaru: właściciel przeciąga suwak 10 s przy limicie 2 wiadomości/s, a w pokoju jest 10 gości. To 20 wysłanych + 200 odebranych = **220 wiadomości** na jedno przeciągnięcie. Ten sam ruch przez Postgres Changes z obecnym zapisem etapu 1 (800 ms po ostatniej zmianie) to jedna zmiana wiersza po puszczeniu suwaka × 10 słuchaczy = **10 wiadomości**. Goście nie widzą wtedy jednak samego przeciągania, tylko wynik, z opóźnieniem zapisu.

## Liczba osób w pokoju (decyzja właściciela)

Propozycja startowa: **do 10 osób oglądających jeden pokój**, z czego wynika komunikat „Pokój jest pełny” przy próbie wejścia ponad limit. Uzasadnienie z limitów, nie z pomiaru:

- Presence na Free to 20 wiadomości/s na cały projekt. Wejście lub wyjście jednej osoby to zmiana dla wszystkich w pokoju.
- 10 kluczy Presence „na obiekt” warto zinterpretować na projekcie testowym przed ustaleniem limitu. **Niepotwierdzone**, czy dotyczy liczby pól w obiekcie stanu, czy czegoś innego.
- Limit egzekwowany po stronie klienta jest tylko wskazówką. Twardy limit wymaga logiki serwera, np. funkcji lub Edge Function wydającej „bilet” — to osobna decyzja.

Bez obecności awatarów liczba osób nie zmienia sceny 3D. Koszt rośnie w sieci i w liczbie wiadomości, nie w renderowaniu.

## Wpływ na wydajność (do zmierzenia, bez liczb)

Etap 2 nie dodaje geometrii ani świateł. Dochodzą:

- **WebSocket** z heartbeatem (stałe, małe zużycie sieci i baterii);
- **obsługa wiadomości:** każda zmiana światła od właściciela to aktualizacja sklepu HUD. Scena już reaguje na zmiany światła tak samo jak przy suwaku, więc koszt powinien być taki jak przy lokalnym przeciąganiu. To hipoteza do zmierzenia.
- **ponowne łączenie** po uśpieniu karty lub zmianie sieci i ponowny odczyt pokoju.

Zasada z etapu A zostaje: żadnych nowych prawdziwych świateł, zmiana tylko koloru i intensywności, bez rekompilacji shaderów.

## Co zmierzyć na telefonie (przed i po włączeniu Realtime, ten sam pokój i telefon)

1. Czas klatki (mediana i najgorsze 1%) w pokoju gościa: bez kanału, z kanałem w spoczynku, oraz gdy właściciel przez 30 s przeciąga suwak.
2. `renderer.info`: wywołania rysowania, programy, tekstury. Powinny zostać bez zmian; zmiana oznacza błąd.
3. Pamięć JS (heap) po 10 min w pokoju i po 10 ponownych połączeniach (czy rośnie).
4. Ruch sieciowy na minutę w spoczynku (heartbeat) i podczas zmian.
5. Czas od zmiany u właściciela do widocznej zmiany u gościa (opóźnienie end-to-end) na Wi-Fi i LTE.
6. Zachowanie po zablokowaniu ekranu, powrocie do karty i przejściu Wi-Fi → LTE: czy pokój wraca do aktualnego stanu.
7. Temperatura i bateria po 15 min (porównanie z etapem 1).
8. Panel Supabase Usage po teście: realna liczba wiadomości (w tym Presence) i szczytowe połączenia.

## Decyzje dla właściciela przed etapem 2

1. Aktualizacja kontraktu HUD: multiplayer i obecność wchodzą do zakresu.
2. Limit osób w pokoju i czy egzekwować go twardo (serwer), czy tylko w UI.
3. Broadcast czy Postgres Changes dla zmian światła (koszt i opóźnienie kontra prostota).
4. Wyłączenie „Allow public access” w Realtime (wpływa na cały projekt).
5. Plan Supabase: Free (200 połączeń, 20 wiadomości Presence/s na projekt) czy Pro.
6. Czy gość bez konta ma być widoczny w Presence (liczba osób), czy tylko zalogowani.
