# ThreeStyle Event Room — VIP Club Tribune Design

Date: 2026-06-25  
Status: design spec for review  
Reference concept: `C:\Users\frees\.codex\generated_images\019ef68e-4738-72c0-84cb-429bc45dc9b3\ig_0fcfad334a18e054016a3c6e68907c8191b9cac73ce0e0aa13.png`

## Summary

Build the Event Room as a premium weekly music announcement space: a VIP club tribune with a low podium/runway, curved TOP 10 screens, warm wood sections, dark stone, matte black structure, and switchable Rose/Galaxy show modes.

The first implementation milestone is a lightweight greybox/playable shell. Final texture and prop assets are added only after the layout, routing, navigation, and performance profile are proven.

## Goals

- Create a dedicated Event Room reachable from the existing lobby/corridor Event Room portal.
- Preserve the existing room, HUD, joystick, elevator, and Creator Room behavior.
- Deliver the “VIP Club Tribune” feeling: premium, warm, exclusive, and broadcast-ready.
- Support weekly TOP 10 music announcement flow: intro, ranking 10 to 1, final winner moment, and afterloop.
- Support synchronized show modes: Rose and Galaxy.
- Keep private/admin preview capability for mode testing, without exposing public per-user theme switching.
- Keep the scene suitable for mobile-first WebGL: modular geometry, instancing, limited lights, and asset budgets from the start.

## Non-goals

- No full physical concert stage or live performer model in the first pass.
- No public “every user changes the room theme locally” control.
- No heavy downloaded full-room asset pack.
- No Gaussian/Luma-style splat as the base room implementation.
- No changes to `CreatorRoomMVP`, `HudOverlay`, or `NativeMobileJoystick`.
- No final production asset pass before the greybox is accepted.

## Current project context

- The current lobby/corridor contains an Event Room label/portal concept, but not a dedicated interactive Event Room scene.
- `GroundedHub({ onEnterRoom })` is the public hub interface to preserve.
- The app currently swaps between hub and creator room zones; Event Room needs its own zone/chunk rather than being routed into the Creator Room.
- The recently optimized lobby is warm, wood/stone/black themed. Event Room should feel like a premium extension of that architectural language.

## Creative direction

### Room identity

The room is a VIP club tribune, not a generic concert hall. It should feel like entering an exclusive music broadcast lounge where the weekly TOP 10 reveal happens.

Core layout:

- A curved main LED screen at the far/front side.
- A low central podium in front of the screen.
- A short runway/podest extending from the screen into the middle of the room.
- A semi-circular or horseshoe tribune around the podium.
- Wooden VIP sections/boxes on the sides.
- Open central floor space for avatars and reactions.

Core materials:

- Smoked oak / dark walnut sections.
- Dark polished stone floor.
- Matte black rails, trims, and screen frames.
- Soft dark seating material.
- Warm amber under-step and podest-edge LED strips.

### Modes

The physical geometry stays stable. Theme switching updates the show layer:

- **Rose mode:** rose/pink LED content, warm amber fill, soft bloom-like emissive accents, subtle petal/aurora-inspired screen visuals.
- **Galaxy mode:** dark violet/blue LED content, starfield/nebula visuals, deeper ambient light, cooler rim accents.

Both modes keep visible wood sections so the room remains recognizable as ThreeStyle rather than becoming a disconnected sci-fi box.

## User experience

### Normal visitor

- Enters from the lobby/corridor Event Room portal.
- Arrives facing the podium and main curved screen.
- Can move around the central floor and tribune zones.
- Sees the globally synchronized room mode and show state.
- Does not get public controls for switching Rose/Galaxy or advancing the show.

### Host/admin

- Can run the event with an automatic TOP 10 flow.
- Can override the flow: pause, next, previous, reset, jump to finale, or switch Rose/Galaxy.
- Can privately preview modes for staging, QA, and screenshots without exposing this as a public visitor feature.

## Show flow

The recommended show mode is automatic with host override.

1. **Pre-show:** room idle loop, title screen, ambient visualizer.
2. **Intro:** lights narrow toward the podium and main screen.
3. **Countdown:** reveal entries 10 through 1.
4. **Per-track moment:** main screen shows ranking card; side screens show abstract clip/visualizer panels.
5. **Reaction pulse:** short room-wide LED animation after each reveal.
6. **Winner reveal:** TOP 1 gets stronger lighting, screen animation, and sound-reactive feeling.
7. **Afterloop:** ambient loop with final ranking summary.

The first technical version can use local/static TOP 10 mock data. A future version can replace this with CMS/admin-provided data without changing the room architecture.

## Architecture

### Scene boundaries

Add Event Room as an isolated world module and route target.

Proposed boundaries:

- `EventRoomScene`: top-level Event Room scene component.
- `EventRoomShell`: static room geometry: floor, walls, tribune, podium, screen frames, wood sections.
- `EventRoomScreens`: main and side screens; consumes show state and theme tokens.
- `EventRoomLighting`: lights and emissive strips; consumes theme tokens and quality profile.
- `EventRoomShowController`: state machine for idle/pre-show/countdown/finale/afterloop.
- `EventRoomThemeController`: Rose/Galaxy theme selection and admin preview handling.
- `EventRoomNavigation`: portal entry/exit hitboxes and callbacks to the existing world navigation.
- `EventRoomQualityProfile`: mobile/desktop/low profile knobs.

Keep Event Room route state separate from `CreatorRoomMVP`. Existing room/HUD/joystick files are not implementation targets for this feature.

### Loading strategy

- Event Room should be lazy-loaded as its own chunk.
- Start with code-only greybox geometry and procedural/material colors.
- Texture and prop assets are loaded after the shell is proven.
- Future asset preload can begin when the user approaches or activates the Event Room portal.

### State model

Core state:

- `eventRoomTheme`: `rose | galaxy`.
- `showPhase`: `idle | intro | countdown | trackReveal | finale | afterloop`.
- `currentRank`: number from 10 to 1 when in countdown/reveal phases.
- `isHostOverrideActive`: boolean for admin/host control.
- `qualityTier`: `mobile | desktop | degraded`.

Initial implementation can keep this state client-local. The design should not assume local-only forever: the state shape should be easy to sync later through a backend or realtime channel.

## Assets strategy

Do not download a complete room model. Build the room from modular real-time geometry.

Assets to add after greybox acceptance:

- 2 to 4 PBR texture sets:
  - dark stone floor,
  - smoked oak/walnut,
  - matte/dark metal,
  - optional dark fabric/leather.
- 1 low-cost seating/sofa module, reused/instanced.
- Optional small desktop-only props such as cocktail table, speaker block, or plant.

Asset constraints:

- Prefer CC0/public-license sources such as Poly Haven or ambientCG for textures.
- Use 1K mobile and up to 2K desktop variants where needed.
- Keep individual downloaded model assets small and compressible.
- Avoid any single decorative asset becoming visually or technically required.

Gaussian/splat assets are optional future desktop-only “wow layer” candidates, not part of the base milestone.

## Performance design

Target profile should be consistent with the lobby optimization direction.

Geometry:

- Use instancing for seats, wood ribs, LED strips, repeated stair/tribune modules, rails, and side panels.
- Keep the first playable shell simple enough to evaluate scale and navigation before asset detail.
- Keep open sightlines so culling remains effective.

Lighting:

- Use emissive materials for LED strips and screens.
- Use a small number of real lights.
- Avoid dynamic shadows in the first mobile-safe pass.
- Use baked-looking material contrast, ambient occlusion style textures, vertex colors, and blob/contact cues where needed.

Quality:

- Mobile: lower DPR, fewer decorative instances, simpler screen shaders, no Gaussian layer.
- Desktop: richer screen visuals, more seating/detail instances, optional higher texture resolution.
- Degraded: reduce DPR, simplify particles/screen effects, reduce decorative props.

Budget intent for first Event Room entry:

- Code chunk: target <= 350 KB gzip for the first greybox implementation.
- Base greybox assets: near-zero external asset transfer.
- Final first asset pass: target <= 6 MB transfer for Event Room-specific code, textures, and models at first uncached entry.
- Visible geometry after the asset pass should aim for <= 100k triangles mobile and <= 150k desktop.
- Draw-call budget should aim for <= 45 mobile and <= 60 desktop by using instancing/grouping for repeated sections.

## Interaction design

Visitor-facing interactions:

- Enter Event Room from lobby/corridor portal.
- Exit back to lobby/corridor.
- Walk/navigate around central floor and tribune zones.
- See synchronized ranking and theme state.

Host/admin-only interactions:

- Start automatic show.
- Pause/resume show.
- Next/previous rank.
- Jump to finale.
- Reset to idle/pre-show.
- Switch Rose/Galaxy.
- Private preview mode for screenshots and QA.

Host/admin controls are a capability boundary, not a public UI requirement for the first pass.

## Error handling and fallback

- If Event Room chunk fails to load, keep the user in the lobby and show a non-blocking fallback message or disabled portal state.
- If show data is unavailable, use bundled mock TOP 10 data so the scene remains testable.
- If screen textures/videos fail, fall back to procedural ranking cards and theme-colored gradients.
- If the device is low performance, force degraded profile without exposing this as a user decision.

## Testing and acceptance

Functional:

- Lobby/corridor portal enters Event Room.
- Event Room can return to lobby/corridor.
- Creator Room path still works.
- HUD and joystick still work as before.
- TOP 10 flow advances from pre-show through afterloop.
- Host override changes show state without breaking automatic flow.
- Rose/Galaxy switch changes screens, light accents, and atmosphere while preserving geometry.

Visual:

- The room reads as VIP, premium, club-like, and broadcast-ready.
- Podium/runway is visible as the focus.
- Tribune/podkowa supports the 30 to 50 person feeling.
- Wood sections remain a signature element in both Rose and Galaxy modes.
- The concert/show exists on screens, not through a physical performer.

Performance:

- Greybox first pass must be light enough to validate movement and routing before assets.
- Repeated elements should be instanced or otherwise grouped.
- Mobile profile should avoid heavy postprocessing, transmission glass, dynamic shadows, and large models.
- Desktop may increase polish without changing the architecture.

Safety/scope:

- No edits to `CreatorRoomMVP`, `HudOverlay`, or `NativeMobileJoystick` for the Event Room milestone.
- Existing unrelated worktree changes must be preserved.
- Asset additions require explicit review of size and license before committing.

## Implementation milestones

1. **Greybox route and shell**
   - Add Event Room route/zone.
   - Add room shell, podium/runway, tribune, screens, exit portal.
   - Use simple materials and theme colors.

2. **Show controller**
   - Add local TOP 10 mock data.
   - Add automatic countdown state machine.
   - Add host/admin override hooks, not public visitor controls.

3. **Theme system**
   - Add Rose and Galaxy tokens.
   - Drive screens, LED strips, ambient colors, and simple particles/visuals.

4. **Performance pass**
   - Instance repeated geometry.
   - Add mobile/desktop/degraded quality tiers.
   - Validate build, console, and basic FPS/draw-call expectations.

5. **Asset pass**
   - Add selected PBR textures and at most one low-cost seating asset.
   - Re-check transfer, GPU texture cost, and FPS.

6. **Polish and verification**
   - Refine VIP proportions, screen readability, entry/exit flow, and TOP 10 moments.
   - Verify full flow: room → elevator/lobby → Event Room → lobby → room.

## Greybox implementation status

The first playable Event Room shell is implemented as code-generated geometry with no downloaded assets. The scene includes the VIP Club Tribune layout, podium/runway, main and side screens, Rose/Galaxy theme tokens, local TOP 10 mock data, keyboard-only admin/preview controls, corridor portal entry, and lobby return.

Asset pass remains intentionally deferred until the greybox proportions, routing, and performance are accepted.

Validation on 2026-06-25:

- `npx tsc --noEmit`: PASS.
- Scoped lint for Event Room touched files: PASS.
- `npm run build`: PASS when run with `NEXT_TURBOPACK_EXPERIMENTAL_USE_SYSTEM_TLS_CERTS=1`, required locally because Turbopack could not fetch Google Fonts through local TLS without it.
- `http://localhost:3001/b3p`: PASS, returned HTTP 200 in local dev smoke check.
- Full `npm run lint`: FAILS on pre-existing unrelated baseline errors in `.vercel`, `AudioReactiveFace`, `CreatorRoomMVP`, `HUD`, `stage` components, and other files outside the Event Room scope.
