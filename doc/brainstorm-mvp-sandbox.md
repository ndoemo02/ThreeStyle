# 🧠 Brainstorm: ThreeStyle.ai — MVP Sandbox
## Data: 2026-02-25
## Status: Zatwierdzone do implementacji

---

## Zrozumienie Projektu

- **Co:** Prywatna przestrzeń treningowa (Private Sandbox) — wirtualne studio rapowe w 3D
- **Dlaczego:** Wypełnienie luki między freestyle'em a technologią. Estetyka "Premium" — użytkownik czuje się jak w teledysku
- **Dla kogo:** MC / raperzy aspirujący do profesjonalnego freestyle'u
- **Styl:** Urban-Cyberpunk / Cinematic Realism (referencja: Homespace.png)
- **Faza:** MVP (Faza 1) — solo sandbox, mikrofon 3D, Gemini AI Rap-Coach
- **Stack:** Next.js + React Three Fiber + Gemini API + Leva (dev tools)
- **Ograniczenia:** Przeglądarka (WebGL), premium look

---

## Analiza: Co POPRAWIĆ

### 🔴 Krytyczne
| # | Problem | Obecny stan | Docelowy |
|---|---------|-------------|----------|
| P1 | Brak mikrofonu 3D | Pusta scena | Realistyczny mikrofon ze spider-mount |
| P2 | Brak postaci/sylwetki | Nic przed kamerą | Postać w kapturze (TPP) |
| P3 | Logo3S = dwa boxy | boxGeometry | Model GLTF carbon+chrome |
| P4 | HUD placeholder | Statyczny div | Holograficzny panel z rymami |
| P5 | Brak ścian bocznych | Otwarta scena | Zamknięte studio |
| P6 | LED nie na ścianach | Lecą na ukos | Przylegają do krawędzi ściana-podłoga |

### 🟡 Ważne
| # | Problem | Szczegóły |
|---|---------|-----------|
| P7 | Brak Post-processingu | Brak Bloom, Vignette, Color Grading |
| P8 | Brak głębi ostrości | Blueprint wymaga Bokeh na mikrofonie |
| P9 | Brak mgły/cząsteczek | Pył w stożku spotu = realizm |
| P10 | Gemini na kliencie | Klucz API widoczny w browserze |
| P11 | Brak Audio pipeline | Brak Web Audio API + STT |
| P12 | Neon bez fontu | Domyślna czcionka zamiast premium |

---

## Analiza: Co ZMIENIĆ (Zaawansowane Technologie)

### 🟣 Post-processing & Realizm
- **T1** `@react-three/postprocessing` — Bloom + Vignette + ChromaticAberration
- **T2** Depth of Field (DOF) — Bokeh na mikrofonie
- **T3** Volumetric Particles — pył w stożku spotu
- **T4** ACES Filmic Tone Mapping — filmowa kolorystyka

### 🔵 Modele 3D
- **T5** Model mikrofonu (GLTF/GLB) z PBR
- **T6** Model Logo 3S (GLTF) z Blendera
- **T7** Environment Map (HDR) — odbicia na metalach
- **T8** Contact Shadows — grounding obiektów

### 🟢 AI / Audio
- **T9** API Route dla Gemini (server-side)
- **T10** Web Speech API (STT wbudowane w przeglądarkę)
- **T11** Whisper.cpp WASM (offline STT)
- **T12** Web Audio API AnalyserNode (BPM/Flow detection)

### 🟠 UX / HUD
- **T13** Holograficzny HUD (drei Html + glassmorphism)
- **T14** Animowane rymy (Framer Motion / stagger)
- **T15** Custom Font (Orbitron/Monda) dla neonu

---

## Priorytetyzacja

### Tier 1 — "Natychmiastowy WOW" (1-2h każde)
1. T1: Post-processing Bloom + Vignette
2. T4: ACES Tone Mapping
3. T7: Environment Map
4. T15: Custom Font
5. P5+T8: Ściany boczne + ContactShadows

### Tier 2 — "Realizm Studyjny" (2-4h)
6. T5: Model mikrofonu GLTF
7. T3: Particles (pył)
8. T2: Depth of Field
9. T9: API Route Gemini
10. P6: Fix LED-ów

### Tier 3 — "Funkcjonalność MVP" (4-8h)
11. T10: Web Speech API
12. T13: Redizajn HUD
13. T14: Animowane rymy
14. T12: Web Audio Flow Analyzer
15. T6/T11: Logo GLTF + Whisper offline

---

## Decision Log

| # | Decyzja | Alternatywy | Uzasadnienie |
|---|---------|-------------|--------------|
| D1 | Bloom+Vignette jako #1 | Shader-only glow | Branżowy standard R3F, zero custom shaderów |
| D2 | ACES Tone Mapping | Linear, Reinhard | Najlepsze filmowe czarnie + highlights |
| D3 | Web Speech API przed Whisper | Whisper first | Zero kosztów, natychmiastowe działanie |
| D4 | API Route zamiast client Gemini | Client-side | Chroni klucz, pozwala middleware |
| D5 | Zamknięte studio (ściany boczne) | Open-air | Homespace = zamknięte pomieszczenie |
| D6 | Environment preset "studio" | Custom HDR | Idealne odbicia dla studia nagraniowego |

---

## Następne Kroki
Implementacja Tier 1 (5 elementów) → review → Tier 2 → Tier 3
