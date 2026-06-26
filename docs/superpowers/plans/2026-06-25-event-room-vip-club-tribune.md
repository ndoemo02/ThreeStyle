# Event Room VIP Club Tribune Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first playable greybox of the ThreeStyle Event Room as a VIP Club Tribune with portal entry, exit, Rose/Galaxy themes, and an automatic TOP 10 show flow with host/admin override hooks.

**Architecture:** Add Event Room as an isolated lazy-loaded scene branch, separate from `CreatorRoomMVP`, `HudOverlay`, and `NativeMobileJoystick`. Keep the first milestone code-first and asset-light: procedural geometry, reusable materials, instanced repeated sections, simple screen content, and local show state that can be synced later.

**Tech Stack:** Next.js App Router, React 19, TypeScript, React Three Fiber, Drei HTML, Three.js, Zustand navigation store, existing `RoomDoor` interaction pattern.

---

## Scope and guardrails

- Do not edit `C:\ThreeStyle.ai\src\3d\world\rooms\CreatorRoomMVP.tsx`.
- Do not edit `C:\ThreeStyle.ai\src\components\HudOverlay.tsx`.
- Do not edit `C:\ThreeStyle.ai\src\components\ui\NativeMobileJoystick.tsx`.
- Do not add downloaded assets in this greybox pass.
- Keep `GroundedHub({ onEnterRoom })` public interface unchanged.
- Keep the existing room and lobby routes functional.
- Commit after each task that produces a coherent state.

## File structure

Create:

- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomTypes.ts`
  - Owns Event Room ids, theme/show types, local mock TOP 10 data, and theme tokens.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomShowController.ts`
  - Pure show reducer/action helpers and deterministic auto-advance helpers.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomMaterials.tsx`
  - Centralized memoized Three materials for the greybox scene.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomInstancing.tsx`
  - Small reusable instanced box helper for seats, ribs, steps, LEDs, and panels.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomShell.tsx`
  - Static VIP Club Tribune geometry: room shell, podest/runway, tribune, wood sections, seating blocks.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomScreens.tsx`
  - Curved-looking segmented screen wall and TOP 10 screen cards.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomLighting.tsx`
  - Hemisphere/ambient/rect lights and emissive theme accents.
- `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomScene.tsx`
  - Top-level scene glue, local show state, theme preview keybinds, exit portal.
- `C:\ThreeStyle.ai\src\3d\world\event-room\index.ts`
  - Public export for dynamic import.

Modify:

- `C:\ThreeStyle.ai\src\3d\navigation\navigationConfig.ts`
  - Add `EVENT_ROOM_ZONE` and camera preset.
- `C:\ThreeStyle.ai\src\app\b3p\page.tsx`
  - Dynamically load Event Room and route `activeZone === EVENT_ROOM_ZONE` to it.
- `C:\ThreeStyle.ai\src\3d\world\corridors\LeftWingCorridor.tsx`
  - Add active Event Room portal hitbox using existing `RoomDoor`.

Test/validate:

- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Manual browser smoke test at `npm run dev`: room → elevator/lobby → Event Room → lobby → room.

---

### Task 1: Add Event Room zone and camera preset

**Files:**

- Modify: `C:\ThreeStyle.ai\src\3d\navigation\navigationConfig.ts`

- [ ] **Step 1: Add the zone constant and widen the primary zone type**

Change the top of `navigationConfig.ts` to include `EVENT_ROOM_ZONE`:

```ts
import * as THREE from 'three';

export const ROOM_ZONE = 'room1' as const;
export const HUB_ZONE = 'hub' as const;
export const EVENT_ROOM_ZONE = 'event-room' as const;

export type PrimaryZoneId = typeof ROOM_ZONE | typeof HUB_ZONE | typeof EVENT_ROOM_ZONE;
```

- [ ] **Step 2: Add an Event Room camera preset**

Add this function after `getHubCameraPreset`:

```ts
export function getEventRoomCameraPreset(width: number, height: number): CameraPreset {
  if (height > width) {
    return {
      position: [0, 2.0, 9.6],
      target: [0, 1.75, 0.5],
      fov: 62,
    };
  }

  if (width < 1024) {
    return {
      position: [0, 2.0, 9.2],
      target: [0, 1.7, 0.25],
      fov: 60,
    };
  }

  return {
    position: [0, 2.05, 9.8],
    target: [0, 1.65, -0.4],
    fov: 58,
  };
}
```

- [ ] **Step 3: Route camera presets by zone**

Replace `getCameraPreset` with:

```ts
export function getCameraPreset(zone: string, width: number, height: number): CameraPreset {
  if (zone === HUB_ZONE) return getHubCameraPreset(width, height);
  if (zone === EVENT_ROOM_ZONE) return getEventRoomCameraPreset(width, height);
  return getRoomCameraPreset(width, height);
}
```

- [ ] **Step 4: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no new TypeScript errors from `navigationConfig.ts`.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/3d/navigation/navigationConfig.ts
git commit -m "feat: add event room navigation zone"
```

---

### Task 2: Add Event Room types, themes, and show data

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomTypes.ts`

- [ ] **Step 1: Create the Event Room types file**

Create `EventRoomTypes.ts` with:

```ts
export type EventRoomThemeId = 'rose' | 'galaxy';

export type EventRoomShowPhase =
  | 'idle'
  | 'intro'
  | 'countdown'
  | 'trackReveal'
  | 'finale'
  | 'afterloop';

export type EventRoomQualityTier = 'mobile' | 'desktop' | 'degraded';

export type TopTenTrack = {
  rank: number;
  title: string;
  artist: string;
  accent: string;
};

export type EventRoomThemeTokens = {
  id: EventRoomThemeId;
  label: string;
  background: string;
  floor: string;
  stone: string;
  wood: string;
  woodDark: string;
  metal: string;
  seat: string;
  screenPrimary: string;
  screenSecondary: string;
  led: string;
  ledSoft: string;
  haze: string;
};

export type EventRoomShowState = {
  theme: EventRoomThemeId;
  phase: EventRoomShowPhase;
  currentRank: number;
  isPaused: boolean;
  isHostOverrideActive: boolean;
};

export const EVENT_ROOM_EXIT_ZONE = 'hub';

export const EVENT_ROOM_THEMES: Record<EventRoomThemeId, EventRoomThemeTokens> = {
  rose: {
    id: 'rose',
    label: 'ROSE MODE',
    background: '#160f12',
    floor: '#171313',
    stone: '#201a18',
    wood: '#7a462a',
    woodDark: '#3a2117',
    metal: '#0c0b0b',
    seat: '#211617',
    screenPrimary: '#ff6fb3',
    screenSecondary: '#ffb1d2',
    led: '#ff8abf',
    ledSoft: '#d5a06b',
    haze: '#2b111d',
  },
  galaxy: {
    id: 'galaxy',
    label: 'GALAXY MODE',
    background: '#070710',
    floor: '#101116',
    stone: '#171923',
    wood: '#6b3f25',
    woodDark: '#2c1a12',
    metal: '#08090d',
    seat: '#151722',
    screenPrimary: '#7a5cff',
    screenSecondary: '#28b8ff',
    led: '#8f7aff',
    ledSoft: '#2fb7ff',
    haze: '#0b1028',
  },
};

export const EVENT_ROOM_TOP_TEN: TopTenTrack[] = [
  { rank: 10, title: 'Late Night Draft', artist: 'ThreeStyle', accent: '#f59e0b' },
  { rank: 9, title: 'Velvet Signal', artist: 'Mira Vox', accent: '#fb7185' },
  { rank: 8, title: 'Floor Light', artist: 'North Deck', accent: '#38bdf8' },
  { rank: 7, title: 'Amber Loop', artist: 'Kade Bloom', accent: '#f97316' },
  { rank: 6, title: 'Glass Echo', artist: 'Soma Lane', accent: '#a78bfa' },
  { rank: 5, title: 'Afterimage', artist: 'Vanta Club', accent: '#22d3ee' },
  { rank: 4, title: 'Rose Voltage', artist: 'Luma Saint', accent: '#f472b6' },
  { rank: 3, title: 'Orbit Room', artist: 'Cassini FM', accent: '#818cf8' },
  { rank: 2, title: 'Golden Hourline', artist: 'NOVA/NOIR', accent: '#facc15' },
  { rank: 1, title: 'Crown Frequency', artist: 'Freeflow', accent: '#ffffff' },
];

export const INITIAL_EVENT_ROOM_SHOW_STATE: EventRoomShowState = {
  theme: 'rose',
  phase: 'idle',
  currentRank: 10,
  isPaused: false,
  isHostOverrideActive: false,
};
```

- [ ] **Step 2: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/3d/world/event-room/EventRoomTypes.ts
git commit -m "feat: add event room show types"
```

---

### Task 3: Add pure show controller

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomShowController.ts`

- [ ] **Step 1: Create reducer/action helpers**

Create `EventRoomShowController.ts` with:

```ts
import type { EventRoomShowState, EventRoomThemeId } from './EventRoomTypes';
import { INITIAL_EVENT_ROOM_SHOW_STATE } from './EventRoomTypes';

export type EventRoomShowAction =
  | { type: 'START' }
  | { type: 'AUTO_ADVANCE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'NEXT' }
  | { type: 'PREVIOUS' }
  | { type: 'FINALE' }
  | { type: 'RESET' }
  | { type: 'SET_THEME'; theme: EventRoomThemeId; hostOverride?: boolean };

export function eventRoomShowReducer(
  state: EventRoomShowState,
  action: EventRoomShowAction,
): EventRoomShowState {
  switch (action.type) {
    case 'START':
      return {
        ...state,
        phase: 'intro',
        currentRank: 10,
        isPaused: false,
        isHostOverrideActive: false,
      };

    case 'AUTO_ADVANCE':
      return getNextAutomaticShowState(state);

    case 'PAUSE':
      return { ...state, isPaused: true, isHostOverrideActive: true };

    case 'RESUME':
      return { ...state, isPaused: false, isHostOverrideActive: true };

    case 'NEXT': {
      if (state.phase === 'idle') return { ...state, phase: 'intro', isHostOverrideActive: true };
      if (state.phase === 'intro') return { ...state, phase: 'countdown', currentRank: 10, isHostOverrideActive: true };
      if (state.currentRank > 1) return { ...state, phase: 'trackReveal', currentRank: state.currentRank - 1, isHostOverrideActive: true };
      return { ...state, phase: 'finale', currentRank: 1, isHostOverrideActive: true };
    }

    case 'PREVIOUS': {
      if (state.phase === 'finale') return { ...state, phase: 'trackReveal', currentRank: 1, isHostOverrideActive: true };
      if (state.currentRank < 10) return { ...state, phase: 'trackReveal', currentRank: state.currentRank + 1, isHostOverrideActive: true };
      return { ...state, phase: 'intro', currentRank: 10, isHostOverrideActive: true };
    }

    case 'FINALE':
      return { ...state, phase: 'finale', currentRank: 1, isPaused: false, isHostOverrideActive: true };

    case 'RESET':
      return { ...INITIAL_EVENT_ROOM_SHOW_STATE, theme: state.theme };

    case 'SET_THEME':
      return {
        ...state,
        theme: action.theme,
        isHostOverrideActive: action.hostOverride ?? state.isHostOverrideActive,
      };
  }
}

export function getNextAutomaticShowState(state: EventRoomShowState): EventRoomShowState {
  if (state.isPaused) return state;

  if (state.phase === 'idle') return { ...state, phase: 'intro' };
  if (state.phase === 'intro') return { ...state, phase: 'countdown', currentRank: 10 };
  if (state.phase === 'countdown') return { ...state, phase: 'trackReveal' };
  if (state.phase === 'trackReveal' && state.currentRank > 1) {
    return { ...state, phase: 'countdown', currentRank: state.currentRank - 1 };
  }
  if (state.phase === 'trackReveal') return { ...state, phase: 'finale', currentRank: 1 };
  if (state.phase === 'finale') return { ...state, phase: 'afterloop' };

  return state;
}
```

- [ ] **Step 2: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/3d/world/event-room/EventRoomShowController.ts
git commit -m "feat: add event room show controller"
```

---

### Task 4: Add materials and instancing helpers

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomMaterials.tsx`
- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomInstancing.tsx`

- [ ] **Step 1: Create memoized material hook**

Create `EventRoomMaterials.tsx` with:

```tsx
"use client";

import { useMemo } from 'react';
import * as THREE from 'three';
import type { EventRoomThemeTokens } from './EventRoomTypes';

export type EventRoomMaterials = {
  floor: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  seat: THREE.MeshStandardMaterial;
  screen: THREE.MeshStandardMaterial;
  screenDim: THREE.MeshStandardMaterial;
  led: THREE.MeshStandardMaterial;
};

export function useEventRoomMaterials(theme: EventRoomThemeTokens): EventRoomMaterials {
  return useMemo(() => ({
    floor: new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.62, metalness: 0.16 }),
    stone: new THREE.MeshStandardMaterial({ color: theme.stone, roughness: 0.78, metalness: 0.08 }),
    wood: new THREE.MeshStandardMaterial({ color: theme.wood, roughness: 0.58, metalness: 0.04 }),
    woodDark: new THREE.MeshStandardMaterial({ color: theme.woodDark, roughness: 0.72, metalness: 0.02 }),
    metal: new THREE.MeshStandardMaterial({ color: theme.metal, roughness: 0.72, metalness: 0.34 }),
    seat: new THREE.MeshStandardMaterial({ color: theme.seat, roughness: 0.86, metalness: 0.02 }),
    screen: new THREE.MeshStandardMaterial({
      color: theme.screenPrimary,
      emissive: theme.screenPrimary,
      emissiveIntensity: 1.35,
      roughness: 0.42,
      metalness: 0.02,
    }),
    screenDim: new THREE.MeshStandardMaterial({
      color: theme.screenSecondary,
      emissive: theme.screenSecondary,
      emissiveIntensity: 0.68,
      roughness: 0.55,
      metalness: 0.02,
    }),
    led: new THREE.MeshStandardMaterial({
      color: theme.led,
      emissive: theme.led,
      emissiveIntensity: 1.8,
      roughness: 0.4,
      metalness: 0.02,
    }),
  }), [theme]);
}
```

- [ ] **Step 2: Create the instanced box helper**

Create `EventRoomInstancing.tsx` with:

```tsx
"use client";

import { useMemo } from 'react';
import * as THREE from 'three';

export type EventRoomInstanceTransform = {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
};

export function EventRoomInstancedBoxes({
  size,
  transforms,
  material,
}: {
  size: [number, number, number];
  transforms: EventRoomInstanceTransform[];
  material: THREE.Material;
}) {
  const geometry = useMemo(() => new THREE.BoxGeometry(size[0], size[1], size[2]), [size]);

  return (
    <instancedMesh
      args={[geometry, material, transforms.length]}
      onUpdate={(mesh) => {
        const object = new THREE.Object3D();
        transforms.forEach((transform, index) => {
          object.position.set(...transform.position);
          object.rotation.set(...(transform.rotation ?? [0, 0, 0]));
          object.scale.set(...(transform.scale ?? [1, 1, 1]));
          object.updateMatrix();
          mesh.setMatrixAt(index, object.matrix);
        });
        mesh.instanceMatrix.needsUpdate = true;
      }}
    />
  );
}
```

- [ ] **Step 3: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/3d/world/event-room/EventRoomMaterials.tsx src/3d/world/event-room/EventRoomInstancing.tsx
git commit -m "feat: add event room rendering helpers"
```

---

### Task 5: Build the VIP Club Tribune shell

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomShell.tsx`

- [ ] **Step 1: Create the shell component**

Create `EventRoomShell.tsx` with:

```tsx
"use client";

import { useMemo } from 'react';
import * as THREE from 'three';
import type { EventRoomMaterials } from './EventRoomMaterials';
import { EventRoomInstancedBoxes, type EventRoomInstanceTransform } from './EventRoomInstancing';

function Box({
  position,
  size,
  material,
  rotation = [0, 0, 0],
}: {
  position: [number, number, number];
  size: [number, number, number];
  rotation?: [number, number, number];
  material: THREE.Material;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function EventRoomShell({ materials }: { materials: EventRoomMaterials }) {
  const tribuneSteps = useMemo<EventRoomInstanceTransform[]>(() => {
    const rows: EventRoomInstanceTransform[] = [];
    for (let row = 0; row < 4; row += 1) {
      rows.push({ position: [0, 0.22 + row * 0.34, 3.1 + row * 0.95], scale: [1 - row * 0.08, 1, 1] });
      rows.push({ position: [-4.2 - row * 0.35, 0.22 + row * 0.34, 1.3 + row * 0.65], rotation: [0, -0.38, 0], scale: [0.72, 1, 1] });
      rows.push({ position: [4.2 + row * 0.35, 0.22 + row * 0.34, 1.3 + row * 0.65], rotation: [0, 0.38, 0], scale: [0.72, 1, 1] });
    }
    return rows;
  }, []);

  const seats = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = -4; col <= 4; col += 1) {
        transforms.push({ position: [col * 0.82, 0.58 + row * 0.34, 3.0 + row * 0.95] });
      }
    }
    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        transforms.push({ position: [-4.35 - row * 0.35, 0.58 + row * 0.34, -0.35 + col * 0.86], rotation: [0, -0.38, 0] });
        transforms.push({ position: [4.35 + row * 0.35, 0.58 + row * 0.34, -0.35 + col * 0.86], rotation: [0, 0.38, 0] });
      }
    }
    return transforms;
  }, []);

  const woodRibs = useMemo<EventRoomInstanceTransform[]>(() => {
    const transforms: EventRoomInstanceTransform[] = [];
    for (let x = -6.8; x <= 6.8; x += 0.48) {
      transforms.push({ position: [x, 2.8, -5.42] });
    }
    for (let z = -4.6; z <= 5.2; z += 0.58) {
      transforms.push({ position: [-7.18, 2.5, z], rotation: [0, Math.PI / 2, 0] });
      transforms.push({ position: [7.18, 2.5, z], rotation: [0, Math.PI / 2, 0] });
    }
    return transforms;
  }, []);

  const ledStrips = useMemo<EventRoomInstanceTransform[]>(() => [
    { position: [0, 0.08, -1.2] },
    { position: [0, 0.31, 1.45] },
    { position: [0, 0.64, 3.08] },
    { position: [0, 0.98, 4.04] },
    { position: [-3.2, 0.1, -1.2], rotation: [0, 0.48, 0], scale: [0.52, 1, 1] },
    { position: [3.2, 0.1, -1.2], rotation: [0, -0.48, 0], scale: [0.52, 1, 1] },
  ], []);

  return (
    <group>
      <Box position={[0, -0.06, 0]} size={[16, 0.12, 14]} material={materials.floor} />
      <Box position={[0, 2.45, -5.85]} size={[15.6, 4.9, 0.3]} material={materials.stone} />
      <Box position={[-7.85, 2.45, 0]} size={[0.3, 4.9, 12]} material={materials.stone} />
      <Box position={[7.85, 2.45, 0]} size={[0.3, 4.9, 12]} material={materials.stone} />
      <Box position={[0, 4.92, 0]} size={[16, 0.16, 14]} material={materials.metal} />

      <Box position={[0, 0.16, -2.25]} size={[4.4, 0.32, 2.2]} material={materials.stone} />
      <Box position={[0, 0.14, -0.25]} size={[2.1, 0.28, 3.3]} material={materials.stone} />
      <Box position={[0, 0.36, -0.25]} size={[1.86, 0.08, 3.1]} material={materials.metal} />

      <EventRoomInstancedBoxes size={[8.8, 0.26, 0.72]} material={materials.woodDark} transforms={tribuneSteps} />
      <EventRoomInstancedBoxes size={[0.58, 0.24, 0.52]} material={materials.seat} transforms={seats} />
      <EventRoomInstancedBoxes size={[0.1, 4.15, 0.12]} material={materials.wood} transforms={woodRibs} />
      <EventRoomInstancedBoxes size={[7.4, 0.035, 0.055]} material={materials.led} transforms={ledStrips} />

      <Box position={[-5.95, 1.0, -2.0]} size={[1.2, 1.8, 3.1]} material={materials.woodDark} rotation={[0, -0.18, 0]} />
      <Box position={[5.95, 1.0, -2.0]} size={[1.2, 1.8, 3.1]} material={materials.woodDark} rotation={[0, 0.18, 0]} />
    </group>
  );
}
```

- [ ] **Step 2: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/3d/world/event-room/EventRoomShell.tsx
git commit -m "feat: add event room greybox shell"
```

---

### Task 6: Add screens and lighting

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomScreens.tsx`
- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomLighting.tsx`

- [ ] **Step 1: Create TOP 10 screens**

Create `EventRoomScreens.tsx` with:

```tsx
"use client";

import { Html } from '@react-three/drei';
import type { EventRoomMaterials } from './EventRoomMaterials';
import type { EventRoomShowState, EventRoomThemeTokens, TopTenTrack } from './EventRoomTypes';
import { EVENT_ROOM_TOP_TEN } from './EventRoomTypes';

function findTrack(rank: number): TopTenTrack {
  return EVENT_ROOM_TOP_TEN.find(track => track.rank === rank) ?? EVENT_ROOM_TOP_TEN[0];
}

export function EventRoomScreens({
  materials,
  show,
  theme,
}: {
  materials: EventRoomMaterials;
  show: EventRoomShowState;
  theme: EventRoomThemeTokens;
}) {
  const track = findTrack(show.currentRank);
  const title = show.phase === 'idle' ? 'WEEKLY TOP 10' : `#${track.rank} ${track.title}`;
  const subtitle = show.phase === 'idle' ? theme.label : track.artist;

  return (
    <group>
      <mesh position={[0, 2.55, -5.66]}>
        <boxGeometry args={[6.8, 2.85, 0.08]} />
        <primitive object={materials.screen} attach="material" />
      </mesh>
      <mesh position={[-4.05, 2.35, -5.45]} rotation={[0, 0.22, 0]}>
        <boxGeometry args={[2.1, 2.2, 0.08]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>
      <mesh position={[4.05, 2.35, -5.45]} rotation={[0, -0.22, 0]}>
        <boxGeometry args={[2.1, 2.2, 0.08]} />
        <primitive object={materials.screenDim} attach="material" />
      </mesh>

      <Html transform position={[0, 2.58, -5.59]} rotation={[0, 0, 0]} distanceFactor={4.8} pointerEvents="none">
        <div style={{
          width: '420px',
          height: '180px',
          border: `1px solid ${theme.led}99`,
          background: 'rgba(4,4,8,.42)',
          color: '#fff7ef',
          fontFamily: 'monospace',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          letterSpacing: '.12em',
          boxShadow: `0 0 40px ${theme.led}55 inset`,
        }}>
          <div style={{ fontSize: '14px', color: theme.ledSoft }}>{show.phase.toUpperCase()}</div>
          <div style={{ fontSize: '34px', fontWeight: 800, marginTop: '10px' }}>{title}</div>
          <div style={{ fontSize: '14px', marginTop: '12px', color: '#f4dfca' }}>{subtitle}</div>
        </div>
      </Html>
    </group>
  );
}
```

- [ ] **Step 2: Create Event Room lighting**

Create `EventRoomLighting.tsx` with:

```tsx
"use client";

import type { EventRoomQualityTier, EventRoomThemeTokens } from './EventRoomTypes';

export function EventRoomLighting({
  theme,
  qualityTier,
}: {
  theme: EventRoomThemeTokens;
  qualityTier: EventRoomQualityTier;
}) {
  const isMobileLike = qualityTier !== 'desktop';

  return (
    <>
      <color attach="background" args={[theme.background]} />
      <hemisphereLight args={['#ffdcb7', theme.haze, isMobileLike ? 0.95 : 0.78]} />
      <ambientLight color={theme.ledSoft} intensity={isMobileLike ? 0.22 : 0.16} />
      <rectAreaLight
        color={theme.ledSoft}
        intensity={isMobileLike ? 2.2 : 3.2}
        width={7.5}
        height={2.5}
        position={[0, 3.55, -3.8]}
        rotation={[-Math.PI / 2.6, 0, 0]}
      />
      {!isMobileLike ? (
        <rectAreaLight
          color={theme.led}
          intensity={1.6}
          width={5}
          height={2}
          position={[0, 2.4, 3.6]}
          rotation={[-Math.PI / 2, 0, 0]}
        />
      ) : null}
    </>
  );
}
```

- [ ] **Step 3: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/3d/world/event-room/EventRoomScreens.tsx src/3d/world/event-room/EventRoomLighting.tsx
git commit -m "feat: add event room screens and lighting"
```

---

### Task 7: Add top-level Event Room scene

**Files:**

- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\EventRoomScene.tsx`
- Create: `C:\ThreeStyle.ai\src\3d\world\event-room\index.ts`

- [ ] **Step 1: Create the scene component**

Create `EventRoomScene.tsx` with:

```tsx
"use client";

import { useEffect, useMemo, useReducer } from 'react';
import { Html } from '@react-three/drei';
import { RoomDoor } from '../../modules/doors/RoomDoor';
import { shouldUseMobileRoomProfileInBrowser } from '../../../lib/deviceProfile';
import { HUB_ZONE } from '../../navigation/navigationConfig';
import { eventRoomShowReducer } from './EventRoomShowController';
import { useEventRoomMaterials } from './EventRoomMaterials';
import { EventRoomLighting } from './EventRoomLighting';
import { EventRoomScreens } from './EventRoomScreens';
import { EventRoomShell } from './EventRoomShell';
import { EVENT_ROOM_THEMES, INITIAL_EVENT_ROOM_SHOW_STATE, type EventRoomQualityTier } from './EventRoomTypes';

export function EventRoomScene({ onExit }: { onExit: (zone: string) => void }) {
  const [show, dispatch] = useReducer(eventRoomShowReducer, INITIAL_EVENT_ROOM_SHOW_STATE);
  const theme = EVENT_ROOM_THEMES[show.theme];
  const materials = useEventRoomMaterials(theme);

  const qualityTier = useMemo<EventRoomQualityTier>(() => {
    if (typeof window === 'undefined') return 'desktop';
    return shouldUseMobileRoomProfileInBrowser() ? 'mobile' : 'desktop';
  }, []);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Digit1') dispatch({ type: 'SET_THEME', theme: 'rose', hostOverride: true });
      if (event.code === 'Digit2') dispatch({ type: 'SET_THEME', theme: 'galaxy', hostOverride: true });
      if (event.code === 'KeyP') dispatch({ type: show.isPaused ? 'RESUME' : 'PAUSE' });
      if (event.code === 'KeyN') dispatch({ type: 'NEXT' });
      if (event.code === 'KeyB') dispatch({ type: 'PREVIOUS' });
      if (event.code === 'KeyF') dispatch({ type: 'FINALE' });
      if (event.code === 'KeyR') dispatch({ type: 'RESET' });
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [show.isPaused]);

  useEffect(() => {
    if (show.isPaused) return;
    const timer = window.setInterval(() => {
      dispatch({ type: 'AUTO_ADVANCE' });
    }, 7000);
    return () => window.clearInterval(timer);
  }, [show.isPaused]);

  return (
    <group>
      <EventRoomLighting theme={theme} qualityTier={qualityTier} />
      <EventRoomShell materials={materials} />
      <EventRoomScreens materials={materials} show={show} theme={theme} />

      <RoomDoor
        position={[0, 0, 6.78]}
        rotation={[0, Math.PI, 0]}
        label="BACK TO LOBBY"
        status="active"
        userCount={0}
        onEnter={() => onExit(HUB_ZONE)}
        renderGeometry={false}
      />

      <Html transform position={[0, 1.9, 6.62]} rotation={[0, Math.PI, 0]} distanceFactor={4.2} pointerEvents="none">
        <div style={{
          border: `1px solid ${theme.ledSoft}88`,
          background: 'rgba(10,8,7,.76)',
          color: '#f3e7dc',
          padding: '10px 16px',
          fontFamily: 'monospace',
          fontSize: '10px',
          letterSpacing: '.18em',
        }}>
          EXIT / LOBBY
        </div>
      </Html>
    </group>
  );
}
```

- [ ] **Step 2: Create public export**

Create `index.ts` with:

```ts
export { EventRoomScene } from './EventRoomScene';
```

- [ ] **Step 3: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/3d/world/event-room
git commit -m "feat: add event room scene"
```

---

### Task 8: Route the app to Event Room without touching room/HUD/joystick

**Files:**

- Modify: `C:\ThreeStyle.ai\src\app\b3p\page.tsx`

- [ ] **Step 1: Add Event Room dynamic import**

Add `EVENT_ROOM_ZONE` to the existing navigation import:

```ts
import { getCameraPreset, HUB_ZONE, ROOM_ZONE, EVENT_ROOM_ZONE } from '../../3d/navigation/navigationConfig';
```

Add the lazy loader near `loadGroundedHub`:

```ts
const loadEventRoom = () => import('../../3d/world/event-room');
const EventRoomScene = dynamic(
  () => loadEventRoom().then(module => module.EventRoomScene),
  { ssr: false, loading: () => null },
);
```

- [ ] **Step 2: Add route booleans**

Replace:

```ts
const isRoomZone = activeZone !== HUB_ZONE;
```

with:

```ts
const isEventRoomZone = activeZone === EVENT_ROOM_ZONE;
const isCreatorRoomZone = activeZone !== HUB_ZONE && activeZone !== EVENT_ROOM_ZONE;
const usesCreatorRoomPipeline = isCreatorRoomZone;
```

- [ ] **Step 3: Keep Creator Room-only render pipeline out of Event Room**

Replace these Creator Room pipeline checks:

```tsx
shadows={!isMobile && isRoomZone}
{isRoomZone ? (
{isRoomZone ? <BloomLight onReady={setBloomLight} /> : null}
{bloomLight && !isMobile && isRoomZone && (
{isRoomZone ? <AudioVisualizer /> : null}
{!isMobile && isRoomZone ? <PerformanceCounter /> : null}
```

with:

```tsx
shadows={!isMobile && usesCreatorRoomPipeline}
{usesCreatorRoomPipeline ? (
{usesCreatorRoomPipeline ? <BloomLight onReady={setBloomLight} /> : null}
{bloomLight && !isMobile && usesCreatorRoomPipeline && (
{usesCreatorRoomPipeline ? <AudioVisualizer /> : null}
{!isMobile && usesCreatorRoomPipeline ? <PerformanceCounter /> : null}
```

Event Room owns its own lighting and must not inherit Creator Room audio/postprocessing.

- [ ] **Step 4: Route scene rendering**

Replace the existing scene branch:

```tsx
{activeZone === HUB_ZONE && <GroundedHub onEnterRoom={(id) => setActiveZone(id)} />}
{activeZone !== HUB_ZONE && (
  <CreatorRoomMVP
    onExit={() => setActiveZone(HUB_ZONE)}
    onShellReady={() => setRoomShellReady(true)}
  />
)}
```

with:

```tsx
{activeZone === HUB_ZONE && <GroundedHub onEnterRoom={(id) => setActiveZone(id)} />}
{isEventRoomZone && <EventRoomScene onExit={(zone) => setActiveZone(zone)} />}
{isCreatorRoomZone && (
  <CreatorRoomMVP
    onExit={() => setActiveZone(HUB_ZONE)}
    onShellReady={() => setRoomShellReady(true)}
  />
)}
```

- [ ] **Step 5: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/app/b3p/page.tsx
git commit -m "feat: route b3p page to event room"
```

---

### Task 9: Make the corridor Event Room portal interactive

**Files:**

- Modify: `C:\ThreeStyle.ai\src\3d\world\corridors\LeftWingCorridor.tsx`

- [ ] **Step 1: Import Event Room zone**

Add:

```ts
import { EVENT_ROOM_ZONE } from '../../navigation/navigationConfig';
```

- [ ] **Step 2: Add a hidden interactive RoomDoor for Event Room**

Immediately before `<EventRoomLabel />`, add:

```tsx
<RoomDoor
  position={[-39.55, 0, -5]}
  rotation={[0, Math.PI / 2, 0]}
  label="EVENT ROOM"
  status="active"
  userCount={24}
  onEnter={() => onEnterRoom(EVENT_ROOM_ZONE)}
  renderGeometry={false}
/>
```

- [ ] **Step 3: Run the type check**

Run:

```bash
npx tsc --noEmit
```

Expected: no TypeScript errors.

- [ ] **Step 4: Commit**

Run:

```bash
git add src/3d/world/corridors/LeftWingCorridor.tsx
git commit -m "feat: activate event room portal"
```

---

### Task 10: Full static validation checkpoint

**Files:**

- No planned source edits.

- [ ] **Step 1: Run full static validation**

Run:

```bash
npx tsc --noEmit
npm run lint
```

Expected: both commands complete without errors.

- [ ] **Step 2: Record validation command output in the task notes**

Record the final successful commands in the implementation handoff notes:

```text
npx tsc --noEmit: PASS
npm run lint: PASS
```

Expected: no commit from this task because it is a validation checkpoint.

---

### Task 11: Browser smoke test and build

**Files:**

- No planned source edits.

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Next dev server starts on port `3001`.

- [ ] **Step 2: Manual smoke test**

Open:

```text
http://localhost:3001/b3p
```

Validate:

- Initial room loads.
- Elevator/lobby path still works.
- Event Room label/portal in the corridor responds to click or `[E]`.
- Event Room loads and faces podium/screen.
- `1` switches to Rose mode.
- `2` switches to Galaxy mode.
- `N` advances ranking.
- `B` moves backward.
- `P` pauses/resumes.
- `F` jumps to finale.
- `R` resets.
- Exit portal returns to lobby.
- Creator Room still loads from normal doors.
- No new console errors repeat every frame.

- [ ] **Step 3: Stop dev server and run production build**

Run:

```bash
npm run build
```

Expected: production build completes without errors.

- [ ] **Step 4: Record smoke-test output**

Record the smoke-test result in the implementation handoff notes:

```text
Manual /b3p smoke test: PASS
npm run build: PASS
```

---

### Task 12: Greybox handoff notes

**Files:**

- Modify: `C:\ThreeStyle.ai\docs\superpowers\specs\2026-06-25-event-room-vip-club-tribune-design.md`

- [ ] **Step 1: Add implementation status section**

Append this section to the design spec:

```md
## Greybox implementation status

The first playable Event Room shell is implemented as code-generated geometry with no downloaded assets. The scene includes the VIP Club Tribune layout, podium/runway, main and side screens, Rose/Galaxy theme tokens, local TOP 10 mock data, keyboard-only admin/preview controls, corridor portal entry, and lobby return.

Asset pass remains intentionally deferred until the greybox proportions, routing, and performance are accepted.
```

- [ ] **Step 2: Commit docs update**

Run:

```bash
git add docs/superpowers/specs/2026-06-25-event-room-vip-club-tribune-design.md
git commit -m "docs: note event room greybox status"
```

---

## Final verification checklist

- [ ] `npx tsc --noEmit` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run build` passes.
- [ ] Event Room is lazy-loaded and not bundled into initial lobby/room render path except for lightweight route reference.
- [ ] `CreatorRoomMVP.tsx` is unchanged.
- [ ] `HudOverlay.tsx` is unchanged.
- [ ] `NativeMobileJoystick.tsx` is unchanged.
- [ ] Event Room portal enters `event-room`.
- [ ] Event Room exit returns to `hub`.
- [ ] TOP 10 show flow is visible.
- [ ] Rose/Galaxy switching is available only through hidden keyboard/admin-style controls, not public visitor UI.
- [ ] No downloaded assets were added in the greybox pass.
