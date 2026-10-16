# ThreeStyle — Blok Trzech Pięter

Interaktywna przestrzeń muzyczna: Creator Room, media deck, lobby/hol i przejazdy windą. Next.js 16, React 19, Three.js / React Three Fiber, Supabase.

## Stan i wznowienie

**Aktualny checkpoint:** [2026-10-16 — opcjonalna twarz w kabinie](docs/creator-face-checkpoint-2026-10-16.md). Wejście i konta: [2026-10-13](docs/entry-mobile-correction-2026-10-13.md) i [2026-10-12](docs/entry-lobby-checkpoint-2026-10-12.md). Poprzedni pełny checkpoint: [2026-10-06](docs/checkpoint-resume-2026-10-06.md).

Strona główna ma responsywny landing, formularz Supabase i zsynchronizowane wejście przez drzwi do lobby; demo jest osobną, jawną opcją. `/b3p` nadal startuje w Creator Roomie. Baza profili i prywatny magazyn są aktywne. HUD nadal przyjmuje pliki sesyjne; trwały upload pozostaje do podłączenia. Test logowania, sesji po reload i wylogowania PASS; konfiguracja SMTP i dostarczanie wiadomości wymagają domknięcia przed otwartą rejestracją.

Media deck → Światło → **Twarz w kabinie** włącza opcjonalną mimikę do odtwarzanego audio. Model jest domyślnie wyłączony i nie korzysta z mikrofonu; oryginalny plik facecap pozostaje zachowany.

## Lokalnie

```powershell
npm.cmd ci
npm.cmd run dev
```

Otwórz http://localhost:3001 (landing) lub http://localhost:3001/b3p (bezpośrednie demo pokoju). Konfiguracja kont według [raportu Supabase](docs/supabase-accounts-media-2026-10-05.md) i [szablonu zmiennych](docs/supabase.env.example). `.env.local` oraz tokeny zarządzania pozostają prywatne.

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
