/**
 * Room.B dressing for the Creator Room: cushions, a pouf, a dome lamp, plants, books and two
 * original abstract paintings with picture lights. Room-local metres; furniture surfaces measured
 * by raycasts in the browser (2026-10-17): sofa seat 0.811, backrests at x = 6.139 and z = 6.131,
 * TV cabinet top 1.45 (x -6.65…-5.35, z 0.15…6.25).
 */
export type Vec3 = [number, number, number];

export const SOFA_SEAT_Y = 0.811;
export const SOFA_BACK_X = 6.139;
export const SOFA_BACK_Z = 6.131;
export const CABINET_TOP_Y = 1.45;

export const DECOR_COLORS = {
  cushionDark: '#1c1714',
  cushionRed: '#6a1a14',
  pouf: '#6e1d16',
  walnut: '#2a1a10',
  brass: '#8a6a3a',
  lampShade: '#14110f',
  pot: '#1a1817',
  booksCream: '#cbb89a',
  booksDark: '#24201d',
  booksBrown: '#5a3a24',
  trunk: '#3b2a1c',
} as const;

export interface Cushion { position: Vec3; rotationY: number; red: boolean }
/** Cushions lean on the backrests: long arm faces -x, short arm faces -z. */
export const CUSHIONS: Cushion[] = [
  { position: [SOFA_BACK_X - 0.14, SOFA_SEAT_Y + 0.22, 0.55], rotationY: -Math.PI / 2, red: false },
  { position: [SOFA_BACK_X - 0.14, SOFA_SEAT_Y + 0.22, 1.45], rotationY: -Math.PI / 2, red: true },
  { position: [SOFA_BACK_X - 0.14, SOFA_SEAT_Y + 0.22, 3.1], rotationY: -Math.PI / 2, red: false },
  { position: [5.75, SOFA_SEAT_Y + 0.22, SOFA_BACK_Z - 0.16], rotationY: Math.PI * 0.75, red: false },
  { position: [3.55, SOFA_SEAT_Y + 0.22, SOFA_BACK_Z - 0.14], rotationY: Math.PI, red: true },
  { position: [2.6, SOFA_SEAT_Y + 0.22, SOFA_BACK_Z - 0.14], rotationY: Math.PI, red: false },
];

export const POUF = { position: [3.15, 0, 3.25] as Vec3, radius: 0.42, height: 0.42 };
export const LAMP = { position: [-6.05, CABINET_TOP_Y, 5.55] as Vec3 };
export const CABINET_PLANT = { position: [-6.05, CABINET_TOP_Y, 0.85] as Vec3 };
export const BOOKS = { position: [-6.05, CABINET_TOP_Y, 4.75] as Vec3 };
/** Tall floor plant between the sofa end and the desk return. */
export const FLOOR_PLANT = { position: [6.35, 0, -0.85] as Vec3, radius: 0.3 };

export interface Painting { center: Vec3; width: number; height: number; facing: 1 | -1; atlasU: 0 | 0.5 }
/** Left wall above the cabinet, right wall above the sofa (wall faces at x = ±6.75). */
export const PAINTINGS: Painting[] = [
  { center: [-6.72, 2.95, 3.2], width: 2.6, height: 1.3, facing: 1, atlasU: 0 },
  { center: [6.72, 2.8, 2.2], width: 2.2, height: 1.4, facing: -1, atlasU: 0.5 },
];
