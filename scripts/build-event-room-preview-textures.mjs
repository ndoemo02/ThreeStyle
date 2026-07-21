import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const textures = path.join(root, 'public', 'textures');

const sources = {
  floorColor: path.join(textures, 'granite_tile_diff_2k.jpg'),
  floorNormal: path.join(textures, 'granite_tile_nor_gl_2k.jpg'),
  floorRoughness: path.join(textures, 'granite_tile_rough_2k.jpg'),
  wallColor: path.join(textures, 'Concrete035_2K.jpg'),
  woodColor: path.join(textures, 'oak_veneer_01_diff_2k.jpg'),
  woodNormal: path.join(textures, 'oak_veneer_01_nor_gl_2k.jpg'),
  woodRoughness: path.join(textures, 'oak_veneer_01_rough_2k.jpg'),
  seatColor: path.join(textures, 'vocal', 'felt.jpg'),
};

const variants = {
  mobile: {
    floor: 1024,
    wall: 768,
    wood: 1024,
    seat: 512,
    quality: 66,
  },
  desktop: {
    floor: 1536,
    wall: 1024,
    wood: 1024,
    seat: 768,
    quality: 72,
  },
};

async function ensureOutput(variant) {
  const output = path.join(textures, 'runtime', 'event-room', variant);
  await fs.mkdir(output, { recursive: true });
  return output;
}

function image(file, size) {
  return sharp(file).resize(size, size, { fit: 'cover', position: 'centre' }).removeAlpha();
}

function neutralNormal(size) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 128, g: 128, b: 255 },
    },
  });
}

function solidRoughness(size, value) {
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: value, g: value, b: value },
    },
  });
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0xffffffff;
  };
}

function softPlaster(size, seed = 1308) {
  const random = seededRandom(seed + size);
  const buffer = Buffer.alloc(size * size * 3);

  for (let index = 0; index < size * size; index += 1) {
    const noise = (random() - 0.5) * 18;
    const warmVein = Math.sin(index * 0.017 + seed) * 4;
    const dust = random() > 0.986 ? (random() - 0.5) * 54 : 0;
    const r = Math.max(0, Math.min(255, 142 + noise + warmVein + dust));
    const g = Math.max(0, Math.min(255, 108 + noise * 0.72 + warmVein * 0.5 + dust * 0.45));
    const b = Math.max(0, Math.min(255, 80 + noise * 0.52 + dust * 0.35));

    buffer[index * 3 + 0] = r;
    buffer[index * 3 + 1] = g;
    buffer[index * 3 + 2] = b;
  }

  return sharp(buffer, {
    raw: {
      width: size,
      height: size,
      channels: 3,
    },
  })
    .blur(1.4)
    .modulate({ brightness: 1.02, saturation: 0.58 });
}

async function writeWebp(pipeline, file, quality) {
  await pipeline
    .toColourspace('srgb')
    .webp({ quality, effort: 6, smartSubsample: true })
    .toFile(file);
}

async function writeVariant(variant, config) {
  const output = await ensureOutput(variant);

  await Promise.all([
    writeWebp(
      image(sources.floorColor, config.floor)
        .modulate({ brightness: 0.72, saturation: 0.52 })
        .gamma(1.02),
      path.join(output, 'floor-albedo.webp'),
      config.quality,
    ),
    writeWebp(
      image(sources.floorNormal, config.floor)
        .modulate({ brightness: 0.92, saturation: 0.52 }),
      path.join(output, 'floor-normal.webp'),
      config.quality,
    ),
    writeWebp(
      image(sources.floorRoughness, config.floor)
        .greyscale()
        .modulate({ brightness: 1.08 }),
      path.join(output, 'floor-roughness.webp'),
      74,
    ),
    writeWebp(
      softPlaster(config.wall),
      path.join(output, 'wall-albedo.webp'),
      config.quality,
    ),
    writeWebp(
      neutralNormal(config.wall),
      path.join(output, 'wall-normal.webp'),
      58,
    ),
    writeWebp(
      solidRoughness(config.wall, 230),
      path.join(output, 'wall-roughness.webp'),
      62,
    ),
    writeWebp(
      image(sources.woodColor, config.wood)
        .modulate({ brightness: 0.94, saturation: 0.88 }),
      path.join(output, 'wood-albedo.webp'),
      config.quality,
    ),
    writeWebp(
      image(sources.woodNormal, config.wood)
        .modulate({ brightness: 0.94, saturation: 0.58 }),
      path.join(output, 'wood-normal.webp'),
      config.quality,
    ),
    writeWebp(
      image(sources.woodRoughness, config.wood)
        .greyscale()
        .modulate({ brightness: 1.04 }),
      path.join(output, 'wood-roughness.webp'),
      72,
    ),
    writeWebp(
      image(sources.seatColor, config.seat)
        .greyscale()
        .tint('#5a3934')
        .modulate({ brightness: 0.96, saturation: 0.62 }),
      path.join(output, 'seat-albedo.webp'),
      config.quality,
    ),
  ]);
}

await Promise.all(Object.entries(variants).map(([variant, config]) => writeVariant(variant, config)));
