🏗️ MASTER BLUEPRINT: Projekt "Blok Trzech Pięter"

1. Wizja i Cel Projektu (Executive Summary)
"Blok Trzech Pięter" to hybrydowa platforma muzyczna typu Web3D , dedykowana muzyce generowanej przez AI. Zamiast płaskiej strony internetowej, użytkownicy (słuchacze i Producenci) logują się do immersyjnego środowiska 3D w przeglądarce. Celem jest stworzenie osobnej przestrzeni dla utworow generowanych przez ai oraz stworzenie elitarnego, wciągającego doświadczenia (Fluid Voting) z wykorzystaniem mechanik gamedevowych, przy zachowaniu maksymalnej wydajności (braku "zamulania") na urządzeniach mobilnych i desktopach.


2. Ścieżka Użytkownika (User Flow)

Projekt dzieli się na 3 główne etapy doświadczenia:
 * Etap 1: Bramka (Landing Page 2D)
   * Mroczny, minimalistyczny ekran powitalny (inspiracja: networkeffect.io).
   * Manifest platformy: "To jest muzyka AI, nie udajemy naturalnych artystów".
   * Weryfikacja sprzętu (zalecane słuchawki).
   * Wymagania techniczne: Czysty HTML/CSS/React, błyskawiczne ładowanie, autoryzacja (Supabase).
 * Etap 2: Prywatne Studio (Instancja 3D - "Safe House")
   * Po logowaniu gracz spawnuje się w swoim małym, prywatnym pokoju.
   * Wygląd: Surowy beton, grube glify okienne, wpadające światło "Golden Hour" (wypalone cienie).
   * Na ścianie generowany proceduralnie, pulsujący neon 3D z nazwą Top Utworu.
   * Akcja: Tutaj użytkownik w skupieniu słucha nowości i oddaje swój pierwszy, prywatny głos, wrzucając fizyczny obiekt 3D ("Token Zaufania") do slotu na biurku.
 * Etap 3: Trzecie Piętro (Wspólna Giełda / Kasyno)
   * Dostępne z poziomu drzwi/windy w pokoju prywatnym.
   * Publiczne, duże środowisko 3D (ładowane dynamicznie po opuszczeniu pokoju prywatnego).
   * Wielkie ekrany holograficzne, animowane postacie (tancerki), głośna muzyka.
   * Akcja: Miejsce do oddania drugiego głosu (pod wpływem tłumu) – tzw. mechanika "Dark Horse". Rozliczenie tygodniowych sprintów muzycznych.





3. Wytyczne Techniczne i Artystyczne (Złote Zasady dla Zespołu)
Zabrania się ładowania ciężkich modeli i dynamicznego oświetlenia całej sceny, aby zapobiec spadkom płynności (FPS).
 * Zasada "High Quality, Low Poly": Geometria pokoi to proste bryły (BoxGeometry). Ściany są grube, aby nadać poczucie solidności. Zero zbędnych wierzchołków.
 * Oświetlenie (Baked Lighting - Wymóg Krytyczny): 90% cieni w grze (np. ostre cienie z okna, cienie mebli na podłodze) MUSI być wypalone (baked) w teksturach w programie Blender przed eksportem. Silnik Three.js ładuje tylko płaskie mapy (BaseColor + cienie).
 * Mrok i Kontrast: Sceny bazują na niskim świetle ogólnym (AmbientLight). Detale wyciągamy za pomocą materiałów emisyjnych (Neony) i efektów Post-Processingu (obowiązkowy UnrealBloomPass).
 * UI Diegetyczne: Unikamy płaskich przycisków HTML nakładanych na ekran. Interfejs jest częścią świata gry (np. statystyki na monitorze 3D na biurku, kasety z utworami, fizyczne wrzucanie tokenów używając Raycastera).
 * Zarządzanie Zasobami: Modele eksportowane wyłącznie do formatu .glb. Modele trzymane są na zewnętrznym repozytorium (np. GitHub Raw lub dedykowany CDN), baza danych (Supabase) przechowuje JEDYNIE tekst i logikę (JSON z ustawieniami pokoju, stany konta), nie przechowuje plików 3D.



4. Mechanika i Logika Platformy
 * Sprinty Tygodniowe: Giełda muzyczna resetuje się co tydzień.
 * Watermark: Każdy uploadowany utwór przechodzi proces weryfikacji i otrzymuje "Soniczny Watermark".
 * Monetyzacja (System Składkowy): Słuchacze: 9 PLN/m-c, Producenci: 19 PLN/m-c. Środki zasilają pule nagród dla najlepszych łowców talentów i producentów.




5. Roadmapa / Etapy Realizacji (Dla Zespołu)

Aby projekt zakończył się sukcesem, wdrażamy go w 3 fazach. Nie przechodzimy do Fazy 2 bez stabilnej Fazy 1.



📍 FAZA 1: Fundamenty i Mroczny Pokój (Aktualny cel)
Cel: Zbudowanie płynnego przejścia od logowania do pierwszego prywatnego pokoju z działającym neonem.
 * Frontend Dev (React/Web): Zbudowanie Landing Page'a z mrocznym onboardingiem i podpięcie autoryzacji (Supabase).
 * 3D Artist / Level Designer: Przygotowanie w Blenderze pliku room_base.glb – prosta kostka, grube okno, wypalone cienie na podłodze. Eksport i wrzucenie na CDN/GitHub.
 * Three.js Dev: Połączenie Reacta z Three.js. Wczytanie room_base.glb. Dodanie TextGeometry dla napisu "BLOK TRZECH PIĘTER". Odpalenie UnrealBloomPass, żeby napis świecił jak prawdziwy neon. Podpięcie kamery z płynnym ruchem (GSAP).


📍 FAZA 2: Audio i Mechanika Głosowania
Cel: Ożywienie pokoju i wdrożenie Fluid Voting.
 * Three.js Dev: Implementacja interfejsu diegetycznego na biurku. Stworzenie modeli 3D "Tokenów". Oskryptowanie Raycastera (Drag & Drop tokena do slotu). Implementacja wibracji obiektów w rytm muzyki (THREE.AudioAnalyser).
 * Backend Dev: Logika bazy danych. Zapisywanie oddanych głosów, obsługa portfela tokenów użytkownika, limit 1 utworu odtwarzanego naraz.



📍 FAZA 3: Wspólny Świat (3. Piętro)
Cel: Mechanika społecznościowa i skalowanie.
 * 3D Artist: Optymalizacja modeli dla dużego klubu/kasyna. Wypalenie nowych tekstur. Przygotowanie zapętlonych animacji awatarów (Mixamo).
 * Frontend/Three.js Dev: Logika wyjścia przez drzwi (wyładowanie małej sceny, załadowanie dużej). Dynamiczne ekrany z rankingiem tygodnia.
 * Backend Dev: Przeliczanie mnożników ("Dark Horse"), system przyznawania nagród miesięcznych.

