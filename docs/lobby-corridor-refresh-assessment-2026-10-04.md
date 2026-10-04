# Lobby i korytarz — ocena lekkiego odświeżenia, 2026-10-04

## Wniosek i stan

Lekki lifting to średni, zamknięty pakiet. Obecny układ można zachować: ma już wspólne atlasy, instancjonowane lamele i drzwi, łączoną geometrię, listwy LED oraz profile jakości. Największa poprawa wynikałaby z materiałów, rozłożenia światła i czytelnych oznaczeń. Nie potrzeba przebudowy architektury ani nowych ciężkich modeli.

- Root `C:\ThreeStyle.ai`, branch `feat/event-room-arena`, HEAD `94c72f8cfa2a8413939122354189306b3e3199e0` potwierdzone podczas audytu.
- Użytkownik potwierdził znaczną poprawę obrazu Creator Roomu na swoim telefonie. Nie oznacza to jeszcze akceptacji lobby ani całej listy testów przerwań audio/kamery.
- Użytkownik rozszerzył zakres tego wątku o ocenę lobby i korytarza. Arena/Event Room, Stage 7, collidery i upper lounge pozostają zamrożone.
- Brak zmian w kodzie aplikacji. Zapisano ocenę i lokalne zrzuty diagnostyczne. Wcześniejsze obce zmiany i pliki testowe pozostawiono.

## Co rzeczywiście sprawdzono

Przeczytano komponenty lobby, korytarza, materiałów, geometrii atlasu, polityki jakości, drzwi, integracji strony oraz istniejące testy lobby. Obejrzano dostarczony lokalny obraz korytarza i aktualną scenę publicznego podglądu:

https://three-style-h4sqjkqqu-freeflow-build.vercel.app/b3p

Na publicznym podglądzie wykonano kontrolowane przełączenie do hubu przez callback komponentu Creator Roomu, ustawienie kamery dla audytu oraz pomiary desktop/mobile. To **nie jest test przejścia windą, chodzenia ani colliderów**. Emulacja telefonu nie potwierdza FPS, temperatury ani działania konkretnego fizycznego urządzenia. Nie uruchamiano ponownie testów jednostkowych ani buildu.

Zrzuty w ignorowanym katalogu `output/`:

- `lobby-audit-2026-10-04-desktop.png` — widok lobby.
- `lobby-audit-2026-10-04-corridor.png` — widok korytarza.
- `lobby-audit-2026-10-04-mobile.png` — korytarz przy emulacji mobile.

## Obecny wygląd

Lobby jest duże i puste; ściana z lamelami i uproszczone rośliny nie dają jeszcze wyraźnego punktu zainteresowania ani identyfikacji ThreeStyle. Korytarz ma już dobry rytm drzwi i lameli, ale dominuje brąz, mocno rozciągnięty wzór ścian i bardzo ciemne płaszczyzny drzwi/sufitu. Oznaczenia pokoi pojawiają się głównie przy interakcji, więc z dalszej pozycji przestrzeń słabo tłumaczy swoje funkcje.

Podstawa jest lokalnie wydzielona w `GroundedHub`, `HubShell` i `LeftWingCorridor`. Daje to możliwość odświeżenia bez ingerencji w wnętrze areny i bez przesuwania drzwi lub windy.

## FIX — potwierdzone renderowanie, ryzyka polityki jakości

### 1. Rozdzielczość composera w lobby

`src/app/b3p/page.tsx:235` uruchamia synchronizację composera tylko dla mobilnego Creator Roomu. Lobby ustawia własny DPR (`src/3d/world/hub/lobbyConfig.ts:35` i `:59`), którego zmiana nie synchronizuje istniejącego composera.

Pomiary publicznego podglądu:

| Profil / kontrolowana zmiana | DPR | Canvas | Bufor composera |
| --- | --- | --- | --- |
| Desktop lobby, viewport 1920×889 | 1.25 | 2400×1111 | 1920×889 |
| Mobile, viewport 844×390 | 1 | 844×390 | 844×390 |
| Mobile, ręcznie ustawiony DPR odpowiadający profilowi low | 0.75 | 633×292 | 844×390 |

Na desktopie scena jest za mała względem canvasu. Przy mobilnym DPR 0.75 compositor pozostaje większy niż canvas, więc jego koszt nie spada proporcjonalnie z rozdzielczością renderera. To potwierdzony rozjazd buforów; nie pomiar FPS. Błąd GL przy pomiarach: 0.

Proponowany FIX: synchronizacja rozdzielczości również dla pipeline'u lobby, bez zmiany areny. Regresja powinna sprawdzić canvas, oba bufory i SMAA po zmianach DPR oraz po przejściu między pokojem a lobby.

### 2. Sprawiedliwe obniżanie jakości

`LobbyPerformanceGovernor.tsx:33` mierzy klatki bez pomijania ukrytej strony, dużej przerwy delta ani rozgrzewki. Degradacja jest jednokierunkowa na tę wizytę. To potwierdzona polityka, a przypadkowe trwałe obniżenie po powrocie z innej aplikacji jest **ryzykiem do odtworzenia**, nie zaobserwowanym błędem użytkownika.

`GroundedHub.tsx:51` wybiera pierwsze N świateł. Mobile usuwa światło przy końcu korytarza, a mobile-low zostawia tylko światło lobby. Pozostaje oświetlenie ambient/hemisphere, więc korytarz nie jest całkowicie nieoświetlony. Lifting powinien zachować czytelność całej trasy również przy jednym świetle obszarowym.

## POLISH — proponowany kierunek wizualny

1. **Materiały:** spokojniejszy jasny tynk, ciemny sufit i drzwi z czytelnym detalem, drewno jako akcent oraz lepiej dobrana skala podłogi. Obecne UV zajmują jeden kwadrant atlasu na całą ścianę/podłogę niezależnie od rozmiaru (`lobbyGeometry.ts:17–26`), co rozciąga wzór. Nie wystarczy podnieść rozdzielczości tekstur. Najpierw ograniczyć agresywny wzór ścian; ewentualne powtarzanie w atlasie lub modułowanie powierzchni wymaga osobnej, sprawdzonej decyzji.
2. **Światło:** uporządkować istniejące źródła i ciepłe LED-y. Stworzyć miękkie wizualne podświetlenie przez statyczną grafikę lub materiał przy listwie; bez nowych cieni i dodatkowego mobilnego bloom. Utrzymać kontrast i widoczność końca korytarza na słabszym profilu.
3. **Tożsamość lobby:** jeden panel ThreeStyle na ścianie z lamelami, krótka informacja kierunkowa i poprawa istniejącej zieleni. Wykorzystać aktualne zasoby; dekoracje ścienne nie zmieniają szerokości przejść ani wymagają nowych colliderów.
4. **Oznaczenia:** lekkie stałe tabliczki z nazwą/numerem/statusami przy drzwiach oraz kierunek windy i Event Roomu. Tabliczki jako statyczne, zgrupowane elementy lub tekstury; nie wiele stale aktywnych ciężkich paneli DOM. Zachować istniejące callbacki i identyfikatory nawigacyjne. Liczby użytkowników są obecnie wpisane w konfigurację — nie przedstawiać ich jako danych live.

Nie kopiować wizualnej referencji dosłownie. Kierunek powinien być spójny z ciepłym Creator Roomem, lecz lobby i korytarz muszą pozostać łatwe do odczytania podczas przechodzenia.

## Wielkość pakietu i granice

- Główne miejsca pracy: `LobbyMaterials.ts`, `HubShell.tsx`, `GroundedHub.tsx`, `LeftWingCorridor.tsx` oraz atlas/generator materiałów.
- FIX jakości: `LobbyPerformanceGovernor.tsx`, integracja composera w `src/app/b3p/page.tsx` i odpowiednie testy. To nie jest kosmetyka jednego pliku.
- Proponowane dwa checkpointy: **A — jakość i czytelne materiały/światło**, **B — identyfikacja i oznaczenia**. Po A można skończyć z samodzielnie wartościowym rezultatem.
- Zachować aktualne kotwice drzwi, windy, ścian, wysokości i logikę przejść. Bez zmian colliderów, areny ani upper lounge.
- Recepcja, rozbudowany lounge, nowe pokoje, duże GLB, lustra/odbicia live i przebudowa korytarza to **EXPAND**, poza lekkim liftingiem.
- Materiały, podświetlenia i statyczne tabliczki mogą mieć mały koszt, ale nie są darmowe. Zachować instancing/merging i istniejący profil mobile; porównać liczbę wywołań sceny, zasoby i klatki przed/po. `gl.info.render` odczytany po postprocessingu obejmował ostatni pass, więc nie użyto go do deklarowania liczby draw calls całej sceny.

## Akceptacja po implementacji

- Porównanie tych samych kamer przed/po: lobby, środek korytarza, koniec korytarza i winda.
- Bufory renderer/composer/SMAA zgodne po zmianach DPR i stref; niski profil wciąż czytelny.
- Desktop i mobile: orientacja, tło/powrót, czytelne tabliczki, dotyk/E i wyjście/powrót windą.
- Testy lobby: geometria/UV, konfiguracja kotwic, widoczność i budżet atlasów; odpowiednie testy regresji jakości. TypeScript, lint zmienionych plików i build.
- Fizyczny telefon: krótki spacer i kilka minut działania; nie traktować desktopowej emulacji jako akceptacji wydajności.

Jeśli po tym zostaje czas: najpierw pamięć światła i głośności w Creator Roomie, następnie dopracowanie fullscreen i wskazówek. Biblioteka plików po odświeżeniu pozostaje osobnym większym pakietem.
