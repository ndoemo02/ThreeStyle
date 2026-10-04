# Creator Room — mobile i panel światła, 2026-10-04

Lokalny checkpoint oparty na `03441c419623887ed07c6184d3cfdc9bb242d01d`, branch `feat/event-room-arena`, root `C:\ThreeStyle.ai`. Pakiet obejmuje Creator Room, HUD i odtwarzanie mediów. Arena, Stage 7, collidery i upper lounge pozostają poza zakresem. Zastane zmiany obrazów referencyjnych i testowe GLB nie należą do pakietu.

## Co działa

- HUD ma strony **Media / Światło** i wspólny, stale zamontowany odtwarzacz. Zmiana zakładki, zamknięcie i ponowne otwarcie nie przerywają odtwarzania. Ustawienia pozostają w bieżącej sesji strony, bez zapisu między przeładowaniami.
- Presety **Ciepło / Skupienie / Noc**, jasność pokoju, moc LED, kolor LED/kabiny, jasność kabiny, reakcja na muzykę, siła reakcji i reset. Noc wygasza główne lampy. Ekran i jego delikatny fill pozostają aktywne; LED oraz kabina mają osobne suwaki.
- Listwy sufitowe są widoczne wewnątrz pokoju. Jedna scalona geometria, cztery niewielkie płaszczyzny poświaty i jeden fill zastępują kosztowne mnożenie lamp. Rytm odczytuje istniejący analyser Web Audio, bez aktualizowania React/Zustand w każdej klatce. Brak dodatkowych cieni i Bloom na mobile.
- Tylko Creator Room używa mobilnych wariantów tabletu, mikrofonu i organizera oraz mniejszych map parametrów materiałów. Oryginalne modele i tekstury zostają. Odwracalne generowanie: `npm run assets:creator-room`.
- Szkło organizera zachowuje uproszczoną przezroczystość bez transmission. Usunięto dodatkowy przebieg sceny powodujący pętlę framebuffer/texture. Materiały są klonowane lokalnie; geometrie i tekstury współdzielone przez loader nie są zwalniane przez pokój.
- Adaptacyjna ostrość mobile startuje od DPR 1, z limitami 0.75 / 1 / 1.25 / 1.5. Decyzje po rozgrzaniu i trwałych oknach pomiaru, z odstępami między zmianami. Podczas ruchu limit 1.25. Po wyjściu wycofuje ustawienia Creator Roomu.
- Ekran audio ma większe napisy i canvas 1024×576. Tekst jest buforowany, wizualizacja ograniczona do 20 Hz na mobile / 30 Hz na desktop i pomijana poza kadrem. Wideo pozostaje natywnym VideoTexture; nie powstaje nieużywana tekstura wideo podczas odtwarzania audio.
- Mała poprawka blokuje ponowne przechwycenie kursora przez końcowy click tabletu po otwarciu HUD-u. Dotyczy wyłącznie Creator Roomu.

## Pomiary i walidacja

Pomiary WebGL wykonano w przeglądarce komputerowej z emulacją telefonu; nie są pomiarem FPS, zużycia baterii ani temperatury fizycznego telefonu.

| Miara | Przed | Po |
| --- | ---: | ---: |
| Załadowane trójkąty sceny mobile, z windą | 353 664 | 108 445 |
| Lampy, z windą | 24 | 11 |
| Wywołania rysowania przy tej samej kamerze, wraz z postprocessingiem | 223 | 106 |
| Rysowane trójkąty przy tej samej kamerze, wraz z postprocessingiem | 441 999 | 68 846 |
| Błędy GL w próbce 80 klatek | 80 | 0 |

Kamera porównania: `[0, 2.05, 2.4]`, skierowana na `[6, 1.5155, -2]`, viewport 844×390, DPR 1, zapauzowane wideo. Załadowana geometria spadła o około 69%; liczba wywołań rysowania o około 52%. Nie przekłada się to automatycznie na taki sam wzrost FPS.

Potwierdzono automatyczny wzrost DPR do 1.5 oraz spadek do 1 przy 12-krotnym ograniczeniu CPU w DevTools. Szacunek RGBA z mipmapami dla rezydujących tekstur po zmianie wynosi około 166 MiB — to model kosztu tekstur, nie pomiar rzeczywistej VRAM.

- Testy Node: **22/22 PASS** — światło, jakość, media i polityka interakcji.
- ESLint wszystkich zmienionych plików TS/TSX: **PASS**, zero ostrzeżeń.
- Next.js production build, z TypeScript: **PASS**. Istniejące Google Fonts wymagały dostępu sieciowego i systemowych certyfikatów; konfiguracji TLS projektu nie osłabiono.
- Smoke lokalnego builda produkcyjnego: odtwarzanie audio, ekran 1024×576 aktualizujący teksturę, tryb Noc, mobilne modele i HUD **PASS**. Konsola: zero błędów, jedno istniejące ostrzeżenie Three.Clock.
- Upload syntetycznego WAV, przełączanie zakładek podczas odtwarzania, presety, kolor, reset, zerowanie kabiny i wyłączenie reakcji: **PASS**. W Nocy ambient wygaszony; LED pulsuje, po wyłączeniu reakcji wraca do stałej wartości.
- Ekran audio: wersja tekstury rośnie w kadrze, pozostaje stała poza kadrem i ponownie rośnie po powrocie: **PASS**.
- HUD 844×390 i 390×844 mieści się w viewport, bez poziomego przewijania. Środek panelu przewija się na małej wysokości, odtwarzacz zostaje dostępny.
- Desktop: kliknięcie tabletu otwiera HUD i zwalnia kursor **3/3**. E zwalnia pointer lock bez otwierania panelu, gdy brak celu interakcji. Wyjście windą do lobby i ustalenie DPR 1: **PASS**.

## Artefakty i odbiór

Podgląd lokalnego builda produkcyjnego: `http://127.0.0.1:3002/b3p`. Development: `http://127.0.0.1:3001/b3p`. Podane adresy dotyczą lokalnego podglądu. Walidacja w tym raporcie poprzedza publikację pakietu w repozytorium.

Dowody lokalne: `output/creator-room/2026-10-04/mobile-lighting-runtime-results.json`, `mobile-production-results.json`, `mobile-production-probe.js` oraz screenshoty `lighting-desktop-night.png`, `lighting-desktop-warm.png`, `mobile-portrait-lighting.png`, `mobile-production-lighting.png`.

Do odbioru na fizycznych urządzeniach: Redmi Note 14 Pro+ oraz słabszy Android/iPhone, 5–10 minut audio/wideo z LED, orientacja pion/poziom, seek/głośność, powrót z tła, ocena ostrości i temperatury. Uprawnienia kamery nie były ponownie sprawdzane w tym pakiecie. Ewentualne dalsze efekty świetlne dobierać po tych próbach; obecna konstrukcja nie dodaje lamp wraz z siłą pulsowania.
