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
  plasterColor: path.join(textures, 'drewno', 'plastered_stone_wall_4k.blend', 'textures', 'plastered_stone_wall_diff_4k.jpg'),
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
    resized(sources.stoneColor, tile, { brightness: 0.72, saturation: 0.65 }),
    resized(sources.woodColor, tile, { brightness: 0.78, saturation: 0.82 }),
    resized(sources.plasterColor, tile, { brightness: 2.05, saturation: 0.24, tint: '#c7ae94' }),
    solid(tile, { r: 20, g: 18, b: 17 }),
  ]);
  const normalTiles = await Promise.all([
    resized(sources.stoneNormal, tile),
    resized(sources.woodNormal, tile),
    neutralNormal,
    neutralNormal,
  ]);
  const ormTiles = await Promise.all([
    ormTile(sources.stoneRoughness, tile, 12),
    ormTile(sources.woodRoughness, tile, 4),
    ormTile(null, tile, 0),
    ormTile(null, tile, 24),
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
