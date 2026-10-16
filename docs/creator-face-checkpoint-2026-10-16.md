# ThreeStyle — twarz w kabinie Creator Roomu, 2026-10-16

Baza `9505eed16b75986fc704a16579b24a32bffa3422`, branch `codex/entry-lobby-transition`, root `C:\ThreeStyle.ai`. Właściciel poprosił o przywrócenie istniejącej animowanej twarzy. Pakiet jest zapisany lokalnie i opublikowany jako preview; nadal bez nowego commitu/pusha.

## Podgląd

https://three-style-pu8t90iym-freeflow-build.vercel.app/b3p

Vercel `dpl_A2YY7WpDXFgSoZo7YpvxmqKYSUXB`, READY, zawiera korektę buforów mimiki opisaną niżej; build produkcyjny i TypeScript PASS. Snapshot katalogu roboczego, pakiet twarzy jeszcze bez commitu/pusha. Nie promowano aliasu produkcyjnego ani main. Landing i logowanie pozostają na `/`; `/b3p` to bezpośrednie demo Creator Roomu. Preview nadal nie ma osobnej konfiguracji GEMINI_API_KEY (coach poza zakresem). Wcześniejszy podgląd `three-style-bj5x9xu3u` zawierał zgłoszony błąd i został zastąpiony tym adresem.

Dwa konkretne callbacki Auth nowego preview dopisane i zweryfikowane w Supabase z zachowaniem wcześniejszej listy i Site URL. Nie zmieniono kont, danych ani schematu bazy.

## Obsługa

W Creator Roomie: Media deck → Światło → **Twarz w kabinie**. Domyślnie wyłączona, ustawienie tylko dla bieżącej sesji. Włączenie ładuje model i dekoder dopiero na żądanie. Twarz jest widoczna przez szybę kabiny, obok mikrofonu. Odtwarzane audio/wideo porusza ustami, powiekami i brwiami; pauza wraca do neutralnej pozycji. Jest to reakcja na energię pasm audio, nie synchronizacja fonemów ani rozpoznawanie słów.

Nie uruchamia mikrofonu ani kamery. Korzysta z istniejącego analizatora odtwarzacza HUD, bez dodatkowego AudioContext, świateł i postprocessingu. Ograniczony ruch zmniejsza reakcję ust i wyłącza pulsowanie oczu/brwi. Funkcja aktualizuje mimikę maksymalnie 30 Hz, w reduced motion 15 Hz; poza kadrem, w ukrytej karcie i przy dużej odległości przerywa animację. W lobby nie jest montowana i jej przełącznik jest nieaktywny. Po powrocie do pokoju przywraca świadomie włączoną opcję.

## Model i koszt

- Oryginalny `public/models/optimized/facecap.glb` nie został zmieniony: 332 808 B, 4 meshe, 8042 trójkąty, atlas KTX2 1024×1024, 52 kształty mimiki.
- Własna kopia geometrii używa tylko pięciu morphów: jawOpen, eyeBlink_L/R, browDown_L/R. Nie przesyła wszystkich 52 warstw morph na GPU. Zachowuje oryginalne UV i materiały, w tym strony powierzchni oczu.
- Normalizacja wysokości do 1,05 m i pozycja lokalna kabiny [1.3,2.15,-2.6]. Nie zmieniono architektury, colliderów ani kotwic nawigacji.
- Decoder Basis jest lokalny w `public/decoders/basis`; pliki pochodzą z zainstalowanego Three.js 0.183.1, README i licencja zachowane. JS 57 529 B + WASM 527 333 B, pobierane przy włączeniu. Meshopt inicjalizowany zgodnie z fabryką zainstalowanego three-stdlib. Jeden worker Basis na ładowanie, usuwany po zakończeniu.
- Każda instancja posiada własne 4 geometrie, 4 materiały i jedną teksturę atlasu. Po wyłączeniu/zmianie strefy usuwa je i zwalnia zasoby; tekstura morph jest powiązana z geometrią Three.js. Zatrzymanie w trakcie fetch abortuje żądanie; późne wyniki nie mogą przywrócić wyłączonej funkcji.
- Błąd lub timeout modelu pokazuje lokalny komunikat i Ponów wczytanie twarzy. Błąd twarzy nie przekłada się na błąd całego pokoju ani windy.

## Granice weryfikacji

Licznik `renderer.info.render` przy aktywnym postprocessingu pokazuje ostatni pass, nie koszt całej sceny — nie wolno traktować odczytu 1 draw call / 1 triangle jako kosztu pokoju/twarzy. W trakcie rozgrzewania sceny i adaptacji DPR także globalne liczniki tekstur mogą się zmieniać niezależnie od tej funkcji. Dlatego test powtórnego wyłączenia sprawdza usunięcie obiektu i konkretne zasoby należące do instancji; diagnostyka tych zwolnień istnieje wyłącznie w development.

Nie wykonano pomiaru FPS/temperatury rzeczywistego telefonu. Arena, Stage 7, upper lounge, logowanie i schema bazy nie zostały zmienione. Trwały upload nadal pozostaje osobnym etapem.

## Końcowa weryfikacja

- 80/80 testów Node PASS, w tym rzeczywisty zestaw morphów/budżet modelu, neutralna cisza, wygaszenie po pauzie, reduced motion i odrzucenie nieaktualnych wyników ładowania. TypeScript, scoped ESLint i diff check PASS; build produkcyjny na Vercel PASS.
- Playwright: mobile 844×390 (DPR urządzenia 2), portrait/reduced 390×844, desktop 1024×640 PASS. Brak pobrania modelu/dekodera przed włączeniem. Rzeczywisty upload lokalnie wygenerowanego WAV i istniejący AudioContext: usta reagują, po pauzie wszystkie pięć wag spada poniżej 0,005. Żadne żądanie getUserMedia nie wystąpiło. Zero pageerror.
- Powtórne włączenie/wyłączenie PASS: model znika ze sceny; każdy cykl zwalnia 4 geometrie, 4 materiały i 1 teksturę atlasu. Geometria głowy zwalnia też wewnętrzną teksturę morph Three.js.
- Celowy HTTP 503 modelu pozostawia działający pokój i przycisk Ponów. Retry po przywróceniu pliku PASS. Opóźnione pobranie → wyłączenie → późna odpowiedź nie przywraca modelu. Ponowne włączenie PASS.
- Rzeczywisty przejazd do lobby, usunięcie twarzy, nieaktywny przełącznik, podejście z użyciem joysticka i powrót do Creator Roomu z ponownie wczytaną twarzą PASS. Test początkowo nie podchodził ponownie do kabiny i używał ignorowanej na mobile klawiatury; poprawiono scenariusz testowy, bez zmian w windzie/nawigacji.
- Klient develop-web-game uruchomiony; stan domyślnie wyłączonej funkcji i screenshot sprawdzone. Lokalna kopia klienta czeka na gotowość sceny i przechwytuje kompozycję WebGL, bo sam odczyt bufora canvas przed gotowością dawał czarny, niemiarodajny obraz. Nie dodano tego mechanizmu do produktu.
- Screenshoty twarzy desktop/mobile/pion i HUD obejrzane. Artefakty (ignored): `output/creator-face-qa/report.json`, `report-*.json`, `lifecycle-report.json`, `node-tests.txt`, `skill/`, `*-playing.png`. Starsze pliki failure opisują wcześniejsze próby; końcowe raporty PASS są nadrzędne.

Następne kroki: ocena wyglądu i płynności przez właściciela na telefonie, a następnie commit/push na osobne polecenie. Nie utożsamiać emulacji SwiftShader z pomiarem urządzenia.

## Korekta po zgłoszeniu odłączonych oczu i zębów

Właściciel pokazał deformację podczas odtwarzania audio. Wcześniejsze testy wag i cyklu życia nie sprawdzały zgodności animowanych wierzchołków z oryginalnym GLB; neutralne zbliżenie nie ujawniało błędu.

Przyczyna potwierdzona na rzeczywistym modelu: Meshopt udostępnia różne widoki typed-array jednego ArrayBuffer. `BufferGeometry.clone()` w zainstalowanej wersji Three.js współdzieli cache kopii według bufora bazowego, przez co kolejne widoki morphów dostawały dane pozycji bazowych. Przykład: pierwsza delta jawOpen `[0,-1116,1967]` zamieniała się w `[5665,11925,11766]`. Animacja przemieszczała i powiększała głowę, pozostawiając osobne oczy/zęby na miejscu. Domyślne transformacje i klipy GLB nie były przyczyną.

`src/lib/creatorFaceGeometry.ts` kopiuje każdy atrybut z własnym kontekstem, zachowując widok, stride, normalizację oraz relatywne delty. Kopiuje od razu tylko pięć wybranych morphów, bez tymczasowego klonowania wszystkich 52. Oryginalny GLB, materiały, kotwica i budżet renderowania pozostają bez zmian; nie stosowano ręcznych offsetów oczu/zębów.

Dwa nowe testy najpierw FAIL na starej funkcji, następnie PASS: odrębne widoki wspólnego bufora oraz rzeczywisty model (każdy bazowy atrybut, wybrane pozycje/normale morphów i każdy animowany wierzchołek w pięciu pozach, w tym skrajnych). Łącznie 82/82 testy Node PASS; TypeScript i scoped ESLint PASS. Lokalna diagnostyka `qa=face-close` i `qa=face-side` służy kontroli zbliżeń i położenia czterech siatek wyłącznie w development.

Przeglądarka po korekcie: zbliżenie od przodu i profil z rzeczywistym, zapętlonym WAV 60 s, HUD zamknięty, aktywna waga ust ~0,51; oczy i zęby pozostają wewnątrz obrysu głowy. Screenshoty obejrzane, zero pageerror. Ponowny profil mobile 844×390: upload/analyser, neutralna pauza, wyłączenie, powtórny cykl i zwolnienie 4 geometrii/4 materiałów/1 atlasu PASS; brak getUserMedia. Klient develop-web-game wykonany ponownie, screenshot `skill-fixed/shot-0.png` obejrzany. Artefakty: `face-close-audio-fixed.{png,json}`, `face-side-audio-fixed.{png,json}`, `report-mobile.json`, `node-tests-fixed.txt`.

Wczesne próby automatyczne miały zatrzymanie dźwięku poza kodem aplikacji (brak wywołania jej pause). Wyłączenie usypiania mediów i MediaSessionService w testowym Chromium usunęło zakłócenie; nie zmieniano odtwarzacza produktu. Testy SwiftShader nadal nie stanowią pomiaru telefonu.

## Miny do muzyki (2026-10-17)

Właściciel opisał oczekiwane zachowanie jak w oryginalnym demie Face Cap: twarz co chwilę zmienia minę (zła, śmiejąca się, mrużąca oczy, krzywiąca się). Wersja z 2026-10-16 sterowała tylko 5 kształtami (szczęka, mruganie, brwi) energią audio, więc głównie otwierała usta.

- `src/lib/creatorFace.ts`: 29 kanałów ARKit z facecap (z 52), 8 min (uśmiech, śmiech, zła, mrużenie, krzywienie, zdziwienie, uśmieszek, dzióbek). Zmiana miny na wykryty beat basu, najwcześniej po 0,45 s, najpóźniej po 1,3 s, bez powtórzenia z rzędu; głośność przesuwa proporcje między minami dużymi i spokojnymi. Szczęka dodatkowo podąża za pasmem wokalu, mruganie co 2,2–5,2 s, kiwnięcie głową na beat i powolne kołysanie (wygaszane przy pauzie). Ograniczony ruch: zmiana co ≥1,6 s, połowa siły, bez kiwania. Cisza/pauza → neutralna twarz. Nadal reakcja na energię i rytm, nie synchronizacja głosek.
- Siła min sprawdzona renderem rzeczywistej geometrii facecap w Blenderze (`output/lucky/face-expr/faces*.png`); słabe kształty (zła, mrużenie, krzywienie, dzióbek) wzmocnione.
- Beat wykrywany w paśmie ~90–280 Hz (stopa), oddzielnie od pasma wokalu, żeby śpiew nie był traktowany jak beat.
- Testy: zmienność (≥5 min w 8 s muzyki 120 BPM), minimalny i maksymalny czas trzymania, proporcje min przy cichym/głośnym materiale, ograniczony ruch, powrót do neutralnej, zgodność wierzchołków z oryginałem dla każdej miny i pozy skrajnej. 93/93 PASS, tsc i ESLint PASS. Przeglądarka (Playwright, SwiftShader, `output/face-music-qa/run.mjs`, syntetyczny WAV 120 BPM): 29 kanałów, twarz widoczna, miny zmieniają się (krzywienie, śmiech, zdziwienie, uśmieszek, zła), oczy i zęby na miejscu, zero pageerror. Emulacja daje 2,5 fps, a krok czasu twarzy jest ograniczony do 0,1 s, więc w tym teście zmiany i powrót do neutralnej są ~4× wolniejsze niż w czasie rzeczywistym. Ocena tempa i płynności — na telefonie właściciela.
- Pochodzenie modelu: przykład three.js `webgl_morphtargets_face` — „model by Face Cap” (Bannaflak, https://www.bannaflak.com/face-cap). Licencja modelu nadal niepotwierdzona (`docs/asset-licenses.md`).
