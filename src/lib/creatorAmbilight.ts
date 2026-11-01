/**
 * Ambilight around the Creator Room screen: a soft glow on the wall in the picture's edge colours,
 * and the existing screen-fill light tinted by the picture. No new light: only a colour changes.
 */

export interface Rgb { r: number; g: number; b: number }

/** Mean colour (0..1) of RGBA bytes, e.g. a tiny getImageData sample. Empty input is black. */
export function averageColor(data: ArrayLike<number>, out: Rgb): Rgb {
  let r = 0, g = 0, b = 0, count = 0;
  for (let i = 0; i + 3 < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
  }
  out.r = count ? r / count / 255 : 0;
  out.g = count ? g / count / 255 : 0;
  out.b = count ? b / count / 255 : 0;
  return out;
}

/**
 * Zone colours (0..1 RGB, row-major from the top) of an RGBA picture split into cols×rows, like a TV's
 * ambilight zones: deep zones catch colour that sits inside the picture, not only on its last pixels.
 */
export function ambilightZones(rgba: ArrayLike<number>, width: number, height: number, cols: number, rows: number, out: Float32Array) {
  out.fill(0);
  const counts = new Array(cols * rows).fill(0);
  for (let y = 0; y < height; y++) {
    const row = Math.min(rows - 1, Math.floor(y * rows / height));
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (i + 3 >= rgba.length) continue;
      const zone = row * cols + Math.min(cols - 1, Math.floor(x * cols / width));
      out[zone * 3] += rgba[i]; out[zone * 3 + 1] += rgba[i + 1]; out[zone * 3 + 2] += rgba[i + 2];
      counts[zone]++;
    }
  }
  for (let zone = 0; zone < cols * rows; zone++) {
    for (let c = 0; c < 3; c++) out[zone * 3 + c] = counts[zone] ? out[zone * 3 + c] / counts[zone] / 255 : 0;
  }
  return out;
}

/** Below this brightness a zone is background (the visualizer's dark canvas, letterboxing) and gives no glow. */
const GLOW_FLOOR = 0.05;
const GLOW_FULL = 0.14;
/** Dim colours are lifted towards this brightness (at most ×3), so a dark but coloured picture still glows. */
const GLOW_TARGET = 0.85;

/** Lifts one zone colour (in place, 0..1) for the wall glow: hue kept, dark zones brightened, black stays black. */
export function ambilightGlow(zones: Float32Array, zone: number) {
  const i = zone * 3;
  const peak = Math.max(zones[i], zones[i + 1], zones[i + 2]);
  if (!(peak > 0)) { zones[i] = zones[i + 1] = zones[i + 2] = 0; return; }
  const t = Math.max(0, Math.min(1, (peak - GLOW_FLOOR) / (GLOW_FULL - GLOW_FLOOR)));
  const gain = Math.min(3, Math.max(1, GLOW_TARGET / peak)) * t * t * (3 - 2 * t);
  for (let c = 0; c < 3; c++) zones[i + c] = Math.min(1, zones[i + c] * gain);
}

/** How far the light leans from the room colour towards the picture's hue. */
export const AMBILIGHT_TINT = 0.6;

/**
 * Screen-fill light colour: the picture's hue at full brightness, mixed into the room colour.
 * Brightness stays with the light channel, so a dark picture tints but never blacks out the corner.
 */
export function ambilightTint(picture: Rgb, room: Rgb, out: Rgb): Rgb {
  const r = Number.isFinite(picture.r) ? Math.max(0, picture.r) : 0;
  const g = Number.isFinite(picture.g) ? Math.max(0, picture.g) : 0;
  const b = Number.isFinite(picture.b) ? Math.max(0, picture.b) : 0;
  const peak = Math.max(r, g, b);
  if (peak < 0.04) { out.r = room.r; out.g = room.g; out.b = room.b; return out; }
  out.r = room.r + (r / peak - room.r) * AMBILIGHT_TINT;
  out.g = room.g + (g / peak - room.g) * AMBILIGHT_TINT;
  out.b = room.b + (b / peak - room.b) * AMBILIGHT_TINT;
  return out;
}

/**
 * Texture transform that maps the screen rectangle onto 0..1 of a larger glow plane, so with clamped
 * wrapping everything outside the screen repeats the nearest edge colour — the ambilight spill.
 * `center` is the glow plane's centre relative to the screen's.
 */
export function ambilightUvTransform(glow: { width: number; height: number }, screen: { width: number; height: number }, center = { x: 0, y: 0 }) {
  return {
    repeat: { x: glow.width / screen.width, y: glow.height / screen.height },
    offset: { x: (center.x - glow.width / 2) / screen.width + 0.5, y: (center.y - glow.height / 2) / screen.height + 0.5 },
  };
}
