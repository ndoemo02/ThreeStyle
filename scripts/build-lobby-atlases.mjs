import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textures = path.join(root, 'public', 'textures');

const sources = {
  stoneColor: path.join(textures, 'granite_tile_diff_2k.jpg'),
  stoneNormal: path.join(textures, 'granite_tile_nor_gl_2k.jpg'),
  stoneRoughness: path.join(textures, 'granite_tile_rough_2k.jpg'),
  woodColor: path.join(textures, 'oak_veneer_01_diff_2k.jpg'),
  woodNormal: path.join(textures, 'oak_veneer_01_nor_gl_2k.jpg'),
  woodRoughness: path.join(textures, 'oak_veneer_01_rough_2k.jpg'),
};

async function resized(file, size, options = {}) {
  const { tint, ...modulate } = options;
  const image = sharp(file)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .modulate(modulate);
  if (tint) image.tint(tint);
  return image
    .removeAlpha()
    .toColourspace('srgb')
    .toBuffer();
}

function solid(size, color) {
  return sharp({ create: { width: size, height: size, channels: 3, background: color } })
    .png()
    .toBuffer();
}

function quietPlaster(size) {
  const pixels = Buffer.alloc(size * size * 3);
  for (let index = 0; index < size * size; index++) {
    const grain = ((index * 16807) % 7) - 3;
    pixels[index * 3] = 218 + grain;
    pixels[index * 3 + 1] = 215 + grain;
    pixels[index * 3 + 2] = 207 + grain;
  }
  return sharp(pixels, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer();
}

async function ormTile(roughness, size, metalness = 0) {
  const roughnessChannel = roughness
    ? await sharp(roughness).resize(size, size, { fit: 'cover' }).greyscale().raw().toBuffer()
    : Buffer.alloc(size * size, 220);
  const aoChannel = Buffer.alloc(size * size, 255);
  const metalnessChannel = Buffer.alloc(size * size, metalness);

  return sharp(aoChannel, { raw: { width: size, height: size, channels: 1 } })
    .joinChannel(roughnessChannel, { raw: { width: size, height: size, channels: 1 } })
    .joinChannel(metalnessChannel, { raw: { width: size, height: size, channels: 1 } })
    .png()
    .toBuffer();
}

async function writeAtlas(size, variant) {
  const tile = size / 2;
  const output = path.join(textures, 'runtime', 'lobby', variant);
  await fs.mkdir(output, { recursive: true });

  const neutralNormal = await solid(tile, { r: 128, g: 128, b: 255 });
  const albedoTiles = await Promise.all([
    resized(sources.stoneColor, tile, { brightness: 1.05, saturation: 0.18 }),
    resized(sources.woodColor, tile, { brightness: 0.92, saturation: 0.62 }),
    quietPlaster(tile),
    solid(tile, { r: 43, g: 47, b: 49 }),
  ]);
  const normalTiles = await Promise.all([
    resized(sources.stoneNormal, tile),
    resized(sources.woodNormal, tile),
    neutralNormal,
    neutralNormal,
  ]);
  const ormTiles = await Promise.all([
    ormTile(sources.stoneRoughness, tile, 0),
    ormTile(sources.woodRoughness, tile, 0),
    ormTile(null, tile, 0),
    ormTile(null, tile, 0),
  ]);

  const positions = [
    { left: 0, top: 0 },
    { left: tile, top: 0 },
    { left: 0, top: tile },
    { left: tile, top: tile },
  ];

  const compose = async (tiles, file, quality) => {
    await sharp({ create: { width: size, height: size, channels: 3, background: '#000000' } })
      .composite(tiles.map((input, index) => ({ input, ...positions[index] })))
      .webp({ quality, effort: 6, smartSubsample: true })
      .toFile(path.join(output, file));
  };

  await Promise.all([
    compose(albedoTiles, 'albedo.webp', variant === 'mobile' ? 72 : 76),
    compose(normalTiles, 'normal.webp', variant === 'mobile' ? 72 : 78),
    compose(ormTiles, 'orm.webp', 80),
  ]);
}

await Promise.all([writeAtlas(1024, 'mobile'), writeAtlas(2048, 'desktop')]);
await import('./build-lobby-signage.mjs');
