import { MeshStandardMaterial } from 'three';

// Very deep, absorbent dark acoustic foam, slight lift for readability
export const AcousticDarkMaterial = new MeshStandardMaterial({
  color: '#202020', 
  roughness: 0.95, 
  metalness: 0.15, 
});

// Reflective polished concrete designed to catch cyan floor pools
export const ConcreteFloorMaterial = new MeshStandardMaterial({
  color: '#161616', 
  roughness: 0.22, 
  metalness: 0.45, 
});

// Premium Dark Wood Panel for identity walls
export const WoodPanelMaterial = new MeshStandardMaterial({
  color: '#281e1b', // Shifted up to actually read as wood under low light
  roughness: 0.7, 
  metalness: 0.1, 
});

// Sound-absorbing textured foam
export const AcousticFoamMaterial = new MeshStandardMaterial({
  color: '#181818', 
  roughness: 1.0, 
  metalness: 0.0, 
});

// Heavy metal speaker grille
export const SpeakerGrilleMaterial = new MeshStandardMaterial({
  color: '#242424', 
  roughness: 0.4, 
  metalness: 0.7, 
  wireframe: true,
});
