# Pokoje kont — etap 1 (2026-11-05)

Gałąź `claude/rooms-stage-1` od `origin/main` (`1fef761`). Nic nie zostało scalone ani wdrożone, a migracja **nie** była uruchamiana na produkcji.

Cel: każde konto ma własny zapisany pokój. Inni mogą do niego wejść po linku albo po nazwie i widzą ten sam układ, ale nie mogą go zmienić. W tym etapie nie ma synchronizacji na żywo. Plan etapu 2 jest w `docs/rooms-stage-2-realtime-plan-2026-11-05.md`.

## Co znaczy „układ pokoju”

Według kontraktu HUD (`docs/threestyle_hud_room_contract.md`, sekcja 2) meble Creator Roomu są zamrożone i nie zmieniamy ich. Zapisywany jest więc **wygląd** pokoju, czyli to, co właściciel ustawia w zakładce „Światło”:

| Zapisywane na koncie (`public.rooms`) | Zostaje prywatne / lokalne |
| --- | --- |
| nastrój (`warm` / `focus` / `night`) | głośność (ustawienie słuchacza, `localStorage`) |
| jasność pokoju, moc LED, podświetlenie kabiny, siła reakcji | pliki właściciela i to, co aktualnie gra |
| kolor LED, reakcja na muzykę, kolory do muzyki | kamera |
| nazwa pokoju (`slug`) i widoczność | gospodarz w kabinie (Lucky, model ładowany tylko na żądanie) |

Gość z kontem lub bez widzi światło i nastrój właściciela. Ekran w pokoju pokazuje branding bez odtwarzania.

## Baza danych

Migracja `supabase/migrations/20261105090000_account_rooms.sql`:

- `public.rooms`: jeden wiersz na konto, `owner_id` to klucz główny i odwołanie do `profiles` (`on delete cascade`). Wartości są w osobnych kolumnach z CHECK-ami (zakresy 0–1, kolor `#rrggbb` małymi literami, nastrój z listy), bez dowolnego JSON-a.
- `visibility` ma wartość domyślną **`private`**. Pokój `public` wymaga nazwy, co pilnuje constraint `rooms_public_needs_slug`.
- Nazwa `slug`: 3–32 znaki, `a-z`, `0-9`, myślniki tylko w środku, unikalna. Dopóki pokój jest prywatny, nazwa może być pusta.
- Wiersz tworzy prywatny trigger `threestyle_private.create_account_room` (`security definer`, pusty `search_path`, bez `EXECUTE` dla ról). Uruchamia się przy powstaniu profilu. Migracja uzupełnia też pokoje kont, które już istnieją.
- Uprawnienia:
  - `anon` i `authenticated`: `SELECT`.
  - `authenticated`: `UPDATE` tylko kolumn wyglądu oraz `slug` i `visibility`.
  - Brak `INSERT` i `DELETE`.
  - Brak `UPDATE owner_id` i dat.
- RLS:
  - odczyt, gdy `visibility = 'public'` albo `owner_id = auth.uid()`;
  - edycja tylko gdy `owner_id = auth.uid()` (`using` i `with check`).
- **Storage bez zmian.** Migracja nie dodaje ani nie zmienia żadnej polityki `storage.objects`, a bucket `creator-media` pozostaje prywatny. Publiczny pokój nie daje dostępu do `media_assets` ani do plików.

Testy (PGlite, prawdziwy silnik Postgresa): `tests/accountRooms.test.mjs`, 12 testów. Obejmują:

- **Gość:** nie widzi prywatnego pokoju. Publiczny czyta, ale nie może go zmienić, utworzyć ani usunąć (`permission denied`).
- **Obce konto:** nie widzi prywatnego pokoju. Edycja publicznego pokoju zmienia 0 wierszy, a usunięcie kończy się odmową. Nie może przejąć zajętej nazwy (`unique`).
- **Zmiana właściciela:** `update rooms set owner_id` daje `permission denied`, także dla samego właściciela. Tak samo kończy się `insert` z cudzym `owner_id` i wywołanie funkcji triggera.
- **Wartość domyślna:** nowe konto i konto sprzed migracji dostają pokój prywatny.
- **Pliki:** przy publicznym pokoju gość i obce konto nadal dostają 0 wierszy z `storage.objects` i `media_assets` właściciela. Bucket ma `public = false`.
- **Walidacja i cykl życia:** błędne nazwy i wartości odrzuca CHECK. Powrót do „prywatny” ukrywa pokój. Usunięcie konta usuwa pokój.

Testy uruchamiają też skrypty do chmury: `supabase/rooms-rls-smoke.sql` (dwa tymczasowe konta, wszystko wycofywane) i `supabase/rooms-verify.sql` (jeden wiersz z faktami o uprawnieniach i bucketcie).

## Przepływy w aplikacji

### Właściciel (zalogowany, wejście przez stronę główną)

1. Strona główna, logowanie, „Wejdź do ThreeStyle”. Scena startuje w trybie `owner` (`RoomSession`).
2. `RoomSession` raz czyta pokój konta (`accountRoom.mine()`). **Zapis z konta wygrywa z wyglądem zapisanym lokalnie na urządzeniu.** Jeśli odczyt się nie uda, zakładka „Pokój” pokazuje błąd i „Ponów wczytanie”. Zmiany światła zostają wtedy tylko na urządzeniu.
3. Zmiana w zakładce „Światło” (istniejące kontrolki, bez nowych działań) zapisuje się automatycznie po 800 ms bez kolejnych zmian. Zapisywane są tylko kolumny wyglądu, przez `update ... where owner_id = <moje id>`. Status w zakładce „Pokój”: „Zapisywanie układu…”, „Układ zapisany na koncie.” albo „Układ nie został zapisany.” z przyciskiem „Ponów zapis”. Ponowienie wysyła bieżący wygląd i nie nadpisuje go wersją z bazy. Zmiany wprowadzone w trakcie zapisu idą w kolejnym przebiegu.

### Nowe działania w HUD — zakładka „Pokój” (tylko właściciel)

| Działanie | Kto widzi | Przepływ | Błędy |
| --- | --- | --- | --- |
| **Nazwa pokoju** (pole tekstowe) | właściciel | Wpisanie nazwy sprawdza format na bieżąco. Zapis dzieje się dopiero przyciskiem „Zapisz udostępnianie”. | Zły format: podpowiedź pod polem, przycisk nieaktywny. Nazwa zajęta (`23505`): „Ta nazwa jest już zajęta. Wybierz inną.” |
| **Kto może wejść: Prywatny / Publiczny** | właściciel | Wybór niczego nie zapisuje. Pod spodem opis skutków: publiczny oznacza każdego z linkiem lub nazwą, także bez konta; pliki, kamera i głośność zostają prywatne. „Zapisz udostępnianie” zapisuje nazwę i widoczność razem. | Publiczny bez nazwy: przycisk nieaktywny z podpowiedzią, a baza i tak odrzuci zapis (`23514`). Błąd sieci: komunikat, stan formularza zostaje. |
| **Zapisz udostępnianie** | właściciel | Aktywny tylko, gdy coś się zmieniło. Po sukcesie: „Pokój jest publiczny…” albo „Pokój jest prywatny…”. | jak wyżej |
| **Kopiuj link** | właściciel, tylko gdy zapisany pokój jest publiczny i ma nazwę | Kopiuje `https://<host>/pokoj/<nazwa>` do schowka i pokazuje „Skopiowano”. Link jest też widoczny i zaznaczalny. | Schowek niedostępny: „Zaznacz link i skopiuj go ręcznie.” |

Zmiana na „Prywatny” sprawia, że link przestaje działać dla innych od następnego otwarcia. Ktoś, kto ma już otwarty pokój, zachowuje swoją kopię do odświeżenia strony, bo w etapie 1 nie ma subskrypcji.

### Gość (link `/pokoj/<nazwa>` albo formularz `/pokoj`)

1. `/pokoj` to formularz „Nazwa pokoju”. Normalizuje wielkość liter i spacje, sprawdza format i przechodzi do `/pokoj/<nazwa>`. Strona główna ma link „Odwiedź czyjś pokój po nazwie”.
2. `/pokoj/<nazwa>` wykonuje jeden odczyt kluczem publishable, z sesją lub bez. **Brak pokoju i pokój prywatny dają ten sam komunikat**: „Nie ma takiego pokoju albo właściciel go nie udostępnia.”, żeby link nie zdradzał istnienia prywatnego pokoju. Błąd sieci pokazuje inny tekst i „Spróbuj ponownie”.
3. Po wczytaniu scena startuje od razu w Creator Roomie, w trybie `visitor`:
   - Wygląd właściciela trafia do sklepu HUD z blokadą (`lightingLocked`). Wszystkie setery światła są wtedy ignorowane, a `restorePreferences` nie nadpisuje wyglądu.
   - Nic nie trafia do `localStorage` gościa. Zapis głośności zachowuje jego własny wygląd.
   - Po wyjściu wraca własny wygląd gościa.
4. Baner na dole mówi wprost: „Pliki właściciela są prywatne i tu niedostępne. Układu nie można zmienić.” Ma przyciski „Szczegóły” (otwiera HUD) i „Wyjdź”.
5. HUD gościa ma tylko dwie zakładki:
   - „Pokój”: nazwa, komunikat o niedostępnych plikach, nastrój, data ostatniej zmiany i informacja, że pokój nie odświeża się na żywo.
   - „Światło”: wszystkie kontrolki wyłączone, nagłówek „Nastrój właściciela”.

   Nie ma zakładki „Media”, uploadu, kamery ani odtwarzacza.
6. Właściciel, który otworzy własny link, widzi go tak jak goście. Baner mówi wtedy: „To Twój pokój. Zmieniasz go po zalogowaniu na stronie głównej, w panelu „Pokój”.”

### Demo (bez konta)

Bez zmian: wygląd jest zapisywany tylko lokalnie i nie ma zakładki „Pokój”.

## Pliki

- SQL:
  - `supabase/migrations/20261105090000_account_rooms.sql`
  - `supabase/rooms-rls-smoke.sql`
  - `supabase/rooms-verify.sql`
- Logika:
  - `src/lib/accountRoom.ts` — walidacja nazwy, mapowanie wiersz ↔ wygląd przez te same ograniczenia co HUD.
  - `src/lib/supabase/accountRoom.ts` — adapter.
  - `src/stores/useRoomStore.ts`
  - `src/stores/useHudStore.ts` — blokada gościa.
- UI:
  - `src/components/room/RoomSession.tsx`, `RoomPanel.tsx`, `VisitorRoom.tsx`, `RoomFinder.tsx`, `room.css`
  - `src/app/pokoj/page.tsx` i `src/app/pokoj/[slug]/page.tsx` — `params` jako `Promise`, `robots: noindex`.
- Zmiany w istniejących plikach:
  - `HudOverlay.tsx`: zakładki zależne od trybu.
  - `CreatorLightingPanel.tsx`: `readOnly`.
  - `WorldExperience.tsx`: `roomMode`, `visitorRoom`.
  - `EntryLanding.tsx`: tryb `owner` po zalogowaniu i link do `/pokoj`.
  - `proxy.ts`: matcher `/pokoj`, `/pokoj/:slug` — odświeżanie sesji i `Cache-Control: private, no-store`.
- Typy: `database.types.ts` ręcznie rozszerzony o `rooms`. `database.generated.ts` trzeba wygenerować ponownie po migracji (polecenie niżej).
- Testy:
  - `tests/accountRooms.test.mjs` (SQL/RLS)
  - `tests/accountRoom.test.ts` (logika i adapter)
  - `tests/roomLock.test.ts` (blokada gościa i nienaruszony `localStorage`)
  - wszystkie trzy dodane do `npm run test:accounts`

Next.js: katalog `node_modules/next/dist/docs/` nie istnieje w zainstalowanym `next@16.1.6`. Konwencje sprawdzono na nextjs.org 2026-11-05: [Dynamic Segments](https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes) (`params` to `Promise`) i [proxy.js](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) (matcher stały, `/pokoj/:slug`).

## Weryfikacja

| Sprawdzenie | Wynik |
| --- | --- |
| `npx tsc --noEmit` | PASS |
| `node --experimental-strip-types --test tests/*.test.ts` | 141 pass, 2 skipped (testy assetu Lucky'ego bez modelu), 0 fail |
| `node --test tests/*.test.mjs` | 25/25 PASS |
| `npm run test:accounts` | 43/43 PASS |
| `npm run build` | PASS |
| `npm run lint` | 82 problemy (28 błędów, 54 ostrzeżenia). Na czystym `origin/main` jest **dokładnie tyle samo**: wszystkie istniały wcześniej, w plikach spoza tej zmiany. ESLint na plikach tej zmiany daje 0 problemów. |

Przeglądarka (Playwright z Chromium, produkcyjny build z **fałszywym** URL Supabase i odpowiedziami podstawionymi w teście):

- `/pokoj` odrzuca złą nazwę i normalizuje `" Studio-A "` do `/pokoj/studio-a`.
- Brak pokoju daje wspólny komunikat.
- Pokój publiczny pokazuje baner i HUD z zakładkami „Pokój” i „Światło”: 0 aktywnych kontrolek światła, brak odtwarzacza i uploadu.
- Gość nie wysłał żadnego zapisu do Supabase, a jego `localStorage` został nietknięty.
- Na szerokości 390 px nie ma poziomego przewijania.

Scena 3D w headless Chromium renderowała się na czarno, więc wygląd światła w pokoju nie był oceniany.

## Czego nie sprawdzono

- Migracji na prawdziwym projekcie Supabase ani PostgREST/GoTrue przez HTTP. Testy SQL działają na PGlite.
- Trybu właściciela w przeglądarce: odczytu z konta, autozapisu, formularza udostępniania i kopiowania linku. Pokrywają go testy adaptera z atrapą klienta, ale nie test end-to-end z prawdziwym logowaniem.
- Wyglądu sceny gościa na urządzeniu, telefonu ani wydajności. Nie podaję liczb, bo nic nie mierzyłem.
- Zachowania przy dwóch otwartych kartach właściciela: wygrywa ostatni zapis, a etap 1 nie wykrywa konfliktów.

## Decyzje dla właściciela

1. **Nazwa pokoju:** osobny `rooms.slug` (tak jest teraz) czy ponowne użycie `profiles.handle`? Profil jest dziś czytelny tylko dla właściciela, więc użycie `handle` wymagałoby otwarcia części profilu.
2. **Lista publicznych pokoi:** RLS pozwala gościowi pobrać wszystkie publiczne pokoje jednym zapytaniem. UI tego nie robi. Czy to w porządku, czy publiczny ma znaczyć „tylko z linkiem” (wtedy odczyt przez funkcję po nazwie zamiast `SELECT`)?
3. **`owner_id` w publicznym pokoju:** UUID konta, bez e-maila. Jest widoczny dla czytających publiczny pokój. Czy ukryć go (widok lub funkcja)?
4. **Konto czy urządzenie:** po zalogowaniu wygląd z konta zastępuje lokalny (tak jest teraz). Czy tak ma zostać?
5. **Autozapis czy przycisk:** światło zapisuje się samo po 800 ms, a udostępnianie przyciskiem. Czy tak ma zostać?
6. **Właściciel na własnym linku:** teraz widzi podgląd taki jak goście. Czy wolisz od razu tryb edycji?
7. **Gospodarz (Lucky) u gościa:** teraz wyłączony i nie zapisywany. Czy właściciel ma móc go „zostawić włączonego” dla gości (dodatkowy model do pobrania na telefonie)?
8. **Pozostałe:** zastrzeżone nazwy (np. `admin`, `threestyle`), moderacja nazw i zmiana nazwy (stary link przestaje działać).

## Ręczne uruchomienie migracji (najpierw projekt testowy lub branch, potem produkcja)

PowerShell w katalogu projektu, tak jak w `docs/supabase-accounts-media-2026-10-05.md`. Polecenia uruchamiaj kolejno, a hasło bazy wpisuj tylko w terminalu.

```powershell
cd C:\ThreeStyle.ai
git fetch origin
git switch claude/rooms-stage-1
npm.cmd ci
npm.cmd run test:accounts

npm.cmd run supabase -- migration list --linked --project-ref dqefgvjzgpfuartuydmv
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/verify.sql
npm.cmd run supabase -- db push --linked --project-ref dqefgvjzgpfuartuydmv --dry-run --skip-vault
# Dry-run powinien wskazać wyłącznie 20261105090000_account_rooms.sql
npm.cmd run supabase -- db push --linked --project-ref dqefgvjzgpfuartuydmv --skip-vault
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/rooms-verify.sql
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/rooms-rls-smoke.sql
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/account-rls-smoke.sql
npm.cmd run supabase -- db advisors --linked --project-ref dqefgvjzgpfuartuydmv --type all --level warn
npm.cmd run supabase -- migration list --linked --project-ref dqefgvjzgpfuartuydmv
npm.cmd run supabase -- gen types typescript --linked --project-ref dqefgvjzgpfuartuydmv --schema public | Out-File -Encoding utf8 src/lib/supabase/database.generated.ts
```

Oczekiwane w `rooms-verify.sql`:

- `rooms_rls = true`
- `creator_media_public = false`
- `foreign_creator_media_policies = 0`
- `anon_can_read_rooms = true`
- `anon_can_update_rooms = false`
- `account_can_insert_room = false`
- `account_can_delete_room = false`
- `can_change_room_owner = false`
- `owner_can_update_layout = true`
- `visibility_default` zawiera `private`
- `room_trigger_callable = false`

Smoke kończy się komunikatem `ThreeStyle rooms/RLS smoke PASS; fixtures rolled back`.

Po migracji zrób próbę przez API na dwóch kontach testowych i w oknie incognito:

1. Konto A ustawia nazwę i publiczny pokój.
2. Okno bez logowania otwiera `/pokoj/<nazwa>` i widzi ten sam nastrój.
3. Konto B nie może zmienić pokoju A.
4. Konto A ustawia prywatny i link przestaje działać.

Wycofanie w razie potrzeby to nowa migracja: `drop trigger threestyle_profile_room_created on public.profiles; drop function threestyle_private.create_account_room(); drop table public.rooms;`. Nie edytuj już zastosowanej migracji.
