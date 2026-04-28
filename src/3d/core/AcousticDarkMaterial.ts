import { MeshStandardMaterial } from 'three';

// Lighter acoustic grey to eliminate the "void" transparency look
export const AcousticDarkMaterial = new MeshStandardMaterial({
  color: '#3a3a3a', 
  roughness: 0.95, 
  metalness: 0.15, 
});

// Reflective polished concrete designed to catch cyan floor pools
export const ConcreteFloorMaterial = new MeshStandardMaterial({
  color: '#2a2a2a', 
  roughness: 0.22, 
  metalness: 0.45, 
});

// Premium Wood Panel for identity walls
export const WoodPanelMaterial = new MeshStandardMaterial({
  color: '#5c4033', // More visible wood color
  roughness: 0.7, 
  metalness: 0.1, 
});

// Sound-absorbing textured foam
export const AcousticFoamMaterial = new MeshStandardMaterial({
  color: '#353535', 
  roughness: 1.0, 
  metalness: 0.0, 
});

// Heavy metal speaker grille
export const SpeakerGrilleMaterial = new MeshStandardMaterial({
  color: '#333333', 
  roughness: 0.4, 
  metalness: 0.7, 
  wireframe: true,
});
