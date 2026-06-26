# ThreeStyle - kontrakt UX / HUD / Room / Backend

Status: roboczy kontrakt v0.1  
Cel: zamrozic fundamenty produktu przed kolejnymi zmianami w kodzie.  
Zasada pracy: EXPLO -> FIND BUG -> FIX -> VERIFY -> SHIP.

## 1. Glowna decyzja produktu

ThreeStyle nie jest klasyczna platforma muzyczna. To 3D discovery space dla utworow AI-assisted / generated.

Podstawowa petla MVP:

1. Uzytkownik wchodzi na landing.
2. Loguje sie albo kontynuuje jako ograniczony visitor.
3. Trafia do Creator Room.
4. Laptop otwiera HUD jako dodatkowy panel na tle pokoju.
5. Uzytkownik slucha, eksploruje, uploaduje albo glosuje.
6. Ekran w pokoju pokazuje stan aktualnej sesji.
7. Tygodniowy ranking porzadkuje discovery.

## 2. Beton - rzeczy zamrozone

Tych decyzji nie zmieniamy bez osobnej decyzji projektowej:

- Obecny uklad Creator Room zostaje.
- Ekran pokojowy zostaje w obecnym miejscu.
- Sofa, biurko i glowne meble nie sa teraz przestawiane.
- HUD nie zastapi pokoju i nie robi nowej sceny.
- HUD jest dodatkowa warstwa na tle pokoju.
- Laptop / ekran urzadzenia w pokoju jest glownym triggerem HUD.
- Backend nie zna szczegolow sceny 3D.
- 3D room jest prezentacja, nie zrodlem prawdy.
- Nie robimy Gaussian Splatting.
- Nie robimy pelnej spolecznosciowki.
- Nie robimy komentarzy, DM, followow, ekip ani multiplayer rooms w MVP.
- Nie ma kupowanych glosow ani pay-to-win voting.
- Najpierw dziala MVP: upload -> listen -> vote -> weekly ranking.

## 3. Co mozna zmieniac / rozszerzac

Mozemy iterowac:

- wyglad HUD,
- nazwy zakladek/paneli,
- mikroanimacje HUD,
- kolejnosc paneli,
- copy i etykiety,
- stopien przezroczystosci overlayu,
- sposob wizualizacji glosu na ekranie pokojowym,
- mini-player i discovery cards,
- upload flow,
- backendowe szczegoly API, o ile nie lamia glownej petli.

Nie ruszamy przy tym layoutu pokoju.

## 4. Liczba glownych powierzchni produktu

Na MVP projekt ma 6 glownych powierzchni:

1. Landing / Bramka
2. Auth / Konto
3. Creator Room
4. HUD Overlay
5. Upload / Track Manager
6. Discovery / Voting / Ranking

Nie sa to wszystko osobne strony webowe. Czesc z nich zyje jako tryby HUD.

## 5. Landing / Bramka

Cel: wyjasnic czym jest ThreeStyle i wpuscic uzytkownika do roomu.

Funkcje:

- nazwa: ThreeStyle / BLOK TRZECH PIETER,
- krotki manifest: przestrzen dla muzyki generowanej / AI-assisted,
- CTA: Wejdz do pokoju,
- CTA: Zaloguj sie,
- opcjonalnie tryb visitor,
- informacja: sluchawki zalecane,
- lekki preload 3D dopiero po decyzji wejscia.

Nie budujemy tu pelnej marketingowej strony.

Beton:

- Landing ma byc szybki.
- Nie laduje calej sceny 3D przed decyzja usera.
- Nie pokazuje wielkiego dashboardu.

## 6. Auth / Konto

MVP auth:

- Supabase Auth.
- Email magic link lub email/password.
- Profil minimalny:
  - display_name,
  - creator_name,
  - avatar_url opcjonalnie,
  - creator_slug opcjonalnie.

Konto jest wymagane do:

- uploadu,
- publikacji tracka,
- glosowania,
- zapisu rankingu usera.

Visitor moze:

- wejsc do pokoju,
- sluchac publicznych aktywnych trackow,
- ogladac ranking.

Visitor nie moze:

- uploadowac,
- glosowac,
- publikowac.

## 7. Creator Room

Cel: immersyjny kontekst eksploracji, nie osobny edytor.

Room pokazuje:

- ekran pokojowy,
- laptop / interaktywny trigger HUD,
- aktualny stan muzyki,
- subtelne reakcje audio,
- ranking/discovery tylko jako nastrojowa prezentacja.

Room nie obsluguje:

- formularzy,
- walidacji uploadu,
- zapisu glosow,
- auth,
- logiki rankingu.

Te rzeczy sa w HUD/backendzie.

## 8. Ekran pokojowy - stany

Ekran w pokoju ma 4 podstawowe stany:

1. Idle
   - THR3STYLE branding.
   - Brak aktywnej akcji.

2. Now Playing
   - tytul tracka,
   - creator name,
   - cover / waveform / video,
   - status play/pause.

3. Discovery
   - aktualny track w kolejce,
   - badge: odkrywaj,
   - kontekst glosowania.

4. Weekly Vote / Ranking
   - informacja o glosie tygodniowym,
   - top 3 albo aktualna pozycja tracka,
   - subtelny efekt po glosie.

Ekran nie jest formularzem uploadu.

## 9. HUD Overlay - decyzja kierunkowa

HUD jest dodatkowym panelem na tle pokoju.

Wymagania:

- header: BLOK TRZECH PIETER,
- glass / dark premium,
- polprzezroczysty,
- czytelny na tle roomu,
- nie skaluje desktopu do malego mobile UI,
- desktop i mobile maja osobne layouty,
- panel moze zaslonic czesc sceny, ale nie odcina usera od pokoju.

HUD ma byc praktycznym narzedziem, nie ozdobnikiem.

## 10. HUD - tryby / panele MVP

MVP HUD ma 5 glownych trybow:

1. Odkrywaj
2. Teraz gra
3. Upload
4. Glosuj
5. Ranking

Opcjonalny panel pozniej:

- Biblioteka / Moje tracki
- Profil
- Ustawienia pokoju

### 10.1 Odkrywaj

Cel: przyjemne przegladanie trackow.

Elementy:

- karta aktualnego tracka,
- cover / waveform,
- tagi,
- play,
- next / skip jako akcja pozniej,
- przejscie do glosowania.

### 10.2 Teraz gra

Cel: kontrola playbacku.

Elementy:

- tytul,
- creator,
- play/pause,
- progress,
- mini waveform,
- typ media: audio / video / external,
- mirror na ekran pokojowy.

### 10.3 Upload

Cel: dodanie tracka bez wychodzenia z klimatu roomu.

Elementy:

- audio file upload,
- zewnetrzny link: Suno / YouTube / SoundCloud style,
- title,
- creator name,
- description,
- optional cover,
- optional video,
- status: draft / active / archived,
- licznik aktywnych slotow.

Upload nie powinien byc pierwszym widokiem dla sluchacza.

### 10.4 Glosuj

Cel: jeden wazny tygodniowy glos.

Elementy:

- informacja ile glosow tygodniowych zostalo,
- aktywny track,
- przycisk oddania glosu,
- potwierdzenie,
- brak kupowania glosow,
- brak agresywnego gamblowania.

### 10.5 Ranking

Cel: szybkie sprawdzenie co wygrywa w tygodniu.

Elementy:

- top 3,
- pozycja aktualnego tracka,
- liczba glosow,
- czas do resetu tygodnia,
- link/akcja: odkrywaj podobne.

## 11. Responsywnosc HUD

Desktop:

- panel boczny lub centralno-prawy,
- max szerokosc czytelna,
- room nadal widoczny,
- wiecej informacji naraz.

Mobile portrait:

- prawie fullscreen sheet,
- jeden tryb na ekran,
- duze tap targety,
- mini-player na dole,
- bez drobnych list i upchanych metryk.

Mobile landscape:

- kompaktowy panel boczny albo dolny sheet,
- room i ekran pokojowy maja zostac widoczne,
- ograniczona liczba kart,
- brak rozciagnietego desktop UI.

Beton:

- Nie robimy jednego CSS, ktory tylko sciska desktop HUD do mobile.

## 12. Backend - minimalny kontrakt

Supabase:

- Auth,
- Postgres,
- Storage.

Minimalne tabele:

- profiles,
- tracks,
- media_assets,
- votes,
- weekly_rankings.

Minimalne statusy tracka:

- draft,
- active,
- archived.

Minimalne media kinds:

- audio,
- cover,
- video,
- external_link.

## 13. API - minimalny kontrakt

Potrzebne endpointy lub akcje:

- get active tracks,
- get my tracks,
- create draft track,
- update draft track,
- attach media asset,
- publish track,
- archive track,
- vote for track,
- get weekly ranking.

Backend zwraca dane produktu. Frontend decyduje jak pokazac je w HUD/room.

## 14. Event rooms / przejscia

Na teraz:

- Creator Room jest glownym pokojem MVP.
- Hub / korytarz / windy zostaja jako rama eksploracji.
- Event Room moze byc pozniejszym etapem, nie MVP.

Docelowo przejscia:

1. Landing -> Auth / Visitor
2. Auth -> Creator Room
3. Creator Room -> HUD overlay
4. Creator Room -> Hub / korytarz
5. Hub -> Event Room / Weekly Ranking Room

MVP moze symulowac Event Room przez tryb HUD + ekran pokojowy, bez budowania nowej sceny.

## 15. Funkcje MVP

MVP musi miec:

- wejscie do roomu,
- otwarcie HUD z laptopa,
- publiczna lista trackow,
- playback audio,
- fallback cover/branding gdy brak video,
- upload draftu,
- publikacje tracka,
- tygodniowy glos,
- ranking tygodnia,
- mobile usable HUD.

## 16. Funkcje pozniej

Nie budowac teraz:

- komentarzy,
- followow,
- DM,
- live multiplayer,
- awatarow userow,
- ekonomii tokenowej,
- platnych glosow,
- AI coachingu,
- rozbudowanych event rooms,
- social feedu,
- creator marketplace.

## 17. Definicja gotowosci HUD v1

HUD v1 jest gotowy, gdy:

- otwiera sie z laptopa,
- ma 5 trybow MVP,
- nie psuje widocznosci pokoju,
- dziala na desktop,
- dziala na mobile portrait,
- dziala na mobile landscape,
- playback jest stabilny,
- upload i vote maja jasny feedback,
- ekran pokojowy mirroruje stan HUD,
- build przechodzi,
- flow da sie przejsc bez tlumaczenia userowi co klikac.

## 18. Najblizszy krok

Najpierw zatwierdzamy ten kontrakt.

Potem kolejny PR powinien dotyczyc tylko:

- uporzadkowania HUD,
- wydzielenia store player/discovery,
- zachowania obecnego room layoutu,
- tymczasowego adaptera na obecne /api/media.

Bez Supabase w pierwszym PR HUD.

