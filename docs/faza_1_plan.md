# FAZA 1: Fundamenty i Mroczny Pokój — Implementation Plan

This plan outlines the steps to align the project with the **MASTER BLUEPRINT** and the lighting reference image `wzornaoswietlenie.jpg`.

## 1. Environment & Lighting Setup (The "Safe House" Vibe)
- **Component**: Create `src/components/stage/SafeHouse.tsx` to replace `Arena.tsx`.
- **Lighting**: Implement the "Golden Hour" window light using a `RectAreaLight` or a tight `SpotLight` with a window-frame cookie (or simulated shadows).
- **Baked-Style**: Use `MeshStandardMaterial` with high roughness for concrete walls and a stone/terrazzo texture for the floor as seen in the reference.
- **Ambient**: Dark overall environment with subtle blue/cyan fill from neons.

## 2. Neon System
- **Procedural Neon**: Create a `NeonText` component using `Text` (from `@react-three/drei`) with a `meshBasicMaterial` and strong `bloom` boost.
- **Pulsing Logic**: Use `useFrame` to animate the intensity/opacity of the neon material for a procedural "flicker" or "pulse" effect.

## 3. Stage 1: Bramka (2D Landing Page)
- **Onboarding UI**: A minimalist overlay (Z-index top) that hides the 3D scene initially.
- **Manifesto**: Display the "To jest muzyka AI" message.
- **Auth Trigger**: Supabase log-in button (requires Supabase client setup).

## 4. Camera & Transition
- **GSAP camera**: Implement a smooth pan-in from a wide shot of the room to the desk/neon when entering after Stage 1.
- **Post-Processing**: Configure `UnrealBloomPass` (or `Bloom` from `@react-three/postprocessing`) to match the glow intensity of the reference neons.

## 5. Supabase Integration
- **Client Init**: Setup `src/lib/supabase.ts`.
- **Auth Hook**: Track user session to trigger Phase 1 complete state.

---

### Verification
- [ ] Visual check against `wzornaoswietlenie.jpg`: Neons should glow blue/cyan, warm sun should hit the floor.
- [ ] UI check: manifesto page visible on first load.
- [ ] Performance: ensure stable 60FPS with post-processing.
