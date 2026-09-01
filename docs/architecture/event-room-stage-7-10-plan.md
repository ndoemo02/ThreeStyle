# Event Room Arena — Plan Stage 7–10 (dla Sonneta)

> **Cel**: Dokument gotowy do wklejenia w Claude Code jako kontekst.
> Sonnet powinien realizować etapy sekwencyjnie. Każdy etap kończy się walidacją + commitem.

---

## Stan na wejściu

Branch: `feat/event-room-arena`

| Etap | Commit | Status |
|---|---|---|
| 0–5 | `946f18f` i wcześniejsze | ✅ DONE |
| 6 Stage/Runway | `0f5f691` | ✅ DONE |
| Spacebar jump | `d68d1b5` | ✅ DONE |
| **7 Collision** | — | ⏳ NEXT |
| **8 Light Tuning** | — | ❌ |
| **9 Governor** | — | ❌ |
| **10 Verification** | — | ❌ |

---

## Kluczowe pliki (nie szukaj, czytaj bezpośrednio)

| Plik | Rola |
|---|---|
| `src/3d/navigation/eventRoomGeometrySpec.ts` | Geometry spec, footprinty, `isEventRoomPositionBlocked()`, `getEventRoomSurfaces()`, `footprintContains()` |
| `src/3d/navigation/eventRoomLayout.ts` | Compat layer, `constrainEventRoomMovement()`, `clampToEventRoomBounds()` — EDYTUJ TEN do kolizji |
| `src/3d/systems/BaseNavigationControls.tsx` | Ruch kamery, skok, `constrainCameraToZone()` |
| `src/3d/world/event-room/EventRoomLightRig.tsx` | Light rig — useFrame, RectAreaLight, emissive driver |
| `src/3d/world/event-room/eventRoomLightStates.ts` | 10 kanałów × 5 stanów, parametry bloom |
| `src/3d/world/event-room/EventRoomMaterials.tsx` | Materiały: `runwayLed`, `warmLed`, `stone`, `metal` itp. |
| `src/3d/world/event-room/EventRoomScene.tsx` | Top-level orchestrator |
| `src/3d/world/event-room/EventRoomShell.tsx` | Shell montujący Ceiling, LoungeBanks, Podium |
| `docs/architecture/adr-004-event-room-arena.md` | ADR z constraint'ami architektonicznymi |

---

## Stage 7: Footprints & Collision Alignment

### Cel
Zamiana legacy prostokątnych colliderów (`LEGACY_BLOCKED_VOLUMES`) na footprinty z `getEventRoomSurfaces()`. Gracz ma chodzić po eliptycznej podłodze i nie wchodzić w lounge/stage/runway.

### Co zrobić

#### 1. `eventRoomLayout.ts` — zamień `clampToEventRoomBounds`

**Przed:**
```ts
function clampToEventRoomBounds(x: number, z: number): EventRoomPoint2D {
  return [
    Math.min(10.85, Math.max(-10.85, x)),
    Math.min(11.95, Math.max(-7.1, z)),
  ];
}
```

**Po:** Zamień na eliptyczny clamp z geometry spec:
```ts
import {
  ARENA_CENTER, ARENA_RX, ARENA_RZ, EVENT_ROOM_CAMERA_RADIUS,
  getEventRoomSurfaces, footprintContains,
} from './eventRoomGeometrySpec';

function clampToArenaBounds(x: number, z: number): EventRoomPoint2D {
  const [cx, cz] = ARENA_CENTER;
  const dx = x - cx;
  const dz = z - cz;
  // Inscribe camera radius into arena ellipse
  const rx = ARENA_RX - EVENT_ROOM_CAMERA_RADIUS;
  const rz = ARENA_RZ - EVENT_ROOM_CAMERA_RADIUS;
  const t = (dx * dx) / (rx * rx) + (dz * dz) / (rz * rz);
  if (t <= 1) return [x, z];
  const scale = 1 / Math.sqrt(t);
  return [cx + dx * scale, cz + dz * scale];
}
```

#### 2. `eventRoomLayout.ts` — zamień `isEventRoomPositionBlocked` call

**Przed:**
```ts
if (!isEventRoomPositionBlocked(candidateX, candidateZ)) return [candidateX, candidateZ];
```

**Po:** Użyj arena surfaces zamiast legacy volumes:
```ts
function isArenaPositionBlocked(x: number, z: number): boolean {
  for (const surface of getEventRoomSurfaces()) {
    if (surface.access !== 'blocked') continue;
    if (footprintContains(surface.footprint, x, z)) return true;
  }
  return false;
}
```

Zamień wywołania `isEventRoomPositionBlocked` → `isArenaPositionBlocked` w `constrainEventRoomMovement`.

#### 3. `constrainEventRoomMovement` — użyj `clampToArenaBounds`

Zamień `clampToEventRoomBounds` → `clampToArenaBounds` (3 wywołania).

#### 4. NIE ruszaj `eventRoomGeometrySpec.ts`
Legacy code w spec jest zamrożony — usuniesz go dopiero po potwierdzeniu, że arena collision działa.

### Walidacja
```bash
npx tsc --noEmit
npx eslint src/3d/navigation/eventRoomLayout.ts
```
Uruchom dev server (`npm run dev`), wejdź na `localhost:3001/b3p?zone=event-room` i sprawdź:
- [ ] Gracz nie wychodzi poza elipsę
- [ ] Gracz nie wchodzi w lounge banki
- [ ] Gracz nie wchodzi w runway/stage
- [ ] Slide-along ścian działa (X-only i Z-only fallback)

### Commit
```
feat(event-room): stage 7 — arena elliptical collision from geometry spec
```

---

## Stage 8: Final Light Rig Tuning

### Cel
Kalibracja oświetlenia po kompletnej geometrii. Wcześniej wartości były tymczasowe.

### Co zrobić

#### 1. `eventRoomLightStates.ts` — dostrojenie `EMISSIVE_BASES`

Plik ma obiekt `EMISSIVE_BASES` (linia ~134). Kluczowe wartości do kalibracji:

| Kanał | Obecna wartość | Kontekst |
|---|---|---|
| `runwayLed` | 2.2 | Pasuje do runway, ale tiery stage mają nowe LEDy — sprawdź czy nie za jasne |
| `ceilingAccent` | 1.6 | Hero ring — sprawdź z nowym ceiling |
| `wallWash` | 0.8 | Wall emissive — może za ciemne z nową elliptyczną powłoką |
| `ambient` | 0.3 | Ogólny ambient — OK |

#### 2. `EventRoomLightRig.tsx` — RectAreaLight pozycje

RectAreaLight'y mają pozycje hardcoded. Po nowej geometrii (elliptical walls), sprawdź czy:
- Dwa boczne RectAreaLight'y świecą na kanapy (nie w próżnię)
- Główny RectAreaLight na ekran ma sensowny zasięg

#### 3. Bloom threshold

W `eventRoomLightStates.ts` jest `eventRoomBloomThreshold()` — sprawdź czy `luminanceThreshold` daje dobry efekt z nowymi materiałami.

### Walidacja
Wizualna — dev server, przejdź po scenie i sprawdź:
- [ ] LEDy runway świecą w kolorze tematu
- [ ] Hero ring nie jest za jasny/ciemny
- [ ] Kanapy doświetlone ciepłym światłem
- [ ] Brak "wypranych" (overblown) materiałów od bloom

### Commit
```
fix(event-room): stage 8 — calibrate light rig for arena geometry
```

---

## Stage 9: Quality Governor & Budget

### Cel
Dynamiczny governor, który obniża jakość renderowania kiedy FPS spada poniżej 30.

### Co zrobić

#### 1. Nowy plik `src/3d/world/event-room/EventRoomGovernor.tsx`

```tsx
"use client";
import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

type QualityTier = 'full' | 'degraded';

export function useEventRoomGovernor() {
  const { gl } = useThree();
  const tier = useRef<QualityTier>('full');
  const frameTimes = useRef<number[]>([]);
  const lastCheck = useRef(0);

  useFrame((_, delta) => {
    frameTimes.current.push(delta);
    const now = performance.now();

    // Check every 2 seconds
    if (now - lastCheck.current < 2000) return;
    lastCheck.current = now;

    const avg = frameTimes.current.reduce((a, b) => a + b, 0) / frameTimes.current.length;
    const fps = 1 / avg;
    frameTimes.current = [];

    if (fps < 28 && tier.current === 'full') {
      tier.current = 'degraded';
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
    } else if (fps > 45 && tier.current === 'degraded') {
      tier.current = 'full';
      gl.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    }
  });

  return tier;
}
```

#### 2. Montaż w `EventRoomScene.tsx`

Dodaj `useEventRoomGovernor()` w komponencie sceny. W trybie `degraded`:
- Zmniejsz `pixelRatio` (już robi hook)
- Opcjonalnie: wyłącz hero ring animację, zmniejsz radialSegments ceiling

### Walidacja
```bash
npx tsc --noEmit
npx eslint src/3d/world/event-room/EventRoomGovernor.tsx
```
- [ ] Na dobrej maszynie FPS stabilne, tier = `full`
- [ ] Throttle CPU w DevTools → tier przełącza na `degraded`, pixelRatio spada

### Commit
```
feat(event-room): stage 9 — quality governor with dynamic pixel ratio
```

---

## Stage 10: Final Verification

### Cel
Sprawdzenie kompletności areny i zamknięcie brancha.

### Checklist

#### Automatyczne
```bash
npx tsc --noEmit              # 0 errors
npx eslint src/3d/             # scoped lint, 0 new errors
npm run build                  # production build passes
git diff --check               # no whitespace issues
```

#### Manualne (dev server)
- [ ] Desktop Chrome: chodzenie po elipsie, collision, jump, E-key HUD
- [ ] Desktop: ekran TOP 10 wyświetla się poprawnie
- [ ] Desktop: bloom na runway LEDach
- [ ] Mobile Chrome: joystick + touch look, collision
- [ ] Mobile: brak crash/OOM po 60s
- [ ] Przejście Creator Room → Event Room → Creator Room (round trip)

#### Cleanup
1. Usuń `LEGACY_BLOCKED_VOLUMES` i `LEGACY_RIGHT_LOUNGE_COLLIDER` z `eventRoomGeometrySpec.ts` (linie 487–516)
2. Usuń `EVENT_ROOM_NAV_SURFACES` z `eventRoomLayout.ts` (linie 86–129) — zastąpiony przez `getEventRoomSurfaces()`
3. Usuń legacy render-facing constants z `eventRoomLayout.ts` (linie 39–61) — jeśli żaden plik ich nie importuje
4. Zaktualizuj `task_plan.md` i `progress.md`

### Commit
```
chore(event-room): stage 10 — remove legacy collision, final verification
```

---

## Zasady dla Sonneta

> [!IMPORTANT]
> 1. **Nie szukaj plików** — ścieżki są powyżej. Czytaj bezpośrednio.
> 2. **Jeden etap = jeden commit**. Waliduj przed commitem.
> 3. **Nie refaktoruj poza scope** — nie ruszaj CreatorRoom, HUD, lobby.
> 4. **`npx tsc --noEmit` musi przechodzić** po każdej zmianie.
> 5. **Wizualny test** to `localhost:3001/b3p?zone=event-room` (port 3001).
> 6. **ADR-004 constraint**: zero TorusGeometry, zero GLB — proceduralna geometria only.
> 7. **Headless canvas = czarny** — Playwright nie testuje 3D. Tylko TS + lint.
