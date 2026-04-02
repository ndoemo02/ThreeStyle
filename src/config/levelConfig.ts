// src/config/levelConfig.ts

/**
 * Legenda:
 * 0 = Korytarz / Podłoga (pusta przestrzeń)
 * 1 = Ściana pełna (gruba bryła)
 * 2 = Drzwi (otwór w ścianie między pokojem a korytarzem)
 * 3 = Winda (punkt startowy, podłoga w innym kolorze)
 * 4 = Studio / SafeHouse (kotwica komponentu)
 * 5 = Ściana z oknem (WindowWall3D — tylko NA FASADZIE zewnętrznej)
 *
 * UKŁAD HOTELOWY — 24 × 13
 *
 * Okna (5) są na rzędach 0 i 12 (fasady N/S), centrowane w każdym pokoju.
 * Między pokojami: zwykłe ściany pełne (1) — brak cienkich ścian działowych.
 *
 *  ┌─[5]──────[5]──────[5]──────[5]─┐  ← fasada N z oknami
 *  │ POKÓJ A  │ POKÓJ B │ POKÓJ C │ POKÓJ D │
 *  └────[2]───┴────[2]──┴────[2]──┴────[2]─┘
 *  [3]══════════ KORYTARZ (3 rzędy szeroki) ══════[3]
 *  [3]══════════════════════════════════════════[3]
 *  ┌────[2]───┬────[2]──┬────[2]──┬────[2]─┐
 *  │ POKÓJ E  │ STUDIO  │ POKÓJ G │ POKÓJ H │
 *  └─[5]──────[5]──────[5]──────[5]─┘  ← fasada S z oknami
 */

export type TileType = 0 | 1 | 2 | 3 | 4 | 5;

// Kolumny: 0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23
export const FLOOR_PLAN: TileType[][] = [
  /* r0  fasada N (okna)  */ [1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1],
  /* r1  pokoje N         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r2  pokoje N         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r3  pokoje N         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r4  ściana N koryt.  */ [1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1],
  /* r5  KORYTARZ         */ [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  /* r6  KORYTARZ (środek)*/ [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  /* r7  KORYTARZ         */ [3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
  /* r8  ściana S koryt.  */ [1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 1, 2, 1, 1],
  /* r9  pokoje S         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r10 pokoje S         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r11 pokoje S         */ [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  /* r12 fasada S (okna)  */ [1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1, 1, 1, 1, 5, 1, 1],
];

/** Rozmiar pojedynczego kafelka w jednostkach Three.js */
export const TILE_SIZE = 4;

/** Wysokość ścian */
export const WALL_HEIGHT = 5;
