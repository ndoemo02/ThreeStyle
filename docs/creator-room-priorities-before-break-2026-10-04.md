# Creator Room — priorytety przed przerwą, 2026-10-04

## Punkt powrotu

- Root: `C:\ThreeStyle.ai`.
- Branch: `feat/event-room-arena`.
- HEAD: `94c72f8cfa2a8413939122354189306b3e3199e0` — synchronizacja rozdzielczości postprocessingu z mobilnym DPR.
- Ostatni podgląd z rozmowy: https://three-style-h4sqjkqqu-freeflow-build.vercel.app/b3p.
- Ten audyt obejmuje kod i dokumentację. Nie uruchamiano nowych testów ani nie sprawdzano ponownie statusu Vercel. Historyczne wyniki ostatniej poprawki są w `docs/creator-room-mobile-sharpness-fix-2026-10-04.md`.
- Nie ma nowych zmian w kodzie aplikacji. W working tree pozostają wcześniejsze zmiany obrazów referencyjnych, `.playwright-mcp/` i dwa testowe GLB. Nie włączać ich do commitów Creator Roomu.
- Zakres: Creator Room, HUD, media i upload. Arena/Event Room, Stage 7, collidery i upper lounge pozostają zamrożone.

## Zalecana kolejność

| Kolejność | Rodzaj | Pakiet | Wartość / wielkość |
| --- | --- | --- | --- |
| 1 | Weryfikacja, FIX tylko po odtworzeniu | Mobilne odtwarzanie, przerwania systemowe i kamera | Chroni działającą pętlę demo. Mały audyt; rozmiar poprawki zależy od wyniku. |
| 2 | POLISH | Pamięć światła i głośności | Pokój wraca do osobistych ustawień po odświeżeniu. Mały pakiet. |
| 3 | POLISH | Czytelne sterowanie i fullscreen | Łatwiejsze pierwsze użycie na telefonie i desktopie. Mały pakiet. |
| 4 | POLISH, warunkowo | Wybór jakości: Auto / Płynność / Ostrość | Dopiero jeśli fizyczny test aktualnej poprawki nadal wskazuje problem. Średni pakiet. |
| 5 | EXPAND | Biblioteka lokalna zachowana po odświeżeniu | Duża wartość dla osobistego pokoju; większy pakiet ze stanami błędów i usuwaniem plików. |

Rekomendacja na ostatni dzień: zweryfikować punkt 1, następnie domknąć 2 i 3 w osobnych checkpointach. Nie rozpoczynać kilku rozszerzeń jednocześnie. Każdy pakiet ma kończyć się działającym demo i krótką informacją o weryfikacji.

## 1. Stabilność mobile — co jest dowodem, a co hipotezą

Potwierdzony błąd rozdzielczości renderera i composera został poprawiony w HEAD. Raport poprzedniej poprawki opisuje testy DPR, build, TypeScript, lint i 22 testy. Nadal brakuje akceptacji ostrości, płynności i temperatury na fizycznym telefonie po tej poprawce.

`src/hooks/useCreatorMedia.ts:57` wznawia AudioContext w stanie `suspended` podczas inicjowania odtwarzania. Hook nie obserwuje zmian stanu kontekstu ani powrotu widoczności strony. To uzasadnia test przerwań, ale nie dowodzi obecnego błędu na telefonie.

Lista akceptacji na Redmi Note 14 Pro+ i, jeśli dostępny, słabszym urządzeniu:

- [ ] Audio i wideo: 5–10 minut działania, przewijanie, pauza, zmiana pliku, światło reagujące na muzykę.
- [ ] Zamknięcie HUD-u pozostawia odtwarzanie; ponowne otwarcie pokazuje zgodny stan.
- [ ] Obrót telefonu i fullscreen nie psują proporcji, ostrości ani przycisków.
- [ ] Zablokowanie/odblokowanie telefonu i przejście do innej aplikacji: po powrocie stan HUD-u jest prawdziwy; jeśli przeglądarka wymaga gestu, odtwarzanie wraca po jednym kliknięciu.
- [ ] Kamera: zgoda i odmowa, anulowanie oczekiwania, przód/tył, zamknięcie kamery, wyjście windą zatrzymujące jej strumień.
- [ ] Wejście → HUD → plik → odtwarzanie → ekran i światło → zamknięcie HUD → wyjście windą.

Jeśli test ujawni błąd, najpierw zapisać kroki i dowód, potem zrobić minimalną poprawkę. Nie zwiększać DPR ani liczby lamp w ciemno.

## 2. Pamięć pokoju

Aktualnie głośność zaczyna się od `0.8` (`src/hooks/useCreatorMedia.ts:27`), a światło od presetu warm (`src/stores/useHudStore.ts:41`). Oba ustawienia są ulotne.

Zakres małego pakietu: zapis wersjonowanych, walidowanych preferencji lokalnych — preset, jasność, kolor LED, siła reakcji oraz głośność. Bez zapisywania referencji DOM, blob URL, strumienia kamery czy stanu odtwarzania. Odświeżenie nie może samoczynnie uruchamiać muzyki ani kamery. Niedostępny zapis lokalny nie może blokować pokoju.

Akceptacja: zmienić ustawienia, odświeżyć ten sam adres, sprawdzić odtworzenie preferencji i reset do domyślnych. Sprawdzić uszkodzony zapis i brak dostępu do pamięci. Preferencje przeglądarki należą do konkretnego origin — testować na jednym stałym adresie, a nie kolejnych domenach preview.

## 3. Czytelna obsługa demo

`src/app/b3p/page.tsx:134` pokazuje techniczne B3P/ZONE i instrukcje desktopowe. W Creator Roomie warto zastąpić je krótkimi polskimi wskazówkami odpowiednimi dla aktualnego urządzenia. Zachować widok pokoju i widoczny przycisk Media deck; nie dodawać dużego obowiązkowego samouczka.

`src/app/b3p/page.tsx:162` wywołuje tylko wejście w fullscreen. Dopracować przełączanie wejście/wyjście, etykietę zgodną ze stanem oraz czytelną reakcję na brak wsparcia lub odmowę. Zmiany ograniczyć do obsługi Creator Roomu, bez przebudowy innych stref.

Akceptacja: desktop E/kursor/laptop/HUD, mobile dotyk i przyciski, wejście/wyjście fullscreen oraz zamknięcie HUD bez przerwania muzyki.

## 4. Jakość obrazu — dopiero po fizycznym teście

`src/3d/world/rooms/CreatorMobileQuality.tsx:28` ogranicza maksymalny DPR do 1.5; obecna polityka adaptuje rozdzielczość do trwałego obciążenia. Domyślny tryb Auto należy zachować.

Ewentualny wybór Płynność/Ostrość powinien zmieniać bezpieczne preferencje polityki, zachowując limity i możliwość obniżenia jakości przy przeciążeniu. Oddzielnie ocenić źródłowe grafiki i filtrowanie tekstur, jeżeli po naprawie renderingu nadal rozmywa się konkretne logo lub powierzchnia. Nie obiecywać wzrostu FPS ani idealnej ostrości na wszystkich telefonach.

## 5. Biblioteka po odświeżeniu — osobny EXPAND

Upload działa lokalnie w bieżącej sesji: `src/hooks/useCreatorMedia.ts:136` tworzy object URL, a lista plików jest w stanie React. Komunikat HUD-u uczciwie opisuje ten zakres; utrata plików po odświeżeniu nie jest regresją.

Kolejny wartościowy etap to biblioteka na tym urządzeniu, np. z IndexedDB: zapis samych plików i metadanych, ponowne tworzenie object URL, usuwanie, obsługa braku miejsca i błędu zapisu. Nie nazywać jej biblioteką w chmurze ani gwarantowanym trwałym archiwum. Wymaga osobnego projektu stanów i testów — po domknięciu stabilności i małych poprawek.

## Prompt wznowienia

> Kontynuujemy wyłącznie Creator Room/HUD/media w C:\ThreeStyle.ai. Przeczytaj docs/creator-room-priorities-before-break-2026-10-04.md oraz raport ostatniego checkpointu. Potwierdź root, branch, HEAD i status; zachowaj obce zmiany. Arena, Stage 7, collidery i upper lounge są zamrożone. Ustal, które punkty zostały już zaakceptowane i wykonane, a potem realizuj następny uzgodniony mały pakiet. Oddziel historyczne wyniki testów od nowej weryfikacji i akceptacji na telefonie.
