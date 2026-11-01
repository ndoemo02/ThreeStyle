# CookieLuck — baza i rekonstrukcja stroju

Właściciel chce manekina gospodarza w kabinie Creator Roomu, z istniejącą twarzą facecap reagującą na audio. Referencja pokazuje czarny asymetryczny płaszcz, ozdobne wykończenia, pasek, kapelusz i buty. Oryginały wskazane do analizy: `C:\Develop\mersh-experience-prototype\references\3d assets\Proba v1`.

## Potwierdzony stan modeli

Oba GLB przedstawiają wcześniejszego manekina w prostym płaszczu: bez kapelusza i detali z nowej referencji. Każdy ma jedną siatkę i jeden materiał, bez szkieletu, animacji ani morphów. Głowa nie jest osobnym obiektem.

| Plik | Oryginał | Robocza wersja web |
| --- | --- | --- |
| Copilot3D-f782ac48-5583-467c-8bea-e7659eb0bf9c.glb | 144 102 trójkąty; 6 816 260 B; 2 tekstury PNG 1024² | 22 000 trójkątów; 954 488 B |
| y7ybxj8p.glb | 500 000 trójkątów; 25 335 608 B; 3 tekstury PNG 2048² | 39 664 trójkąty; 2 310 148 B |

Wstępne oszacowanie Copilot jako 30 tys. trójkątów było błędne: pomijało accessor indeksów o numerze zero. Powyższe liczby odczytano z rzeczywiście załadowanych geometrii.

Kopie istnieją w ignored `output/cookieluck-review/`: `copilot-mobile.glb`, `detail-mobile.glb`, `copilot-editable.glb` (3 028 104 B), `detail-editable.glb` (11 468 916 B). Wersje editable zachowują PNG i nie używają Meshopt, aby ułatwić obróbkę w Blenderze. Wersje web mają Meshopt i WebP 1024²; mapy danych skompresowano bezstratnie. Oryginały nie zostały zapisane ani przeniesione.

Oba warianty web załadowano w osobnym viewerze Three.js i obejrzano screenshoty. To weryfikacja importu i wyglądu, nie pomiar FPS telefonu. Materiały w viewerze miały podglądowe metalness 0,05 / roughness 0,8; nie zapisano tego do modeli.

## Rekomendowany kierunek

Szybkie dopasowanie do kabiny: kopia Copilot 22 tys. jako statyczne ciało plus osobna istniejąca głowa facecap (8042 trójkąty). W Blenderze usunąć starą głowę, zachować szyję, dopasować skalę i kolor, schować łączenie pod kołnierzem. Zachować pełną hierarchię oczu, zębów i morphów facecap. Dekodery/bufory twarzy pozostają według poprawki z checkpointu Creator Face.

Jeśli celem jest strój zgodny z nową referencją, prosta podmiana tekstury nie zmieni kroju płaszcza. Przygotować nową bryłę stroju z jednej czystej referencji pełnej sylwetki i dopracować w Blenderze. Pełnego kolażu czterech postaci i detali nie używać jako pojedynczego wejścia image-to-3D. Do kontrolowania tyłu i boku wykorzystać osobne obrazy referencyjne.

- Geometria: sylwetka/asymetryczny dół płaszcza, klapy i kołnierz, pasek, kapelusz, buty.
- Tekstury: ornament na brzegach, szwy, skóra, nadruk podszewki; drobny relief w normal mapie. Wybrane duże klamry można zachować jako prostą geometrię.
- Docelowo osobne obiekty ciała/stroju, głowy, kapelusza i ewentualnych dodatków. Ciało statyczne; mimika i niewielki ruch głowy. Symulacja płaszcza i pełny rig nie są potrzebne do powitania.
- Cel roboczy całej postaci: około 30–40 tys. trójkątów, tekstury przeważnie 1024², bez nowych świateł i dynamicznych cieni. To budżet do walidacji w pokoju, nie deklaracja wydajności fizycznego telefonu.

Sprawdzona opcja nowej generacji: oficjalny Microsoft TRELLIS.2-4B, pojedynczy obraz → siatka z materiałami PBR, licencja MIT. Generacja służy przygotowaniu stroju, a mimikę zapewnia istniejący facecap. Źródło: https://huggingface.co/microsoft/TRELLIS.2-4B . Blender eksportuje shape keys przez glTF: https://docs.blender.org/manual/en/5.1/addons/import_export/scene_gltf2.html .

Nie integrowano CookieLucka w działającej aplikacji ani nie wdrażano go na Vercel. Kolejny etap: wybór docelowej sylwetki stroju, dopasowanie szyi/głowy w Blenderze, wizualna akceptacja, potem opt-in w Creator Roomie i test mobile. Arena, geometria przejść i bieżąca twarz w pokoju nie zostały zmienione.
