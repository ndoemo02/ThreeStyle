# Lobby — charakter i mały koszt renderowania

Analiza i propozycja, 2026-10-05. Bez zmian w scenie. Cel: po otwarciu wejścia użytkownik widzi muzyczną przestrzeń, z czytelną drogą dalej i śladami użytkowania.

## Zweryfikowana baza

- HubShell.tsx: podłoga 30×20, ściany, 45 lameli ściennych, 35 belek sufitowych, oznaczenia oraz do 3 donic. Brak siedzisk lub stanowiska aktywności. Pustkę wzmacniają duże jednolite powierzchnie i szeroki widok na podłogę.
- LobbyMeshes.tsx: statyczne bryły są już łączone, powtarzalne elementy instancjonowane. Można rozszerzać ten mechanizm zamiast dodawać osobny obiekt dla każdego detalu.
- lobbyConfig.ts: mobile DPR 1, dwie lampy obszarowe; mobile-low DPR 0,75, jedna lampa i brak użycia normal map. GroundedHub dodatkowo ma hemisphere i ambient light. Limit 1–2 odnosi się do lamp obszarowych, nie do wszystkich źródeł.
- B3P wyłącza cienie Canvas; lobby ma SMAA bez Bloom. LobbyMaterials.ts / HubShell.tsx mają już tanie wizualne poświaty i LED-y. Nie należy mylić świecącego materiału z lampą oświetlającą otoczenie.

## Pierwszy zestaw

1. **Lewa pusta ściana: miejsce spotkań.** Jedna długa, prosta ławka z ciemnym siedziskiem i metalowymi wspornikami. Obok dwie niskie skrzynie typu flight case jako stolik / sprzęt muzyczny. Narożniki, zamki i naklejki skrzyń głównie w teksturze. Umieszczenie przy ścianie poza drogą przejścia, nie na środku sali. Jeśli pozycja wchodzi w dostępną trasę, wymaga osobnej decyzji o kolizji — nie dokładamy przeszkód wizualnych, przez które gracz przechodzi.
2. **Prawa ściana: mural ThreeStyle.** Duże kremowe, grafitowe i miedziane gesty z akcentem przygaszonego turkusu, spójne z drzwiami windy. Dwie–trzy płaskie powierzchnie z teksturą lub malowanie w dedykowanym wariancie ściany; bez modelowania zacieków i osobnego mesha na literę. Ograniczyć powierzchnię półprzezroczystych nakładek.
3. **Przy ławce: trzy plakaty / naklejki.** Ręczne podpisy, szkice waveformów i lokalny muzyczny charakter. Plakaty korzystają z atlasu wspólnego z muralem. Bez fikcyjnych wydarzeń, terminów lub danych live; to dekoracja dopóki nie ma rzeczywistej treści produktu.
4. **Podłoga: ślad drogi.** Subtelny pas materiału lub kilka namalowanych strzałek prowadzących do korytarza/windy. Środek pozostaje przechodni. Wyraźniejszy kierunek i lepiej dobrany pierwszy kadr pomogą także bez dodawania obiektów.
5. **Istniejąca tablica: cel wejścia.** Czytelna informacja, gdzie jest Creator Room i jak dojść do windy. Rozwinięcie w funkcjonalne menu to osobny etap; nie mnożymy ekranów wideo tylko do wypełnienia ścian.

## Gra świateł

Zacząć od kontrastu obecnych lamp: spokojniejsza jasność ogólna, cieplejsza strefa tablicy/ławki i turkusowy akcent muralu. Cała trasa, także końcówka korytarza w mobile-low, musi pozostać czytelna.

LED pod ławką i istniejące listwy mogą powoli zmieniać kolor/jasność materiału. Lokalną poświatę i miękkie cienie pod meblami można przedstawić małymi teksturami na płaszczyznach. To wizualna imitacja, która nie daje rzeczywistego dynamicznego oświetlenia ani zasłaniania przez obiekty. Zachować obecną liczbę lamp obszarowych; nie dokładać wielu pointLight, dynamicznych shadow map, globalnego Bloom, odbić live ani mgły objętościowej.

Krótki efekt powitania po wejściu, potem stan spokojny. Jeśli lobby ma reagować na audio, wykorzystać istniejący analizator, łagodne obwiednie i aktualizacje ograniczone w czasie; bez stroboskopu. Reduced motion pozostawia stałe światło.

## Docelowy budżet pierwszego pakietu — do pomiaru

- Jedna dodatkowa tekstura/atlas albedo 1024×1024 mobile, bez nowych normal/roughness map. Nieskompresowane RGBA z mipmapami to około 5,33 MiB GPU; mały plik WebP sam nie gwarantuje małego kosztu GPU. Dla mobile-low rozważyć 512×512 po ocenie czytelności.
- Około 3–5 tys. dodatkowych trójkątów i nie więcej niż 4–6 dodatkowych wywołań rysowania. To cel projektowy, nie wynik wykonanego testu.
- Zero nowych dynamicznych cieni i dodatkowych przebiegów postprocessingu.
- Statyczne dekoracje scalone według materiałów; powtarzalne części instancjonowane. Bez NPC, animowanych postaci, cząsteczek i kilku równoległych klipów wideo.

Przed i po: ten sam kadr / DPR / profil, draw calls, liczba trójkątów, tekstury, czas klatki i dłuższa próba na fizycznym telefonie. Nie podawać gwarantowanych FPS z samego kodu. Arena, Stage 7, upper lounge i istniejące collidery poza zakresem.

## Źródła techniczne

- Three.js, łączenie geometrii: https://threejs.org/manual/pages/optimize-lots-of-objects.html
- Three.js, koszt cieni i imitacja cieniem na płaszczyźnie: https://threejs.org/manual/pages/shadows.html
- Three.js, pamięć tekstur: https://threejs.org/manual/pages/textures.html
