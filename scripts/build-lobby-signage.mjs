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
    <text x="56" y="116" fill="#d7b898" font-family="Arial, sans-serif" font-size="34" letter-spacing="3">${welcome ? 'TWÓJ RYTM · TWOJA PRZESTRZEŃ' : escape(status || 'THREESTYLE')}</text>
    ${welcome ? '' : `<text x="58" y="230" fill="#e6ba88" font-family="Arial, sans-serif" font-size="100" font-weight="600">${escape(number)}</text>`}
    <text x="${welcome ? 250 : 56}" y="${welcome ? 282 : 335}" fill="#f3eee5" font-family="Arial, sans-serif" font-size="${welcome ? 112 : 76}" font-weight="600" letter-spacing="${welcome ? -3 : 2}">${escape(title)}</text>
    <text x="${welcome ? 254 : 58}" y="${welcome ? 350 : 413}" fill="#e0dbd2" font-family="Arial, sans-serif" font-size="${welcome ? 34 : 32}" letter-spacing="3">${escape(subtitle)}</text>
    <path d="M56 460 H968" stroke="#d8ac79" stroke-opacity=".55" stroke-width="2"/>
  </svg>`);
}

const cards = [
  { number: '', title: 'ThreeStyle', subtitle: 'MUZYKA ZACZYNA SIĘ OD CIEBIE', welcome: true },
  { number: '←', title: 'POKOJE', subtitle: 'WINDA · EVENT ROOM', status: 'ODKRYWAJ PRZESTRZEŃ' },
  { number: '→', title: 'EVENT ROOM', subtitle: 'WEJŚCIE DO ARENY', status: 'THREESTYLE · WYDARZENIA' },
  { number: '↑', title: 'CREATOR ROOM', subtitle: 'TWÓJ POKÓJ · TWOJE MEDIA', status: 'TWÓJ POKÓJ · TWOJE MEDIA' },
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
    .webp({ quality: 94, effort: 6 }).toFile(path.join(output, 'signage.webp'));
  const welcomeWidth = variant === 'mobile' ? 1024 : 2048;
  const scale = welcomeWidth / 1024;
  const welcomeLogo = await sharp(path.join(root, 'public', 'textures', 'branding', 'logo3s.jpeg')).resize(172 * scale, 218 * scale, { fit: 'cover' }).png().toBuffer();
  const welcomePng = await sharp(card(cards[0]), { density: 72 * scale }).composite([{ input: welcomeLogo, left: 58 * scale, top: 166 * scale }]).png().toBuffer();
  await sharp(welcomePng).resize(welcomeWidth, welcomeWidth / 2).webp({ quality: 96, effort: 6 }).toFile(path.join(output, 'welcome.webp'));
}
