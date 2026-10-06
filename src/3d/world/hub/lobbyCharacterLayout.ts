import type { LobbyBoxSpec, LobbyPlaneSpec } from './LobbyMeshes';

// Recessed behind the original inner wall face (-9.82), outside the lobby route.
// These are decorative geometry, not new navigation surfaces or colliders.
export const LOBBY_SEAT: LobbyBoxSpec[] = [
  { position: [-10.35, .55, 1], size: [.7, .14, 3] },
  { position: [-10.63, 1.02, 1], size: [.12, .75, 3] },
  { position: [-10.3, .38, 3.05], size: [.65, .7, .65] },
  { position: [-10.3, .25, 3.82], size: [.65, .44, .55] },
];
export const LOBBY_SEAT_TRIM: LobbyBoxSpec[] = [
  ...[-.12, 2.12].map(z => ({ position: [-10.35,.26,z], size: [.6,.5,.075] } as LobbyBoxSpec)),
  ...[3.05,3.82].flatMap((z,i) => [0.1, i === 0 ? .62 : .4].map(y => ({
    position: [-10.3,y,z], size: [.68,.045,i === 0 ? .68 : .58],
  } as LobbyBoxSpec))),
];
export const LOBBY_SEAT_LED: LobbyBoxSpec[] = [
  { position: [-10.02,.445,1], size: [.025,.025,2.75] },
];
export const LOBBY_SEAT_GLOW: LobbyPlaneSpec[] = [
  { position: [-10.03,.12,1], size: [3,.65], rotation: [0,Math.PI/2,0] },
];
export const LOBBY_SEAT_SHADOW: LobbyPlaneSpec[] = [
  { position: [-10.35,.009,1], size: [.82,3.1], rotation: [-Math.PI/2,0,0] },
  { position: [-10.3,.01,3.4], size: [.72,1.5], rotation: [-Math.PI/2,0,0] },
];
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
