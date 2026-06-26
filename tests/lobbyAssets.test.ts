import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(import.meta.dirname, '..');
const variants = [
  { name: 'mobile', size: 1024 },
  { name: 'desktop', size: 2048 },
] as const;
const maps = ['albedo.webp', 'normal.webp', 'orm.webp'] as const;

test('ships bounded mobile and desktop lobby atlases', async () => {
  let totalBytes = 0;

  for (const variant of variants) {
    for (const map of maps) {
      const file = path.join(ROOT, 'public', 'textures', 'runtime', 'lobby', variant.name, map);
      const [metadata, fileStat] = await Promise.all([sharp(file).metadata(), stat(file)]);

      assert.equal(metadata.width, variant.size, `${variant.name}/${map} width`);
      assert.equal(metadata.height, variant.size, `${variant.name}/${map} height`);
      assert.ok(fileStat.size < 1_000_000, `${variant.name}/${map} must remain below 1 MB`);
      totalBytes += fileStat.size;
    }
  }

  assert.ok(totalBytes <= 3_800_000, `all lobby atlases use ${totalBytes} bytes`);
});
