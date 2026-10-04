# Creator Room — poprawka ostrości mobile, 2026-10-04

Poprawka ostatniego pakietu `2b29ffd92e453c652a6b559405767289b1b401c6`. Wskazany przez użytkownika podgląd `three-style-8k8ygn84t-freeflow-build.vercel.app` odpowiada dokładnie temu SHA; potwierdzono przez Vercel API. Nie był to problem oglądania starszej wersji.

## Przyczyna i minimalna zmiana

Test runtime odtworzył rozjazd rozdzielczości. Przy viewport 844×390 i DPR urządzenia 3 adaptacyjny renderer osiągał DPR 1.5, a canvas miał 1266×585. Jednak `EffectComposer.inputBuffer`, `outputBuffer` oraz obie tekstury SMAA miały nadal 844×390. Obraz sceny był renderowany zbyt mały i powiększany na końcu, co ograniczało faktyczny efekt adaptacyjnej ostrości.

Zainstalowany `@react-three/postprocessing` wywołuje `composer.setSize()` przy zmianie wymiarów CSS, ale nie przy zmianie `viewport.dpr`. Nowy komponent `CreatorComposerResolution` obserwuje DPR i synchronizuje istniejący composer przez jego publiczne `setSize()`. Jest aktywny wyłącznie w mobilnym Creator Roomie. Nie zmienia limitów jakości, modeli, materiałów, lamp ani HUD-u. Arena, Stage 7, collidery i upper lounge pozostają poza zakresem.

## Walidacja

- Pierwszy test regresji **FAIL przed poprawką**: canvas 1266×585, scena/SMAA 844×390.
- Kontrolowane zmiany DPR **1 → 1.25 → 1.5 → 0.75 → 1 → 1.5**: canvas, oba bufory composera i obie tekstury SMAA mają identyczne wymiary po każdej zmianie — **PASS**.
- Taki sam test na lokalnym buildzie produkcyjnym — **PASS**. Przy 12-krotnym ograniczeniu CPU jakość obniżyła się do DPR 1, z canvasem i buforami 844×390 oraz bez błędu GL.
- TypeScript, ukierunkowany ESLint i Next.js production build — **PASS**.
- Istniejące testy światła, mediów i interakcji — **22/22 PASS**.
- Wyjście windą z Creator Roomu: w lobby DPR 1 i zgodne bufory 844×390 — **PASS**.

Lokalne dowody: `output/creator-room/2026-10-04/mobile-sharpness-regression.js`, `mobile-sharpness-controlled-regression.js`, `mobile-sharpness-composer-before.png`, `mobile-sharpness-composer-after.png`. Porównanie obrazów przy tej samej kamerze odtwarza stare wymiary buforów i zestawia je z poprawnymi, zachowując DPR renderera 1.5.

Wyższa rzeczywista rozdzielczość zwiększa koszt GPU. Pozostaje rozgrzewka, pomiar trwałych okien klatek, cooldown oraz zejście do DPR 1/0.75 pod obciążeniem. Nie należy wnioskować o FPS ani temperaturze telefonu z emulacji komputerowej. Ostrość tekstury samego logo i innych grafik ma także ograniczenia źródłowych obrazów; ta poprawka usuwa potwierdzone ograniczenie całej sceny, bez obietnicy idealnie ostrych wszystkich materiałów.
