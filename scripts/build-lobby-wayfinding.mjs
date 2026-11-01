// Procedural lobby wayfinding atlas: corridor directory + backlit reception logo.
// Output: public/textures/runtime/lobby/{desktop,mobile}/wayfinding.webp
// Only the owner's existing logo (textures/branding/logo3s.jpeg) is composited in.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { WAYFINDING_ATLAS } from '../src/3d/world/hub/lobbyWayfindingAtlas.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SIZE = WAYFINDING_ATLAS.size;
const [dirX, dirY, dirW, dirH] = WAYFINDING_ATLAS.directory;
const [logoX, logoY, logoW, logoH] = WAYFINDING_ATLAS.logo;

// Viewer faces the wall (-x); the corridor lies to the right, reception to the left.
const entries = [
  { arrow: '→', title: 'POKOJE TWÓRCÓW', subtitle: 'KORYTARZ · 6 POKOI' },
  { arrow: '→', title: 'WINDA', subtitle: 'DO CREATOR ROOMU' },
  { arrow: '→', title: 'EVENT ROOM', subtitle: 'KONIEC KORYTARZA' },
  { arrow: '←', title: 'RECEPCJA', subtitle: 'COMMUNITY DESK' },
];

function directorySvg() {
  const rows = entries.map((entry, index) => {
    const y = 300 + index * 160;
    return `
      <text x="44" y="${y}" fill="#e6ba88" font-family="Arial, sans-serif" font-size="66" font-weight="600">${entry.arrow}</text>
      <text x="126" y="${y - 8}" fill="#f3eee5" font-family="Arial, sans-serif" font-size="36" font-weight="600" letter-spacing="0">${entry.title}</text>
      <text x="128" y="${y + 34}" fill="#d7cfc4" font-family="Arial, sans-serif" font-size="24" letter-spacing="3">${entry.subtitle}</text>
      ${index < entries.length - 1 ? `<path d="M44 ${y + 76} H${dirW - 44}" stroke="#4a5052" stroke-width="2"/>` : ''}`;
  }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${dirW}" height="${dirH}" viewBox="0 0 ${dirW} ${dirH}">
    <rect width="${dirW}" height="${dirH}" fill="#14181a"/>
    <rect x="16" y="16" width="${dirW - 32}" height="${dirH - 32}" rx="10" fill="none" stroke="#4a5052" stroke-width="2"/>
    <path d="M44 70 H124" stroke="#d8ac79" stroke-width="6"/>
    <text x="44" y="116" fill="#d7b898" font-family="Arial, sans-serif" font-size="24" letter-spacing="4">THREESTYLE · LOBBY</text>
    <text x="42" y="186" fill="#f3eee5" font-family="Arial, sans-serif" font-size="64" font-weight="600" letter-spacing="2">KIERUNKI</text>
    ${rows}
    <path d="M44 ${dirH - 92} H${dirW - 44}" stroke="#d8ac79" stroke-opacity=".55" stroke-width="2"/>
    <text x="44" y="${dirH - 50}" fill="#d7cfc4" font-family="Arial, sans-serif" font-size="20" letter-spacing="3">MUZYKA ZACZYNA SIĘ OD CIEBIE</text>
  </svg>`);
}

function logoSvg() {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${logoW}" height="${logoH}" viewBox="0 0 ${logoW} ${logoH}">
    <rect width="${logoW}" height="${logoH}" fill="#0f1112"/>
    <text x="118" y="70" fill="#ffe2bd" font-family="Arial, sans-serif" font-size="58" font-weight="600" letter-spacing="-1">ThreeStyle</text>
    <path d="M120 88 H${logoW - 24}" stroke="#d8ac79" stroke-opacity=".7" stroke-width="3"/>
  </svg>`);
}

const mark = await sharp(path.join(root, 'public', 'textures', 'branding', 'logo3s.jpeg'))
  .resize(88, 88, { fit: 'cover' }).png().toBuffer();
const logo = await sharp(logoSvg()).composite([{ input: mark, left: 14, top: 12 }]).png().toBuffer();
const directory = await sharp(directorySvg()).png().toBuffer();
const atlas = await sharp({ create: { width: SIZE, height: SIZE, channels: 3, background: '#14181a' } })
  .composite([{ input: directory, left: dirX, top: dirY }, { input: logo, left: logoX, top: logoY }])
  .png().toBuffer();

for (const [variant, size] of [['desktop', SIZE], ['mobile', SIZE / 2]]) {
  const output = path.join(root, 'public', 'textures', 'runtime', 'lobby', variant);
  await fs.mkdir(output, { recursive: true });
  await sharp(atlas).resize(size, size).webp({ quality: 92, effort: 6 }).toFile(path.join(output, 'wayfinding.webp'));
}
console.log('wayfinding.webp written for desktop and mobile');
