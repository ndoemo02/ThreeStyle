# Inwentarz licencji assetów — Event Room (i zależności współdzielone)

> Etap 0 przebudowy Event Roomu. Ten dokument jest **bramką**: żaden plik w
> `public/` wymieniony poniżej jako `unconfirmed` nie może zostać
> zregenerowany ani zastąpiony bez uzupełnienia tego manifestu (URL źródła,
> autor, licencja, data pobrania, sposób weryfikacji). Nazwa pliku **nie jest
> dowodem** pochodzenia ani licencji — żaden status poniżej nie został
> ustalony na podstawie samej nazwy.
>
> Stan na 2026-07-29, branch `codex/lobby-rebuild` @ 961c814. Weryfikacja:
> istnienie i rozmiar plików potwierdzone bezpośrednim odczytem repozytorium
> (`ls`/`stat`/`sharp` metadata). Żaden plik nie został pobrany ani
> zregenerowany w ramach tego etapu.

## 1. Tekstury źródłowe (`public/textures/*.jpg`) — używane przez Event Room

Przetwarzane przez `scripts/build-event-room-preview-textures.mjs` do
`public/textures/runtime/event-room/{desktop,mobile}/*.webp`.

| Plik źródłowy | Rozmiar | Rola w Event Roomie | Status | Znane źródło | Autor | Licencja | Weryfikacja |
|---|---|---|---|---|---|---|---|
| `granite_tile_diff_2k.jpg` | 2 938 829 B | posadzka — albedo | **unconfirmed** | nazwa sugeruje Poly Haven (`granite_tile`), **niepotwierdzone** | nieznany | nieznana | brak dowodu w repo (brak README/manifestu/metadanych) |
| `granite_tile_nor_gl_2k.jpg` | 2 486 724 B | posadzka — normal (OpenGL) | **unconfirmed** | jw. | nieznany | nieznana | jw. |
| `granite_tile_rough_2k.jpg` | 2 738 066 B | posadzka — roughness | **unconfirmed** | jw. | nieznany | nieznana | jw. |
| `oak_veneer_01_diff_2k.jpg` | 2 831 117 B | lamele drewniane — albedo | **unconfirmed** | nazwa sugeruje Poly Haven (`oak_veneer`), **niepotwierdzone** | nieznany | nieznana | brak dowodu w repo |
| `oak_veneer_01_nor_gl_2k.jpg` | 2 429 019 B | lamele drewniane — normal | **unconfirmed** | jw. | nieznany | nieznana | jw. |
| `oak_veneer_01_rough_2k.jpg` | 3 968 436 B | lamele drewniane — roughness | **unconfirmed** | jw. | nieznany | nieznana | jw. |
| `Concrete035_2K.jpg` | 1 884 157 B | zadeklarowany w `sources.wallColor` skryptu builda | **unconfirmed — i prawdopodobnie martwy plik** | nazwa sugeruje ambientCG (`Concrete035`), **niepotwierdzone** | nieznany | nieznana | **Odczyt kodu (`build-event-room-preview-textures.mjs:13,136-150`) pokazuje, że `sources.wallColor` jest zdefiniowany, ale nigdy nie użyty — ściany są w 100% proceduralne (`softPlaster()`, `neutralNormal()`, `solidRoughness()`). Ten plik może być dziś zbędny dla Event Roomu; wymaga decyzji, nie regeneracji.** |
| `vocal/felt.jpg` | 72 991 B | **tapicerka kanap Event Roomu** (`seat-albedo.webp`, `sources.seatColor`) | **unconfirmed — ścieżka krytyczna, blokuje publikację** | nieznane | nieznany | nieznana | brak dowodu w repo; zgodnie z planem (§9, §13.1): albo potwierdzić pochodzenie, albo zastąpić proceduralnym filcem (mechanizm analogiczny do `softPlaster()`) — **osobna decyzja, osobny commit, poza zakresem Etapu 0** |
| `vocal/wood.jpg` | 403 007 B | inne strefy (VocalBooth) — **nieużywane przez Event Room** | **unconfirmed** | nieznane | nieznany | nieznana | brak dowodu w repo |

## 2. Tekstury runtime (`public/textures/runtime/event-room/{desktop,mobile}/*.webp`)

10 plików na wariant (20 razem), generowane wyłącznie ze źródeł z sekcji 1
przez `scripts/build-event-room-preview-textures.mjs`. **Status dziedziczony
ze źródła** — nie są to niezależne assety, więc nie mają odrębnej licencji;
`wall-*` są w 100% proceduralne (patrz `Concrete035_2K.jpg` wyżej), pozostałe
(`floor-*`, `wood-*`, `seat-albedo`) są pochodnymi plików `unconfirmed` z
sekcji 1. **Nie regenerować** żadnego z tych plików do czasu uzupełnienia
statusu źródeł (bramka §9 planu).

Potwierdzone wymiary (via `sharp`, 2026-07-29) — patrz
`output/stage0-baseline-notes.md` dla pełnej tabeli i estymaty VRAM.

## 3. Tekstury innych stref (`public/textures/stage/*.jpg`)

| Plik | Status | Uwaga |
|---|---|---|
| `stage/brick-color.jpg` | **unconfirmed** | nieużywane przez Event Room; wymienione w §9 planu jako "inne strefy — nieznane" |
| `stage/brick-normal.jpg` | **unconfirmed** | jw. |
| `stage/brick-rough.jpg` | **unconfirmed** | jw. |
| `stage/metal.jpg` | **unconfirmed** | jw. |

## 4. Panele lamelowe producenckie (`public/textures/Lamele/{Allure,Prime,Veneer}/**`)

Zawartość zweryfikowana: każdy z trzech katalogów (`Allure/Allure`,
`Prime/Prime`, `Veneer/Veneer`, oraz zagnieżdżony
`Allure/Allure/Panele oraz zakonczenia`) zawiera **wyłącznie pliki
`.DS_Store`** — zero plików obrazów. Nazwy (`Allure`, `Prime`, `Veneer`)
wyglądają jak linie produktowe producenta paneli lamelowych, co **sugeruje**
materiały producenta, ale nic nie jest potwierdzone.

**Status: unconfirmed, nieużywane.** Żaden plik z tych katalogów nie trafia
do bundla aplikacji (katalogi są puste poza metadanymi macOS). Pozostają
puste — nie uzupełniać ani nie usuwać w tym etapie.

## 5. Modele GLB (`public/models/optimized/*.glb`) — inne strefy

13 plików, **9.0 MB łącznie** (potwierdzone `du`, 2026-07-29). **Żaden nie
jest importowany do Event Roomu** i żaden nie powinien być (zgodnie z §9
planu — Event Room pozostaje w 100% proceduralny, bez GLB).

| Plik | Rozmiar | Status |
|---|---|---|
| `HQfireplace.glb` | 8.0 KB | unconfirmed |
| `golden_play_button.glb` | 8.0 KB | unconfirmed |
| `silver_play_button.glb` | 8.0 KB | unconfirmed |
| `monitor_setup.glb` | 36 KB | unconfirmed |
| `editing_table.glb` | 216 KB | unconfirmed |
| `mic-transformed.glb` | 256 KB | unconfirmed |
| `facecap.glb` | 328 KB | unconfirmed |
| `organizer.glb` | 548 KB | unconfirmed |
| `office_chair.glb` | 732 KB | unconfirmed |
| `sofa.glb` | 920 KB | unconfirmed |
| `ipad_pro_2024.glb` | 1.1 MB | unconfirmed |
| `modern_wooden_cabinet.glb` | 1.9 MB | unconfirmed |
| `venetian_sofa.glb` | 3.1 MB | unconfirmed — **jawnie odrzucony dla Event Roomu** (plan §9: "proceduralnie taniej, spójnie stylistycznie i bez ryzyka licencyjnego") |

Żaden plik licencyjny, README ani atrybucja nie istnieje obok tych modeli
(sprawdzone: brak plików `*license*`, `*README*`, `*credit*`,
`*attribution*` w `public/textures` ani `public/models`).

## 6. Podsumowanie bramki (§9 planu)

- **Brak jakiegokolwiek pliku licencji/atrybucji w repozytorium** przed tym
  dokumentem — potwierdzone przeszukaniem `public/textures` i
  `public/models`.
- **Wszystkie** tekstury źródłowe współdzielone przez Event Room pozostają
  `unconfirmed`. Żadna nie została zregenerowana ani pobrana w ramach tego
  etapu.
- `felt.jpg` pozostaje **unresolved** na ścieżce krytycznej (tapicerka
  kanap) — zgodnie z instrukcją, jeżeli repo nie zawiera dowodu.
- Odkrycie dodatkowe (nieoczekiwane, potwierdzone lekturą kodu): plik
  `Concrete035_2K.jpg`, mimo że wymieniony w planie jako "wejście
  proceduralnego plastru", **nie jest faktycznie czytany** przez
  `build-event-room-preview-textures.mjs` — ściany są renderowane w 100%
  proceduralnie (`softPlaster`/`neutralNormal`/`solidRoughness`, funkcje
  czysto matematyczne, bez wejścia z pliku). To nie zmienia jego statusu
  licencyjnego (nadal `unconfirmed`), ale oznacza, że nie blokuje on
  faktycznie niczego w obecnym potoku budowy — do potwierdzenia i ewentualnego
  usunięcia z `sources` w przyszłym etapie porządkowym (poza zakresem Etapu 0).
- Panele `Lamele/{Allure,Prime,Veneer}` pozostają puste i nieużywane —
  bez zmian.
- Regeneracja jakiegokolwiek pliku w `public/` (w tym obniżenie rozdzielczości
  `wood` na mobile, D9 z planu) pozostaje **zablokowana** do czasu uzupełnienia
  statusów `unconfirmed` powyżej na `confirmed` z pełnymi danymi źródła.
