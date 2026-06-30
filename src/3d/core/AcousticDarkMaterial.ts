import { MeshStandardMaterial } from 'three';

// Ciemna szczotkowana stal — ściany boczne, strukturalne elementy
export const AcousticDarkMaterial = new MeshStandardMaterial({
  color: '#1e1e22',
  roughness: 0.45,
  metalness: 0.78,
});

// Polerowany ciemny kamień — posadzka lobby i korytarza
export const ConcreteFloorMaterial = new MeshStandardMaterial({
  color: '#18181c',
  roughness: 0.28,
  metalness: 0.12,
});

// Ciepły fornir dębowy — ściany akcentowe, lamele
export const WoodPanelMaterial = new MeshStandardMaterial({
  color: '#4a3828',
  roughness: 0.65,
  metalness: 0.06,
});

// Pianka akustyczna — wygłuszenie
export const AcousticFoamMaterial = new MeshStandardMaterial({
  color: '#2a2a2e',
  roughness: 1.0,
  metalness: 0.0,
});

// Ciężka metalowa siatka głośnikowa
export const SpeakerGrilleMaterial = new MeshStandardMaterial({
  color: '#2a2a2e',
  roughness: 0.38,
  metalness: 0.72,
  wireframe: true,
});

// Mosiężne akcenty — listwy, ramy, detale
export const BrassAccentMaterial = new MeshStandardMaterial({
  color: '#b8875e',
  roughness: 0.32,
  metalness: 0.92,
});

// Ciemny matowy metal — struktury nośne, ramy
export const DarkStructuralMaterial = new MeshStandardMaterial({
  color: '#141418',
  roughness: 0.7,
  metalness: 0.55,
});

// ═══════════════ BIOPHILIC PALETTE — jasne, nowoczesne materiały ═══════════════

// Gładki, kremowy beton — główne ściany konstrukcyjne, ramy pomieszczeń
export const CreamConcreteMaterial = new MeshStandardMaterial({
  color: '#e8e0d5',
  roughness: 0.5,
  metalness: 0.02,
});

// Jasne laminowane drewno — lamele, panele, wstawki dekoracyjne
export const LightWoodMaterial = new MeshStandardMaterial({
  color: '#c4a882',
  roughness: 0.45,
  metalness: 0.04,
});

// Neutralna gładka posadzka — lobby i korytarz
export const NeutralFloorMaterial = new MeshStandardMaterial({
  color: '#c8bfb4',
  roughness: 0.3,
  metalness: 0.05,
});

// Ciepła biel — sufity, jasne akcenty
export const WarmWhiteMaterial = new MeshStandardMaterial({
  color: '#f5f0e8',
  roughness: 0.6,
  metalness: 0.02,
});

// Matowy ciemny akcent — ramy donic, cokoły, elementy kontrastowe
export const MatteDarkAccentMaterial = new MeshStandardMaterial({
  color: '#3a3530',
  roughness: 0.7,
  metalness: 0.08,
});

// Zieleń liści — geometryczna roślinność
export const FoliageGreenMaterial = new MeshStandardMaterial({
  color: '#3d5a2e',
  roughness: 0.9,
  metalness: 0.0,
});
