# ThreeStyle — Blok Trzech Pięter

Interaktywna przestrzeń muzyczna: Creator Room, media deck, lobby/hol i przejazdy windą. Next.js 16, React 19, Three.js / React Three Fiber, Supabase.

## Stan i wznowienie

**Aktualny checkpoint:** [2026-10-06 — zakres, weryfikacja i następne kroki](docs/checkpoint-resume-2026-10-06.md).

Creator Room odtwarza media i przyjmuje pliki sesyjne. Baza Supabase z profilami i prywatnym magazynem jest aktywna; formularz Auth i trwały upload w HUD wymagają podłączenia. Landing z drzwiami windy jest na etapie przygotowania grafik. `/` obecnie przekierowuje na `/b3p`, start w Creator Roomie.

## Lokalnie

```powershell
npm.cmd ci
npm.cmd run dev
```

Otwórz http://localhost:3001/b3p. Konfiguracja kont według [raportu Supabase](docs/supabase-accounts-media-2026-10-05.md) i [szablonu zmiennych](docs/supabase.env.example). `.env.local` oraz tokeny zarządzania pozostają prywatne.

```powershell
npm.cmd run test:accounts
npm.cmd run build
```

Wszystkie testy: Node `--experimental-strip-types --test` dla plików `tests/*.test.ts` i `tests/*.test.mjs`.

## Dokumentacja

- [Lobby i winda](docs/lobby-elevator-checkpoint-2026-10-04.md)
- [Charakter i koszt renderowania lobby](docs/lobby-character-checkpoint-2026-10-05.md)
- [Kierunek wejścia i logowania](docs/entry-login-direction-2026-10-05.md)
- [Kontrakt HUD i pokoju](docs/threestyle_hud_room_contract.md)

Emulacja mobile nie zastępuje pomiarów na telefonie. Zakres kolejnych prac: landing/Auth → wejście do lobby → prywatna biblioteka/upload; Arena/Stage 7 pozostają osobnym zakresem.