import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { LOBBY_DOORS } from '../src/3d/world/hub/lobbyConfig.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

function card({ number, title, subtitle, status = '', welcome = false }) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
    <rect width="1024" height="512" fill="#171c1f"/>
    <rect x="18" y="18" width="988" height="476" rx="10" fill="none" stroke="#4a5052" stroke-width="2"/>
    <path d="M56 64 H130" stroke="#d8ac79" stroke-width="6"/>
    <text x="56" y="116" fill="#b8a894" font-family="Arial, sans-serif" font-size="26" letter-spacing="6">${welcome ? 'TWÓJ RYTM · TWOJA PRZESTRZEŃ' : escape(status || 'THREESTYLE')}</text>
    ${welcome ? '' : `<text x="58" y="230" fill="#e6ba88" font-family="Arial, sans-serif" font-size="80" font-weight="600">${escape(number)}</text>`}
    <text x="${welcome ? 250 : 56}" y="${welcome ? 282 : 335}" fill="#f3eee5" font-family="Arial, sans-serif" font-size="${welcome ? 96 : 59}" font-weight="600" letter-spacing="${welcome ? -3 : 2}">${escape(title)}</text>
    <text x="${welcome ? 254 : 58}" y="${welcome ? 350 : 413}" fill="#b9b8b1" font-family="Arial, sans-serif" font-size="${welcome ? 27 : 26}" letter-spacing="3">${escape(subtitle)}</text>
    <path d="M56 460 H968" stroke="#d8ac79" stroke-opacity=".55" stroke-width="2"/>
  </svg>`);
}

const cards = [
  { number: '', title: 'ThreeStyle', subtitle: 'MUZYKA ZACZYNA SIĘ OD CIEBIE', welcome: true },
  { number: '←', title: 'POKOJE', subtitle: 'KORYTARZ · WINDA · EVENT ROOM', status: 'ODKRYWAJ PRZESTRZEŃ' },
  { number: '→', title: 'EVENT ROOM', subtitle: 'WEJŚCIE DO ARENY', status: 'THREESTYLE · WYDARZENIA' },
  { number: '↑', title: 'CREATOR ROOM', subtitle: 'POWRÓT WINDĄ DO TWOJEGO POKOJU', status: 'TWÓJ POKÓJ · TWOJE MEDIA' },
  ...LOBBY_DOORS.map(door => ({
    number: door.id.replace('room-', '').padStart(2, '0'),
    title: door.label,
    subtitle: door.status === 'active' ? 'WEJDŹ I POSŁUCHAJ' : door.status === 'locked' ? 'DOSTĘP OGRANICZONY' : 'POKÓJ NIEDOSTĘPNY',
    status: door.status === 'active' ? 'POKÓJ OTWARTY' : door.status === 'locked' ? 'ZAMKNIĘTE' : 'OFFLINE',
  })),
];

for (const [variant, tileWidth] of [['mobile', 512], ['desktop', 1024]]) {
  const tileHeight = tileWidth / 2;
  const tiles = await Promise.all(cards.map(async (content, index) => {
    let image = sharp(card(content));
    if (index === 0) {
      const logo = await sharp(path.join(root, 'public', 'textures', 'branding', 'logo3s.jpeg'))
        .resize(172, 218, { fit: 'cover' }).png().toBuffer();
      image = image.composite([{ input: logo, left: 58, top: 166 }]);
    }
    // Finish composition before resizing: sharp otherwise applies input coordinates after resize.
    const full = await image.png().toBuffer();
    return sharp(full).resize(tileWidth, tileHeight).png().toBuffer();
  }));
  const output = path.join(root, 'public', 'textures', 'runtime', 'lobby', variant);
  await fs.mkdir(output, { recursive: true });
  await sharp({ create: { width: tileWidth * 2, height: tileHeight * 5, channels: 3, background: '#171c1f' } })
    .composite(tiles.map((input, index) => ({ input, left: (index % 2) * tileWidth, top: Math.floor(index / 2) * tileHeight })))
    .webp({ quality: 88, effort: 6 }).toFile(path.join(output, 'signage.webp'));
}
