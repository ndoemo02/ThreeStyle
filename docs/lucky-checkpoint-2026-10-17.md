# Lucky — gospodarz w kabinie Creator Roomu (2026-10-17)

Branch `codex/entry-lobby-transition`. Lucky (CookieLuck) to autorski projekt właściciela: biały manekin bez twarzy w kowbojskim kapeluszu i płaszczu z asymetrycznym dołem (arkusz MERSH 26/27). Ma witać każdego użytkownika, a później pozwolić na personalizację ubrań i ruchów.

## Co działa

- Media deck → Światło → **Gospodarz w kabinie** (dawniej „Twarz w kabinie”, opt-in, model wczytywany dopiero po włączeniu).
- Lucky stoi w kabinie za szybą (`LUCKY_BOOTH_POSITION`, obok mikrofonu), twarzą do pokoju, w skali 1,25 (ok. 2,3 m — kabina i mikrofon są przeskalowane), więc twarz jest na wysokości oczu kamery pokoju (2,05 m).
- Szyba kabiny: zamiast oświetlanego pudełka (odbijało światła pokoju i wyglądało jak mgła na właściwym zgłoszeniu właściciela) jest prawie przezroczysta, nieoświetlona płaszczyzna; usunięta smuga na wysokości oczu, która przecinała gospodarza; została jedna smuga nad wzrokiem.
- Powitanie raz na wejście: kiwnięcie głową z kapeluszem, lekki ukłon i uśmiech. Startuje dopiero, gdy panel jest zamknięty, a kamera jest bliżej niż 9 m i widzi kabinę.
- Muzyka: te same miny co twarz w kabinie (`src/lib/creatorFace.ts`, 29 kanałów ARKit), kiwanie na beat, kołysanie. Bez muzyki: oddech i rozglądanie się. Pauza → neutralna twarz.
- Ograniczony ruch: połowa powitania, bez kołysania i kiwania, wolniejsze miny.
- Tam, gdzie pliku modelu nie ma (repozytorium i deploy do czasu wyjaśnienia licencji), kabina po 404 sama wczytuje dotychczasową twarz.

## Model

`output/lucky/` (gitignored): widoki z arkusza (Nano Banana), model 3D (Rodin, inference.sh), Blender 5.2 — przeszczep głowy facecap w białym satynie, kapelusz sztywno na kości głowy, szkielet 19 kości, wnętrze ust ciemne, 29 kształtów mimiki. Pełne pochodzenie i ID zadań: `output/lucky/MANIFEST.md`. Koszt generacji 1,13 USD.

| Plik (tylko lokalnie) | Rozmiar | Trójkąty | Tekstury |
|---|---|---|---|
| `public/models/lucky/desktop/lucky.glb` | 1,24 MB | 40 042 | 3 × WebP 1024² |
| `public/models/lucky/mobile/lucky.glb` | 0,75 MB | 25 151 (płaszcz 14 tys., twarz bez zmian) | 3 × WebP 512² |

`public/models/lucky/` jest w `.gitignore` i `.vercelignore`. Licencje i gotowe zapytania: `docs/lucky-licensing-2026-10-17.md`.

## Ograniczenia v1

- Ręce bez animacji: rękawy są zlane z płaszczem w wygenerowanej siatce i ruch ramienia rozrywał płaszcz. Gesty rąk wymagają osobnego ciała i ubrań (etap personalizacji).
- Tekstury płaszcza z Rodina: bardziej brązowo-skórzane niż grafitowa wełna, flaga podszewki rozmyta — do zastąpienia czystymi materiałami.

## Weryfikacja

- Testy Node 98/98 (w tym `tests/lucky.test.ts`: powitanie, kołysanie, reduced motion, odporność na NaN, oraz — gdy plik jest lokalnie — 29 nazwanych kanałów, kości head/neck/spine/chest, ≤45 tys. trójkątów desktop / ≤26 tys. mobile, rozmiar, Meshopt). TypeScript i ESLint zmienionych plików PASS.
- Przeglądarka (`output/lucky-qa/run.mjs`, SwiftShader, syntetyczny WAV 120 BPM; desktop 1024×640 i mobile 844×390): model pobierany dopiero po włączeniu, wariant mobile ładuje plik mobile, Lucky widoczny w kabinie, powitanie po zamknięciu panelu, zmiany min w rytm, wyłączenie usuwa model i zwalnia zasoby, zero pageerror. Bez pliku: 404 → twarz facecap, zero pageerror.
- Głowa ma dwa materiały (satyn, wnętrze ust), więc w three.js to dwie siatki z mimiką — obie są sterowane razem; diagnostyka sprawdza ich zgodność (`faceMeshes: 2`, `facesInSync: true`). Zbliżenie `qa=lucky-close` (`output/lucky-qa/close.mjs`): uśmiech przy powitaniu, neutralna twarz w ciszy, mrużenie, śmiech z zębami, zła mina.
- Gdyby serwer odpowiadał na brakujący plik stroną HTML ze statusem 200, kod też przełącza na twarz (sprawdzenie nagłówka `glTF`) — zabezpieczenie zaimplementowane, w przeglądarce sprawdzono tylko wariant 404 na `next dev`.
- Pomiar `renderer.info` samej sceny po 120 klatkach (`output/lucky-qa/perf.mjs`, SwiftShader, widok `qa=lucky`, wyłączony → włączony gospodarz):

| Profil | draw calls | trójkąty | tekstury | programy |
|---|---|---|---|---|
| desktop 1440×900 | 53 → 60 | 108 826 → 148 868 | 55 → 66 | 27 → 30 |
| mobile 844×390 (DPR 0,75) | 36 → 43 | 14 079 → 39 230 | 38 → 49 | 30 → 33 |

  +11 tekstur to najpewniej 3 mapy materiału, 6 tekstur kości (osobny skin na każdą z 6 siatek z eksportu Blendera) i 2 tekstury mimiki (rozbicie wywnioskowane z budowy pliku, nie zmierzone osobno). VRAM (estimate, RGBA8 z mipmapami): desktop 3 × 1024² ≈ 16,8 MB, mobile 3 × 512² ≈ 4,2 MB; tekstury kości i mimiki pomijalne. Do rozważenia: jeden wspólny skin (−5 tekstur kości).
- SwiftShader daje kilka klatek na sekundę — tempo i płynność ocenia właściciel na telefonie. Brak pomiaru FPS urządzenia.
