/** Pixel regions [x, y, width, height] in the desktop wayfinding atlas (mobile is half size). */
export const WAYFINDING_ATLAS = {
  size: 1024,
  directory: [0, 0, 560, 1024] as [number, number, number, number],
  logo: [576, 0, 448, 112] as [number, number, number, number],
};

/** Maps a plane UV into an atlas region; a 4px gutter keeps mipmaps from bleeding. */
export function wayfindingUv(region: [number, number, number, number], u: number, v: number): [number, number] {
  const [x, y, width, height] = region;
  const pad = 4;
  const size = WAYFINDING_ATLAS.size;
  return [
    (x + pad + u * (width - 2 * pad)) / size,
    1 - (y + pad + (1 - v) * (height - 2 * pad)) / size,
  ];
}
