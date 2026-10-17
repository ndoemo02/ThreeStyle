# Lucky — legalizacja modeli i mimiki (2026-10-17)

Stan na podstawie publicznych warunków odczytanych 2026-10-17. To nie jest porada prawna, tylko mapa tego, co trzeba potwierdzić przed publicznym startem. Pochodzenie każdego pliku: `output/lucky/MANIFEST.md`.

## Podsumowanie

| Element | Co mówią warunki | Ryzyko | Działanie |
|---|---|---|---|
| Projekt postaci (arkusz MERSH 26/27) | projekt właściciela | brak | zachować oryginały i daty |
| Obrazy widoków (Gemini „Nano Banana” przez inference.sh) | inference.sh: wyniki należą do klienta, użycie komercyjne dozwolone „subject to any applicable Model Terms”; warunki Gemini API nie były dziś odczytywane — według wcześniejszej wiedzy Google nie rości sobie praw do wygenerowanych treści, a obrazy mają znak SynthID (do potwierdzenia) | niskie | potwierdzić w zapytaniu do inference.sh, które Model Terms obowiązują |
| Model 3D (Hyper3D Rodin przez inference.sh) | Hyper3D Terms §5(b): „If you use Rodin to generate Output, we will not limit your use of such Output, subject to … any third-party terms”; inference.sh jw. | niskie–średnie (generacja przez pośrednika, nie konto Hyper3D) | zapytanie do inference.sh (+ opcjonalnie Hyper3D) |
| Głowa z mimiką (`facecap.glb`, Face Cap / Bannaflak) | brak opublikowanej licencji; plik pochodzi z przykładów three.js z podpisem „model by Face Cap”. Licencja MIT three.js obejmuje kod, nie jest jasne, czy obejmuje ten model | **wysokie** dla twarzy marki | zapytanie do Bannaflak; równolegle przygotować wariant zastępczy |
| Mimika (kod min w `src/lib/creatorFace.ts`) | własny kod projektu; nazwy kanałów ARKit to standard nazewnictwa | brak | — |

Do czasu odpowiedzi: Lucky i twarz w kabinie tylko jako demo (preview). Plik `lucky-*.glb` nie trafia do repozytorium ani na produkcję.

## Wariant zastępczy, gdyby Bannaflak odmówił lub nie odpowiedział

Własna głowa manekina (z modelu Rodin) z własnymi kształtami mimiki w standardzie ARKit — wtedy cały Lucky jest wolny od cudzych licencji, a kod min działa bez zmian (te same nazwy kanałów). Do wyboru: ręczne kształty w Blenderze albo płatny dodatek automatyzujący kształty ARKit (np. Faceit) — przed zakupem sprawdzić jego warunki dla wyników.

## Zapytanie 1 — Bannaflak (Face Cap)

Kontakt: strona https://www.bannaflak.com/face-cap/ nie podaje adresu e-mail ani licencji. Możliwe drogi: link „Support” przy aplikacji Face Cap w App Store lub kontakt wskazany w aplikacji; dodatkowo zgłoszenie (pytanie) w repozytorium three.js, skąd pochodzi plik.

> **Subject:** License request — Face Cap sample head (facecap.glb) in a web experience
>
> Hello,
>
> I am building ThreeStyle, an interactive 3D music space in the browser (three.js). We use the Face Cap sample head that ships with the three.js example "webgl_morphtargets_face" (models/gltf/facecap.glb, credited "model by Face Cap").
>
> We would like to use this head, recoloured as a white mannequin and driven by our own code (a subset of its ARKit blendshapes reacting to music), as the face of our host character "Lucky", in a public, commercial web product. We do not redistribute the file as a standalone asset; it is loaded inside our app.
>
> Could you tell us:
> 1. under which license the facecap.glb head and its blendshapes are provided;
> 2. whether commercial use in a web application, including modification (recolouring, combining with our own body model), is permitted;
> 3. whether you require attribution, and in what form; and if a paid license is needed, what it costs.
>
> Thank you — we credit Face Cap in the meantime.
>
> Best regards,
> [imię i nazwisko], ThreeStyle — [e-mail]

## Zapytanie 2 — inference.sh (Rodin i Gemini przez platformę)

Kontakt: support przez panel/stronę inference.sh.

> **Subject:** Commercial use of outputs from infsh/rodin-3d-generator and google/gemini-nano-banana-2-1
>
> Hello,
>
> Our account generated a 3D character (infsh/rodin-3d-generator, task 5aqjqsv454fz8t705cc3xsy24k) and reference images (google/gemini-nano-banana-2-1, tasks 1j8zh3ztfqc7w8swayh7aexwv1, 7nxtke4dw3xgej2ssrq1qbsdpr, 3xgx2ky388bkaf5ky1fxsprr7m, 228kf830rptznejfzy9587mrgn, 6xpt4z9vvwpq5re2d98152mr7x) from our own original character design.
>
> Your Terms state that we own Output Content and may use it commercially "subject to any applicable Model Terms". Could you confirm:
> 1. which Model Terms apply to these two apps (Hyper3D/Deemos API terms for Rodin; Google Gemini API terms for Nano Banana);
> 2. that we may modify the generated model (retopology, rigging, texture replacement) and ship it inside a commercial web application;
> 3. whether any attribution is required.
>
> Thank you,
> [imię i nazwisko], ThreeStyle — [e-mail]

## Zapytanie 3 (opcjonalne) — Hyper3D / Deemos

Kontakt z warunków: hello@deemos.com. Warto tylko, jeśli inference.sh wskaże warunki API Hyper3D jako obowiązujące.

> **Subject:** Rodin outputs generated via an API partner — commercial use
>
> Hello,
>
> We generated a character model with Rodin through inference.sh (API partner). Your Terms §5(b) say you will not limit the use of Rodin Output. Could you confirm this also applies to Rodin output generated via an API partner, for a modified (rigged, re-textured) character used in a commercial web application?
>
> Best regards,
> [imię i nazwisko], ThreeStyle — [e-mail]

## Źródła (odczyt 2026-10-17)

- Hyper3D Terms of Service: https://hyper3d.ai/legal/terms (§5 Prompts and Output, (b) Rodin)
- inference.sh Terms of Service: https://inference.sh/terms (własność Output Content, Model Terms)
- three.js przykład: https://threejs.org/examples/webgl_morphtargets_face.html („model by Face Cap”)
- Face Cap: https://www.bannaflak.com/face-cap/
