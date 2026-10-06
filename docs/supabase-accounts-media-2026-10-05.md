# ThreeStyle — baza kont i prywatna biblioteka

Root `C:\ThreeStyle.ai`, branch `feat/event-room-arena`, baza `a28ddc8cf00591cf960948079fcef34b5ca362ff`. Projekt wskazany przez właściciela: `dqefgvjzgpfuartuydmv`, URL `https://dqefgvjzgpfuartuydmv.supabase.co`. Właściciel potwierdził nowe konto/projekt Supabase, więc jest to pierwsza integracja.

## Status

Przygotowana lokalna migracja, typy, klient przeglądarkowy i adapter biblioteki. Dotychczasowy Creator Room nadal używa plików sesyjnych; ten pakiet nie zmienia HUD-u, sceny ani istniejącego uploadu. Nie ma jeszcze formularza prawdziwego logowania ani transferu plików do chmury. Poprzednie zmiany lobby/windy i zmiany właściciela pozostają oddzielne.

Po logowaniu potwierdzono `ndoemo03@gmail.com`, projekt **ThreeStyle**, region `eu-west-1`, status `ACTIVE_HEALTHY`, PostgreSQL `17.11.0.002`. Repozytorium jest połączone z projektem przez `supabase link`. Zdalny preflight potwierdził: 0 kont, brak obu tabel biblioteki, schematu wewnętrznego, bucketu oraz wcześniejszych polityk Storage.

**Migracja zastosowana w chmurze 2026-10-05.** Logowanie do osobnego magazynu CLI potwierdziło ndoemo03, a dry-run wskazał wyłącznie `20261005091247_accounts_and_private_media.sql`. `db push` zakończył się poprawnie; historia lokalna i zdalna wskazują tę samą migrację. Weryfikacja zdalna potwierdziła RLS obu tabel, prywatny bucket 50 MiB, brak dostępu gościa oraz zakaz zmiany właściciela/rozmiaru i wywołania wewnętrznych funkcji.

Zdalny skrypt `account-rls-smoke.sql` zakończył się bez błędów: dwa tymczasowe konta, izolacja odczytu/edycji/usuwania, odmowa obcej rezerwacji, blokada `ready` przed uploadem i wycofanie wszystkich danych próbnych. Doradcy Supabase (`all`, poziom `warn`) nie zgłosili problemów. Rzeczywisty klient HTTP z kluczem publishable otrzymał `42501` przy anonimowym odczycie obu tabel. To potwierdza odmowę dostępu gościa przez API; logowanie użytkownika przez GoTrue i transfer bajtów Storage pozostają do sprawdzenia przy integracji UI.

Lokalne `.env.local` ma adres projektu i klucz publishable; pozostałe zmienne zachowano. Klucze zarządzania pozostają w prywatnym magazynie CLI poza repozytorium. Wygenerowano `src/lib/supabase/database.generated.ts` z rzeczywistego schematu; `database.types.ts` zachowuje węższe typy dozwolonych zapisów konta i wartości CHECK. Polecenia DB uruchamiać kolejno, ponieważ inicjalizują tę samą tymczasową rolę.

Serwer Codex MCP `supabase` został dodany globalnie ze wskazanym `project_ref` i zestawem funkcji. Próba OAuth kończy się `error decoding response body`. Osobny odczyt metadanych wykrył niepoprawny transport chunked dla odpowiedzi nieskompresowanej; odpowiedź gzip została poprawnie odczytana. Override nagłówka w Codex nie usunął błędu. To nie jest potwierdzone logowanie MCP. Po autoryzacji/ponownym uruchomieniu aplikacji należy sprawdzić dostępność narzędzi tego serwera.

## Co oznacza „dysk użytkownika”

Przyjęty model: prywatna biblioteka w chmurze przypisana do konta. Oryginał na telefonie/komputerze pozostaje na urządzeniu; upload tworzy kopię w Supabase Storage. Logowanie na innym urządzeniu daje dostęp do tej samej biblioteki. Odtwarzanie może pobierać dane strumieniowo; nie wymaga pobrania całego filmu przed startem. Tryb wyłącznie lokalny i pobieranie offline są osobnymi funkcjami.

Pliki binarne nie trafiają do tabel Postgres ani do `public/media` na Vercel. Tabela zawiera właściciela, opis i ścieżkę do magazynu. Obecne `/api/media` i publiczne pliki demo nadal stanowią osobną bibliotekę demonstracyjną.

## Gotowy schemat i dostępy

| Element | Zawartość / uprawnienia |
| --- | --- |
| `auth.users` | Supabase Auth prowadzi konta, e-mail, hasła i sesje. Nie kopiujemy haseł ani e-maili do profili. |
| `public.profiles` | ID konta, opcjonalna nazwa i handle, daty. Profil powstaje po rejestracji; istniejące konta są uzupełniane. Użytkownik czyta i zmienia własne pola opisowe. |
| `public.media_assets` | ID i właściciel pliku, audio/video, tytuł, nazwa oryginału, typ, rozmiar, długość, stan uploadu oraz wygenerowana ścieżka. |
| `creator-media` | Prywatny bucket; audio/video, początkowo 50 MiB na plik. |
| `threestyle_private` | Nieeksponowane funkcje triggerów; zwykłe konta i goście nie mają dostępu do schematu ani prawa wywołania. |

RLS sprawdza właściciela poprzez `auth.uid()`. Gość nie może czytać profili/biblioteki ani uploadować do tego bucketu. Użytkownik nie może zmieniać właściciela, identyfikatora ścieżki ani zadeklarowanego rozmiaru. Metadane użytkownika z formularza/Auth nie nadają uprawnień. Nie dodajemy ról administratora ani publicznego udostępniania utworów.

Ścieżka magazynu: `<user_uuid>/<media_uuid>/original.<extension>`. Polskie znaki zostają w nazwie wyświetlanej; klucz Storage jest stabilny i zawiera tylko UUID oraz dozwolone rozszerzenie. Normalizacja typu na podstawie rozszerzenia nie jest analizą zawartości pliku ani gwarancją obsługi kodeka w przeglądarce.

## Pętla uploadu i usuwania

1. Zalogowane konto rezerwuje wpis `uploading` i dostaje ścieżkę wygenerowaną w bazie.
2. Przeglądarka przesyła plik bezpośrednio do Storage, z tokenem konta, `upsert: false` i typem z kontraktu. **Transfer nie jest jeszcze zaimplementowany.** Dla większych plików planujemy TUS z postępem, anulowaniem i wznowieniem.
3. `finalize()` zmienia wpis na `ready` dopiero, gdy Storage posiada plik o zadeklarowanej liczbie bajtów. Nieudana lub niepełna operacja pozostaje do ponowienia.
4. HUD pobiera bibliotekę `ready`, uzyskuje czasowy link do wybranego pliku i podaje go istniejącemu odtwarzaczowi. Link jest ważny godzinę; przyszły hook odtwarzania musi odnawiać go przed kolejnym użyciem po wygaśnięciu.
5. Usunięcie: `deleting` → Storage API usuwa plik → baza usuwa wpis. Błąd nie jest ogłaszany jako sukces. `listPending()` zwraca ostatnie 50 operacji do odzyskiwania; UI odzyskiwania pozostaje do podłączenia.

SQL nie usuwa ani nie modyfikuje `storage.objects`: kasowanie samych metadanych może pozostawić płatne bajty w magazynie. Reguły Storage wymagają rezerwacji dokładnej ścieżki i nie pozwalają nadpisywać plików. Trigger sprawdzający istnienie obiektu jest prywatnym `SECURITY DEFINER` z pustym `search_path` i kontrolą `auth.uid()`; rozdziela sprawdzanie stanu od RLS i unika zapętlenia polityk. Usuwanie całego konta wymaga wcześniejszego opróżnienia jego biblioteki; ścieżka administracyjnego usuwania kont nie jest częścią tego pakietu.

## Aktywacja projektu

Jednorazowe logowanie do **nowego konta** z terminala projektu:

```powershell
cd C:\ThreeStyle.ai
npm.cmd run supabase -- login --name threestyle --no-browser
```

CLI wyświetli link do przeglądarki oraz `Enter your verification code:`. Otworzyć nowy link i wybrać konto **ndoemo03**, mające projekt ThreeStyle. Kod wpisuje się w terminalu; nie przesyła się go w czacie. Skrypt wybiera domyślnie ręczny tryb. Nazwa `threestyle` jest nazwą tokena. Skrypt projektu ustawia tylko dla swojego procesu `SUPABASE_HOME` na `~/.supabase-threestyle` i `SUPABASE_NO_KEYRING=1`, używając standardowego prywatnego pliku CLI `access-token`. Poświadczenia są poza repozytorium i wdrożeniem; nie trafiają do `.env.local` ani klienta. Dalsze polecenia korzystają z tego magazynu przez zmienną środowiskową procesu. Wspólne poświadczenia CLI innych projektów pozostają niezależne. Na Windows skrypt uruchamia natywny program bez pośredniego wrappera Node, żeby Ctrl+C kończyło właściwy proces. Zaufane publiczne certyfikaty systemowe są podawane wyłącznie na czas działania; weryfikacja TLS pozostaje włączona.

Po zakończeniu autoryzacji:

```powershell
npm.cmd run supabase -- projects list --output-format json
npm.cmd run supabase -- link --project-ref dqefgvjzgpfuartuydmv
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/preflight.sql
```

Preflight musi potwierdzić brak kolizji `profiles`, `media_assets`, `threestyle_private` i `creator-media`. Należy przejrzeć także istniejące polityki Storage; polityki permissive dodają się logicznym OR, więc wcześniejsza szeroka polityka mogłaby omijać ograniczenia nowej biblioteki. Nie usuwamy takich polityk automatycznie ani nie nadpisujemy istniejących tabel.

Normalna instalacja przez migracje, po poprawnym preflight:

```powershell
npm.cmd run supabase -- db push --linked --project-ref dqefgvjzgpfuartuydmv --dry-run --skip-vault
npm.cmd run supabase -- db push --linked --project-ref dqefgvjzgpfuartuydmv --skip-vault
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/verify.sql
npm.cmd run supabase -- db query --linked --project-ref dqefgvjzgpfuartuydmv --file supabase/account-rls-smoke.sql
npm.cmd run supabase -- db advisors --linked --project-ref dqefgvjzgpfuartuydmv --type all --level warn
npm.cmd run supabase -- migration list --linked --project-ref dqefgvjzgpfuartuydmv
```

Jeżeli CLI prosi o hasło bazy, wpisuje się je wyłącznie w terminalu, bez flagi w historii poleceń. Alternatywnie autoryzowany MCP może zastosować migrację. Ręczne uruchomienie pliku SQL w SQL Editor nie zapisuje historii migracji CLI — przed późniejszym `db push` trzeba sprawdzić schemat i zsynchronizować historię, zamiast uruchamiać tworzenie tabel ponownie.

Plik do zastosowania: `supabase/migrations/20261005091247_accounts_and_private_media.sql`. Weryfikacja powinna wykazać włączone RLS na obu tabelach, prywatny bucket, brak SELECT biblioteki dla `anon`, brak UPDATE właściciela/rozmiaru i brak EXECUTE wewnętrznych funkcji dla użytkowników.

## Konfiguracja aplikacji i Auth

Lokalne `.env.local` zostało skonfigurowane: adres projektu oraz **publishable key**. Bezpieczny szablon nazw jest w `docs/supabase.env.example`. Wartości trzeba potem ustawić osobno na Vercel i ponownie zbudować aplikację. Nie nadpisywać istniejących zmiennych API. Kod przeglądarki nie potrzebuje `service_role`, klucza `sb_secret_...`, hasła bazy ani tokena zarządzania Supabase.

W panelu Supabase przed integracją strony ustawić właściwy Site URL oraz dokładne callbacki lokalne (`http://localhost:3001/auth/callback`, `http://127.0.0.1:3001/auth/callback`) i dla wybranego publicznego aliasu Vercel. `supabase/config.toml` opisuje stos lokalny; samo zapisanie go nie zmienia chmurowych ustawień Auth. Dla kont włączyć potwierdzenie e-maila i pozostawić wyłączone logowania anonimowe. Produkcyjne wysyłanie wiadomości wymaga konfiguracji SMTP przed otwartą rejestracją.

Przy następnej integracji: formularz logowania/rejestracji → SSR cookies i odświeżanie sesji → callback → wejście do lobby dopiero po potwierdzeniu sesji. Na serwerze tożsamość weryfikujemy przez `getClaims()` lub `getUser()`, nie na podstawie samego `getSession()`. Nie ma jeszcze routingu auth ani proxy w tym pakiecie.

## Limity i kolejny etap

Biblioteka konta startuje z limitem 50 MiB, zgodnym z typowym projektem Free. Kontrakt metadanych dopuszcza do 200 MiB jako górną granicę przyszłego pakietu; zwiększenie rzeczywistego uploadu wymaga odpowiedniego planu, globalnego limitu Storage, limitu bucketu i limitu klienta. Sesyjny upload Creator Roomu pozostaje przy wcześniejszym 200 MiB.

Podłączenie HUD-u obejmie: jawny wybór biblioteki konta, TUS, postęp/anulowanie, ponowienie przerwanych operacji, podpisane URL-e i obsługę wygasania. Potrzebny będzie też limit łącznej biblioteki na konto oraz okresowe sprzątanie niedokończonych uploadów przez Storage API. To nie jest jeszcze synchronizacja offline ani automatyczne przenoszenie wcześniejszych sesyjnych plików.

## Weryfikacja lokalna

`npm.cmd run test:accounts`: 21/21 PASS. Testy uruchamiają PostgreSQL przez PGlite i minimalne tabele usługowe Auth/Storage: rejestracja/backfill, odmowa gościom, izolacja kont, niezmienne ścieżki, potwierdzanie rzeczywistego rozmiaru, zakaz nadpisania i kolejność usuwania. Testy adaptera obejmują nieudane usuwanie/ukończenie oraz brak fałszywego sukcesu. Dodatkowo wykonano lokalnie dokładny skrypt zdalnej weryfikacji RLS: tworzy dwie tożsamości bez e-maili, sprawdza izolację i wycofuje wszystkie dane w podtransakcji. Nie wykonuje operacji na plikach Storage ani nie testuje GoTrue HTTP. TypeScript i scoped ESLint PASS. Build produkcyjny PASS po jednorazowym ustawieniu `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`; pierwsza próba zatrzymała się przy pobieraniu Google Fonts z powodu lokalnego zaufania TLS. Nie zmieniano konfiguracji TLS projektu ani globalnych ustawień komputera.

PGlite nie uruchamia GoTrue, Storage HTTP, TUS ani prawdziwego transferu bajtów. Po aktywacji wymagana jest próba dwóch kont przez API, upload i odtwarzanie oraz potwierdzenie, że drugie konto nie ma dostępu. Brak takiej próby nie jest runtime PASS integracji chmurowej.

## Dokumentacja sprawdzona przy przygotowaniu

- [Supabase Auth — dane użytkownika](https://supabase.com/docs/guides/auth/managing-user-data)
- [Storage — reguły dostępu](https://supabase.com/docs/guides/storage/security/access-control)
- [Storage — limity plików](https://supabase.com/docs/guides/storage/uploads/file-limits)
- [Upload standardowy i zalecenie TUS ponad 6 MB](https://supabase.com/docs/guides/storage/uploads/standard-uploads)
- [Storage — metadane a usuwanie bajtów](https://supabase.com/docs/guides/storage/schema/design)
- [Next.js — klient i sesja SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
