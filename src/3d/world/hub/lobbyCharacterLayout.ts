import type { LobbyBoxSpec, LobbyPlaneSpec } from './LobbyMeshes';

// The niche bench moved to the lounge (lobbyFurnitureLayout); the paint tiles stay as the reception backdrop.
export const LOBBY_COOL_LED: LobbyBoxSpec[] = [
  { position: [9.77,3.99,0], size: [.035,.035,8.4] },
];
export const LOBBY_COOL_GLOW: LobbyPlaneSpec[] = [
  { position: [9.76,3.86,0], size: [8.4,.4], rotation: [0,-Math.PI/2,0] },
];
export type CharacterTile = 'mural' | 'rhythm' | 'voice' | 'mark' | 'arrow';
export type CharacterPlane = LobbyPlaneSpec & { tile: CharacterTile };
export const CHARACTER_UV: Record<CharacterTile, [number,number,number,number]> = {
  mural: [0,.5,1,.5], rhythm: [0,.25,.5,.25], voice: [.5,.25,.5,.25],
  mark: [0,0,.5,.25], arrow: [.5,0,.5,.25],
};
export const LOBBY_PAINT: CharacterPlane[] = [
  { tile:'mural', position:[9.79,2.3,0], size:[8.4,3.25], rotation:[0,-Math.PI/2,0] },
  ...(['rhythm','voice','mark'] as const).map((tile,i) => ({
    tile, position:[-10.74,2.25,-.5+i*1.48], size:[1.35,.675], rotation:[0,Math.PI/2,0],
  } as CharacterPlane)),
  ...[-5.5,-2,1.5].map(x => ({ tile:'arrow', position:[x,.014,-5], size:[1,.5], rotation:[-Math.PI/2,0,0] } as CharacterPlane)),
];
